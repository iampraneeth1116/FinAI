import { ApiError } from '../lib/ApiError.js';

// Catch-all for requests that match no route.
export const notFound = (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Centralized error handler. Produces a consistent JSON error shape and avoids
 * leaking stack traces or internal messages to clients in production.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    // Known, intentional errors carry their own status code.
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }

    // Prisma "record not found" on update/delete.
    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Resource not found' });
    }
    // Prisma unique-constraint violation.
    if (err.code === 'P2002') {
        return res.status(409).json({ error: 'A record with these details already exists' });
    }

    console.error('Unhandled error:', err);
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (err.message || 'Internal server error');
    res.status(500).json({ error: message });
};
