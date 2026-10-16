import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { simulateSchema } from '../schemas/index.js';

const router = express.Router();

/**
 * POST /api/scenario/simulate
 * Projects future balance based on the user's recent cash-flow plus simulated
 * changes to income, expenses, and a one-time cost.
 */
router.post('/simulate', authenticate, validate({ body: simulateSchema }), asyncHandler(async (req, res) => {
    const { monthlyIncomeDelta, monthlyExpenseDelta, oneTimeCost, months } = req.body;

    // ---- 1. Derive baseline from last 3 months of real data ----
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentTxns = await prisma.transaction.findMany({
        where: { userId: req.user.id, date: { gte: threeMonthsAgo } },
    });

    const totalIncome = recentTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalExpense = recentTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    const baseMonthlyIncome = totalIncome / 3;
    const baseMonthlyExpense = totalExpense / 3;

    // Current balance = all-time income minus all-time expenses
    const allTxns = await prisma.transaction.findMany({ where: { userId: req.user.id } });
    const currentBalance = allTxns.reduce((s, t) => s + t.amount, 0);

    // ---- 2. Run the simulation month-by-month ----
    const projectedMonthlyIncome = baseMonthlyIncome + monthlyIncomeDelta;
    const projectedMonthlyExpense = baseMonthlyExpense + monthlyExpenseDelta;
    const projectedMonthlySavings = projectedMonthlyIncome - projectedMonthlyExpense;

    const projection = [];
    let runningBalance = currentBalance - oneTimeCost; // one-time cost hits immediately

    const now = new Date();
    for (let i = 1; i <= months; i++) {
        runningBalance += projectedMonthlySavings;
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        projection.push({ month: label, balance: parseFloat(runningBalance.toFixed(2)) });
    }

    // Baseline projection (no changes) for comparison
    const baseMonthlySavings = baseMonthlyIncome - baseMonthlyExpense;
    const baseline = [];
    let baseRunningBalance = currentBalance;
    for (let i = 1; i <= months; i++) {
        baseRunningBalance += baseMonthlySavings;
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        baseline.push({ month: label, balance: parseFloat(baseRunningBalance.toFixed(2)) });
    }

    res.json({
        currentBalance: parseFloat(currentBalance.toFixed(2)),
        baseMonthlyIncome: parseFloat(baseMonthlyIncome.toFixed(2)),
        baseMonthlyExpense: parseFloat(baseMonthlyExpense.toFixed(2)),
        projectedMonthlyIncome: parseFloat(projectedMonthlyIncome.toFixed(2)),
        projectedMonthlyExpense: parseFloat(projectedMonthlyExpense.toFixed(2)),
        projectedMonthlySavings: parseFloat(projectedMonthlySavings.toFixed(2)),
        finalProjectedBalance: projection[projection.length - 1]?.balance ?? currentBalance,
        projection,
        baseline,
    });
}));

export default router;
