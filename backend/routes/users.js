import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET current user profile
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, createdAt: true },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT update user profile (name and optionally password)
router.put('/me', authenticate, async (req, res) => {
    try {
        const { name, currentPassword, newPassword } = req.body;

        const updateData = {};
        if (name) updateData.name = name;

        // Handle password change
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to set a new password' });
            }

            const user = await prisma.user.findUnique({ where: { id: req.user.id } });
            const valid = await bcrypt.compare(currentPassword, user.password);

            if (!valid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: { id: true, name: true, email: true },
        });

        res.json({ message: 'Profile updated successfully', user: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
