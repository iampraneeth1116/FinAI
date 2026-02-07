import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all categories for a user
router.get('/', authenticate, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { userId: req.user.id },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create a new category
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, type } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        const category = await prisma.category.create({
            data: {
                name,
                type, // e.g. "INCOME" or "EXPENSE"
                userId: req.user.id,
            },
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Update a category
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type } = req.body;

        const category = await prisma.category.updateMany({
            where: { id, userId: req.user.id },
            data: { name, type },
        });

        if (category.count === 0) {
            return res.status(404).json({ error: 'Category not found or unauthorized' });
        }

        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete a category
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const category = await prisma.category.deleteMany({
            where: { id, userId: req.user.id },
        });

        if (category.count === 0) {
            return res.status(404).json({ error: 'Category not found or unauthorized' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
