import rateLimit from 'express-rate-limit';

// Strict limiter for authentication endpoints to slow down credential-stuffing
// and brute-force attempts. Keyed by IP.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again in a few minutes.' },
});

// Limiter for AI endpoints, which are expensive (external Gemini calls).
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests. Please slow down and try again shortly.' },
});

// Generous global limiter to protect the API from abuse without affecting
// normal usage.
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
