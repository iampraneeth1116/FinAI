import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/analytics/summary — total balance, income, expenses
router.get('/summary', authenticate, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user.id },
        });

        const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const balance = income - expenses;

        res.json({ income, expenses, balance });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// GET /api/analytics/monthly — monthly income vs expenses for the last 6 months
router.get('/monthly', authenticate, async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: req.user.id,
                date: { gte: sixMonthsAgo },
            },
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
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch monthly data' });
    }
});

// GET /api/analytics/by-category — spending per category
router.get('/by-category', authenticate, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user.id, amount: { lt: 0 } },
            include: { category: true },
        });

        const categoryMap = {};
        transactions.forEach(t => {
            const name = t.category?.name || 'Uncategorized';
            if (!categoryMap[name]) categoryMap[name] = 0;
            categoryMap[name] += Math.abs(t.amount);
        });

        const result = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category breakdown' });
    }
});

// GET /api/analytics/recent — last 5 transactions
router.get('/recent', authenticate, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user.id },
            include: { category: true },
            orderBy: { date: 'desc' },
            take: 5,
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
});

export default router;
