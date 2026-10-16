import express from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, createCategorySchema, updateCategorySchema } from '../schemas/index.js';

const router = express.Router();

// Get all categories for a user
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
        where: { userId: req.user.id },
        orderBy: { name: 'asc' },
    });
    res.json(categories);
}));

// Create a new category
router.post('/', authenticate, validate({ body: createCategorySchema }), asyncHandler(async (req, res) => {
    const { name, type } = req.body;
    const category = await prisma.category.create({
        data: { name, type, userId: req.user.id },
    });
    res.status(201).json(category);
}));

// Update a category
router.put('/:id', authenticate, validate({ params: idParam, body: updateCategorySchema }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, type } = req.body;
    const result = await prisma.category.updateMany({
        where: { id, userId: req.user.id },
        data: { ...(name !== undefined ? { name } : {}), ...(type !== undefined ? { type } : {}) },
    });
    if (result.count === 0) {
        throw new ApiError(404, 'Category not found or unauthorized');
    }
    res.json({ message: 'Category updated successfully' });
}));

// Delete a category
router.delete('/:id', authenticate, validate({ params: idParam }), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await prisma.category.deleteMany({ where: { id, userId: req.user.id } });
    if (result.count === 0) {
        throw new ApiError(404, 'Category not found or unauthorized');
    }
    res.json({ message: 'Category deleted successfully' });
}));

export default router;
