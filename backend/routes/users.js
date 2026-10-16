import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../schemas/index.js';
import { BCRYPT_ROUNDS } from '../lib/config.js';

const router = express.Router();

// GET current user profile
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) throw new ApiError(404, 'User not found');
    res.json(user);
}));

// PUT update user profile (name and optionally password)
router.put('/me', authenticate, validate({ body: updateProfileSchema }), asyncHandler(async (req, res) => {
    const { name, currentPassword, newPassword } = req.body;

    const updateData = {};
    if (name) updateData.name = name;

    if (newPassword) {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            throw new ApiError(401, 'Current password is incorrect');
        }
        updateData.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    }

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, 'No changes provided');
    }

    const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: { id: true, name: true, email: true },
    });
    res.json({ message: 'Profile updated successfully', user: updated });
}));

export default router;
