import express from 'express';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { buildMonthlyReport, reportToCsv } from '../lib/report.js';

const router = express.Router();

const now = new Date();
const reportQuery = z.object({
    month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
    year: z.coerce.number().int().min(2000).max(2100).default(now.getFullYear()),
});

async function loadReport(userId, month, year) {
    const transactions = await prisma.transaction.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { date: 'desc' },
    });
    return buildMonthlyReport(transactions, month, year);
}

// GET /api/reports/monthly?month=&year= — JSON report (used to preview on the dashboard)
router.get('/monthly', authenticate, validate({ query: reportQuery }), asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    res.json(await loadReport(req.user.id, month, year));
}));

// GET /api/reports/monthly.csv?month=&year= — CSV download
router.get('/monthly.csv', authenticate, validate({ query: reportQuery }), asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const report = await loadReport(req.user.id, month, year);
    const csv = reportToCsv(report);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="finai-report-${year}-${String(month).padStart(2, '0')}.csv"`);
    res.send(csv);
}));

// GET /api/reports/monthly.pdf?month=&year= — formatted PDF download
router.get('/monthly.pdf', authenticate, validate({ query: reportQuery }), asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const report = await loadReport(req.user.id, month, year);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="finai-report-${year}-${String(month).padStart(2, '0')}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    const EMERALD = '#10b981';
    const GRAY = '#6b7280';
    const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // ---- Header ----
    doc.fillColor(EMERALD).fontSize(26).font('Helvetica-Bold').text('FinAI', { continued: true });
    doc.fillColor('#111827').fontSize(14).font('Helvetica').text('  Monthly Financial Report');
    doc.moveDown(0.3);
    doc.fillColor(GRAY).fontSize(11).text(report.period);
    doc.fillColor(GRAY).fontSize(9).text(`Generated ${new Date().toLocaleDateString()}`);
    doc.moveTo(50, doc.y + 6).lineTo(545, doc.y + 6).strokeColor('#e5e7eb').stroke();
    doc.moveDown(1.2);

    // ---- Summary ----
    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.5);
    const s = report.summary;
    const summaryRows = [
        ['Total Income', money(s.income)],
        ['Total Expenses', money(s.expenses)],
        ['Net Savings', money(s.net)],
        ['Savings Rate', `${s.savingsRate}%`],
        ['Transactions', String(s.transactionCount)],
    ];
    doc.fontSize(11).font('Helvetica');
    summaryRows.forEach(([label, value]) => {
        const y = doc.y;
        doc.fillColor(GRAY).text(label, 60, y);
        doc.fillColor('#111827').font('Helvetica-Bold').text(value, 300, y, { align: 'left' });
        doc.font('Helvetica');
        doc.moveDown(0.4);
    });
    doc.moveDown(1);

    // ---- Spending by Category ----
    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Spending by Category');
    doc.moveDown(0.5);
    if (report.byCategory.length === 0) {
        doc.fillColor(GRAY).fontSize(11).font('Helvetica').text('No expenses recorded this month.');
    } else {
        const maxVal = report.byCategory[0].value || 1;
        doc.fontSize(10).font('Helvetica');
        report.byCategory.forEach((c) => {
            const y = doc.y;
            doc.fillColor('#374151').text(c.name, 60, y, { width: 150 });
            // simple horizontal bar
            const barWidth = (c.value / maxVal) * 220;
            doc.rect(220, y + 1, barWidth, 9).fill(EMERALD);
            doc.fillColor('#111827').text(money(c.value), 460, y, { width: 85, align: 'right' });
            doc.moveDown(0.6);
        });
    }
    doc.moveDown(1);

    // ---- Transactions table ----
    doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Transactions');
    doc.moveDown(0.5);

    const drawTableHeader = () => {
        const y = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(GRAY);
        doc.text('Date', 60, y);
        doc.text('Description', 130, y);
        doc.text('Category', 330, y);
        doc.text('Amount', 460, y, { width: 85, align: 'right' });
        doc.moveTo(50, y + 12).lineTo(545, y + 12).strokeColor('#e5e7eb').stroke();
        doc.moveDown(1);
    };

    if (report.transactions.length === 0) {
        doc.fillColor(GRAY).fontSize(11).font('Helvetica').text('No transactions this month.');
    } else {
        drawTableHeader();
        doc.fontSize(9).font('Helvetica');
        report.transactions.forEach((t) => {
            if (doc.y > 760) { doc.addPage(); drawTableHeader(); doc.fontSize(9).font('Helvetica'); }
            const y = doc.y;
            doc.fillColor('#374151').text(new Date(t.date).toLocaleDateString(), 60, y, { width: 65 });
            doc.text((t.description || '—').slice(0, 38), 130, y, { width: 195 });
            doc.text(t.category?.name || 'Uncategorized', 330, y, { width: 125 });
            doc.fillColor(t.amount < 0 ? '#ef4444' : EMERALD)
                .text(`${t.amount < 0 ? '-' : '+'}${money(Math.abs(t.amount))}`, 460, y, { width: 85, align: 'right' });
            doc.moveDown(0.55);
        });
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
        .text('Generated by FinAI — AI-Powered Personal Finance Intelligence', 50, doc.y, { align: 'center' });

    doc.end();
}));

export default router;
