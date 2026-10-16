import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/index.js';
import { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS } from '../lib/config.js';

const router = express.Router();

function signToken(user) {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

router.post('/register', validate({ body: registerSchema }), asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
        data: { email, password: hashedPassword, name },
    });

    const token = signToken(user);
    res.status(201).json({
        message: 'User registered successfully',
        token,
        user: { id: user.id, email: user.email, name: user.name },
    });
}));

router.post('/login', validate({ body: loginSchema }), asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always run a comparison even when the user is missing to reduce timing
    // side-channels that reveal whether an email is registered.
    const hash = user?.password || '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const validPassword = await bcrypt.compare(password, hash);

    if (!user || !validPassword) {
        throw new ApiError(401, 'Invalid email or password');
    }

    const token = signToken(user);
    res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, email: user.email, name: user.name },
    });
}));

export default router;
