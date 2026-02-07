import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import stream from 'stream';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Get all transactions
router.get('/', authenticate, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user.id },
            include: { category: true },
            orderBy: { date: 'desc' },
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Create a single transaction
router.post('/', authenticate, async (req, res) => {
    try {
        const { amount, date, description, categoryId } = req.body;

        if (!amount || !date) {
            return res.status(400).json({ error: 'Amount and date are required' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                amount: parseFloat(amount),
                date: new Date(date),
                description,
                categoryId,
                userId: req.user.id,
            },
        });

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

// Update a transaction
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date, description, categoryId } = req.body;

        const transaction = await prisma.transaction.updateMany({
            where: { id, userId: req.user.id },
            data: {
                amount: amount ? parseFloat(amount) : undefined,
                date: date ? new Date(date) : undefined,
                description,
                categoryId,
            },
        });

        if (transaction.count === 0) {
            return res.status(404).json({ error: 'Transaction not found or unauthorized' });
        }

        res.json({ message: 'Transaction updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});

// Delete a transaction
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.deleteMany({
            where: { id, userId: req.user.id },
        });

        if (transaction.count === 0) {
            return res.status(404).json({ error: 'Transaction not found or unauthorized' });
        }

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

// Bulk upload transactions via CSV
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
        .pipe(csvParser())
        .on('data', (data) => {
            // Assuming headers: Date, Description, Amount, Category (optional)
            const amount = parseFloat(data.Amount) || 0;
            const date = new Date(data.Date);

            if (!isNaN(date.getTime()) && !isNaN(amount)) {
                results.push({
                    amount,
                    date,
                    description: data.Description || '',
                    userId: req.user.id,
                });
            }
        })
        .on('end', async () => {
            try {
                if (results.length > 0) {
                    await prisma.transaction.createMany({
                        data: results,
                        skipDuplicates: true,
                    });
                }
                res.json({ message: `Successfully imported ${results.length} transactions` });
            } catch (error) {
                console.error('CSV import error:', error);
                res.status(500).json({ error: 'Failed to save imported transactions' });
            }
        });
});

export default router;
