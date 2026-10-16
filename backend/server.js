// Must be first: populates process.env before any env-reading module loads.
import './lib/loadEnv.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { PORT, CORS_ORIGIN } from './lib/config.js';
import { authLimiter, aiLimiter, globalLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import transactionRoutes from './routes/transactions.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import budgetRoutes from './routes/budgets.js';
import userRoutes from './routes/users.js';
import scenarioRoutes from './routes/scenario.js';
import recurringRoutes from './routes/recurring.js';
import alertRoutes from './routes/alerts.js';

const app = express();

// Trust the platform proxy (Vercel/Render) so rate-limit keys use the real IP.
app.set('trust proxy', 1);

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(o => o.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Finance AI Backend is running!' });
});

// Routes (rate limiters applied to sensitive/expensive endpoints)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scenario', scenarioRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/alerts', alertRoutes);

// 404 + centralized error handling (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server locally (Vercel uses the exported app instead)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
