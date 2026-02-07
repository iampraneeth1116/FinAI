import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET all budgets for user
router.get('/', authenticate, async (req, res) => {
    try {
        const budgets = await prisma.budget.findMany({
            where: { userId: req.user.id },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });

        // For each budget, calculate actual spending for that month
        const enriched = await Promise.all(budgets.map(async (b) => {
            const start = new Date(b.year, b.month - 1, 1);
            const end = new Date(b.year, b.month, 0, 23, 59, 59);

            const result = await prisma.transaction.aggregate({
                where: {
                    userId: req.user.id,
                    amount: { lt: 0 },
                    date: { gte: start, lte: end },
                },
                _sum: { amount: true },
            });

            const spent = Math.abs(result._sum.amount || 0);
            return { ...b, spent };
        }));

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
});

// POST create a budget
router.post('/', authenticate, async (req, res) => {
    try {
        const { amount, month, year } = req.body;

        if (!amount || !month || !year) {
            return res.status(400).json({ error: 'Amount, month, and year are required' });
        }

        const existing = await prisma.budget.findFirst({
            where: { userId: req.user.id, month: parseInt(month), year: parseInt(year) },
        });

        if (existing) {
            return res.status(400).json({ error: 'A budget already exists for this month' });
        }

        const budget = await prisma.budget.create({
            data: {
                amount: parseFloat(amount),
                month: parseInt(month),
                year: parseInt(year),
                userId: req.user.id,
            },
        });

        res.status(201).json(budget);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create budget' });
    }
});

// PUT update a budget
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        const result = await prisma.budget.updateMany({
            where: { id, userId: req.user.id },
            data: { amount: parseFloat(amount) },
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Budget not found or unauthorized' });
        }

        res.json({ message: 'Budget updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update budget' });
    }
});

// DELETE a budget
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await prisma.budget.deleteMany({
            where: { id, userId: req.user.id },
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Budget not found or unauthorized' });
        }

        res.json({ message: 'Budget deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete budget' });
    }
});

export default router;
