import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, createBudgetSchema, updateBudgetSchema } from '../schemas/index.js';

const router = express.Router();

// GET all budgets for user, enriched with actual spending for each month
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const budgets = await prisma.budget.findMany({
        where: { userId: req.user.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

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
}));

// POST create a budget
router.post('/', authenticate, validate({ body: createBudgetSchema }), asyncHandler(async (req, res) => {
    const { amount, month, year } = req.body;

    const existing = await prisma.budget.findFirst({
        where: { userId: req.user.id, month, year },
    });
    if (existing) {
        throw new ApiError(409, 'A budget already exists for this month');
    }

    const budget = await prisma.budget.create({
        data: { amount, month, year, userId: req.user.id },
    });
    res.status(201).json(budget);
}));

// PUT update a budget
router.put('/:id', authenticate, validate({ params: idParam, body: updateBudgetSchema }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    const result = await prisma.budget.updateMany({
        where: { id, userId: req.user.id },
        data: { amount },
    });
    if (result.count === 0) {
        throw new ApiError(404, 'Budget not found or unauthorized');
    }
    res.json({ message: 'Budget updated' });
}));

// DELETE a budget
router.delete('/:id', authenticate, validate({ params: idParam }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await prisma.budget.deleteMany({ where: { id, userId: req.user.id } });
    if (result.count === 0) {
        throw new ApiError(404, 'Budget not found or unauthorized');
    }
    res.json({ message: 'Budget deleted' });
}));

export default router;
