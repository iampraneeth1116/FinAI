import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import transactionRoutes from './routes/transactions.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import budgetRoutes from './routes/budgets.js';
import userRoutes from './routes/users.js';
import scenarioRoutes from './routes/scenario.js';

const app = express();
const port = process.env.PORT || 4000;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scenario', scenarioRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Finance AI Backend is running!' });
});

// Start server locally (Vercel uses the exported app instead)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
