import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { detectRecurring, estimateMonthlyRecurringCost } from '../lib/finance.js';

const router = express.Router();

// GET /api/recurring — detected subscriptions / recurring charges
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        orderBy: { date: 'desc' },
    });

    const recurring = detectRecurring(transactions);
    res.json({
        recurring,
        count: recurring.length,
        estimatedMonthlyCost: estimateMonthlyRecurringCost(recurring),
    });
}));

export default router;
