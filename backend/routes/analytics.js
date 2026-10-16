import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/summary — total balance, income, expenses
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({ where: { userId: req.user.id } });
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    res.json({ income, expenses, balance: income - expenses });
}));

// GET /api/analytics/monthly — monthly income vs expenses for the last 6 months
router.get('/monthly', authenticate, asyncHandler(async (req, res) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id, date: { gte: sixMonthsAgo } },
    });

    const monthlyMap = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, income: 0, expenses: 0 };
        if (t.amount > 0) monthlyMap[key].income += t.amount;
        else monthlyMap[key].expenses += Math.abs(t.amount);
    });

    const result = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    res.json(result);
}));

// GET /api/analytics/by-category — spending per category
router.get('/by-category', authenticate, asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id, amount: { lt: 0 } },
        include: { category: true },
    });

    const categoryMap = {};
    transactions.forEach(t => {
        const name = t.category?.name || 'Uncategorized';
        categoryMap[name] = (categoryMap[name] || 0) + Math.abs(t.amount);
    });

    const result = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    res.json(result);
}));

// GET /api/analytics/recent — last 5 transactions
router.get('/recent', authenticate, asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 5,
    });
    res.json(transactions);
}));

export default router;
