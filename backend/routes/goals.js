import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, createGoalSchema, updateGoalSchema, contributeGoalSchema } from '../schemas/index.js';
import { projectGoal, estimateMonthlySavingRate } from '../lib/finance.js';

const router = express.Router();

// Attach projection metadata to each goal based on the user's saving rate.
async function withProjections(userId, goals) {
    const transactions = await prisma.transaction.findMany({ where: { userId } });
    const monthlySavingRate = estimateMonthlySavingRate(transactions);
    return {
        monthlySavingRate,
        goals: goals.map(g => ({ ...g, projection: projectGoal(g, monthlySavingRate) })),
    };
}

// GET /api/goals — all goals with progress + projected completion
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const goals = await prisma.goal.findMany({
        where: { userId: req.user.id },
        orderBy: { deadline: 'asc' },
    });
    res.json(await withProjections(req.user.id, goals));
}));

// POST /api/goals — create a savings goal
router.post('/', authenticate, validate({ body: createGoalSchema }), asyncHandler(async (req, res) => {
    const { name, targetAmount, currentAmount, deadline } = req.body;
    const goal = await prisma.goal.create({
        data: { name, targetAmount, currentAmount: currentAmount ?? 0, deadline, userId: req.user.id },
    });
    res.status(201).json(goal);
}));

// PUT /api/goals/:id — update goal fields
router.put('/:id', authenticate, validate({ params: idParam, body: updateGoalSchema }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await prisma.goal.updateMany({
        where: { id, userId: req.user.id },
        data: req.body,
    });
    if (result.count === 0) throw new ApiError(404, 'Goal not found or unauthorized');
    const goal = await prisma.goal.findUnique({ where: { id } });
    res.json(goal);
}));

// POST /api/goals/:id/contribute — add a contribution toward a goal
router.post('/:id/contribute', authenticate, validate({ params: idParam, body: contributeGoalSchema }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    const goal = await prisma.goal.findFirst({ where: { id, userId: req.user.id } });
    if (!goal) throw new ApiError(404, 'Goal not found or unauthorized');

    const updated = await prisma.goal.update({
        where: { id },
        data: { currentAmount: goal.currentAmount + amount },
    });
    res.json(updated);
}));

// DELETE /api/goals/:id
router.delete('/:id', authenticate, validate({ params: idParam }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await prisma.goal.deleteMany({ where: { id, userId: req.user.id } });
    if (result.count === 0) throw new ApiError(404, 'Goal not found or unauthorized');
    res.json({ message: 'Goal deleted' });
}));

export default router;
