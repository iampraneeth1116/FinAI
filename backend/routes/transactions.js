import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import stream from 'stream';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, createTransactionSchema, updateTransactionSchema } from '../schemas/index.js';

const router = express.Router();
// Limit uploads to 2MB to avoid memory exhaustion from oversized files.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
});

// Get all transactions
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        include: { category: true },
        orderBy: { date: 'desc' },
    });
    res.json(transactions);
}));

// Create a single transaction
router.post('/', authenticate, validate({ body: createTransactionSchema }), asyncHandler(async (req, res) => {
    const { amount, date, description, categoryId } = req.body;

    // Ensure a referenced category actually belongs to the user.
    if (categoryId) {
        const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: req.user.id } });
        if (!cat) throw new ApiError(400, 'Invalid category');
    }

    const transaction = await prisma.transaction.create({
        data: {
            amount,
            date,
            description: description || null,
            categoryId: categoryId || null,
            userId: req.user.id,
        },
    });

    res.status(201).json(transaction);
}));

// Update a transaction
router.put('/:id', authenticate, validate({ params: idParam, body: updateTransactionSchema }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, date, description, categoryId } = req.body;

    if (categoryId) {
        const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: req.user.id } });
        if (!cat) throw new ApiError(400, 'Invalid category');
    }

    const result = await prisma.transaction.updateMany({
        where: { id, userId: req.user.id },
        data: {
            ...(amount !== undefined ? { amount } : {}),
            ...(date !== undefined ? { date } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(categoryId !== undefined ? { categoryId } : {}),
        },
    });

    if (result.count === 0) {
        throw new ApiError(404, 'Transaction not found or unauthorized');
    }

    const updated = await prisma.transaction.findUnique({ where: { id }, include: { category: true } });
    res.json(updated);
}));

// Delete a transaction
router.delete('/:id', authenticate, validate({ params: idParam }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await prisma.transaction.deleteMany({ where: { id, userId: req.user.id } });

    if (result.count === 0) {
        throw new ApiError(404, 'Transaction not found or unauthorized');
    }
    res.json({ message: 'Transaction deleted successfully' });
}));

// Bulk upload transactions via CSV
router.post('/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'No CSV file uploaded');
    }

    const results = [];
    const errors = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    await new Promise((resolve, reject) => {
        bufferStream
            .pipe(csvParser())
            .on('data', (data) => {
                // Header names are matched case-insensitively for resilience.
                const lower = {};
                Object.keys(data).forEach((k) => { lower[k.trim().toLowerCase()] = data[k]; });

                const amount = parseFloat(lower.amount);
                const date = new Date(lower.date);

                if (!isNaN(date.getTime()) && !isNaN(amount) && amount !== 0) {
                    results.push({
                        amount,
                        date,
                        description: (lower.description || '').slice(0, 200),
                        userId: req.user.id,
                    });
                } else {
                    errors.push(lower);
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (results.length > 0) {
        await prisma.transaction.createMany({ data: results, skipDuplicates: true });
    }

    res.json({
        message: `Successfully imported ${results.length} transaction(s)`,
        imported: results.length,
        skipped: errors.length,
    });
}));

export default router;
