import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { detectAnomalies, detectBudgetAlerts } from '../lib/finance.js';

const router = express.Router();

// GET /api/alerts — budget alerts for the current month, plus anomaly / fraud
// alerts derived from transaction history
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        orderBy: { date: 'desc' },
    });

    const now = new Date();
    const budgets = await prisma.budget.findMany({
        where: { userId: req.user.id, month: now.getMonth() + 1, year: now.getFullYear() },
    });

    // Budget alerts go first so the dashboard never hides them behind "Show more".
    const alerts = [...detectBudgetAlerts(budgets, transactions, now), ...detectAnomalies(transactions)];
    res.json({
        alerts,
        count: alerts.length,
        bySeverity: {
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length,
        },
    });
}));

export default router;
