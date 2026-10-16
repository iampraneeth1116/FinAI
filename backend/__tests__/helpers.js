import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Build a fully-mocked Prisma client. Each model method is a jest.fn() that
// tests configure per-case. Add models here as the app grows.
export function makePrismaMock() {
    const model = () => ({
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
    });
    return {
        user: model(),
        category: model(),
        transaction: model(),
        budget: model(),
        goal: model(),
    };
}

// Generate a valid bearer token for a fake user (matches setup.js secret).
export function authHeader(userId = 'user-1', email = 'test@example.com') {
    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { Authorization: `Bearer ${token}` };
}
