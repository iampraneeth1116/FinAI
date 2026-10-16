import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { detectAnomalies } from '../lib/finance.js';

const router = express.Router();

// GET /api/alerts — anomaly / fraud alerts derived from transaction history
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        orderBy: { date: 'desc' },
    });

    const alerts = detectAnomalies(transactions);
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
