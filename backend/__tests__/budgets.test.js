import { jest } from '@jest/globals';
import request from 'supertest';
import { makePrismaMock, authHeader } from './helpers.js';

const prismaMock = makePrismaMock();
jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));

const { default: app } = await import('../server.js');

beforeEach(() => {
    Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn) => fn.mockReset()));
});

describe('GET /api/budgets', () => {
    it('enriches each budget with actual spending', async () => {
        prismaMock.budget.findMany.mockResolvedValue([{ id: 'b1', amount: 1000, month: 1, year: 2026 }]);
        prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: -250 } });

        const res = await request(app).get('/api/budgets').set(authHeader());
        expect(res.status).toBe(200);
        expect(res.body[0].spent).toBe(250);
    });
});

describe('POST /api/budgets', () => {
    it('creates a budget when none exists for the month', async () => {
        prismaMock.budget.findFirst.mockResolvedValue(null);
        prismaMock.budget.create.mockResolvedValue({ id: 'b1', amount: 1500, month: 2, year: 2026 });
        const res = await request(app)
            .post('/api/budgets')
            .set(authHeader())
            .send({ amount: 1500, month: 2, year: 2026 });
        expect(res.status).toBe(201);
        expect(prismaMock.budget.create).toHaveBeenCalled();
    });

    it('rejects a duplicate budget for the same month with 409', async () => {
        prismaMock.budget.findFirst.mockResolvedValue({ id: 'b1', month: 2, year: 2026 });
        const res = await request(app)
            .post('/api/budgets')
            .set(authHeader())
            .send({ amount: 1500, month: 2, year: 2026 });
        expect(res.status).toBe(409);
    });

    it('rejects an invalid month', async () => {
        const res = await request(app)
            .post('/api/budgets')
            .set(authHeader())
            .send({ amount: 1500, month: 13, year: 2026 });
        expect(res.status).toBe(400);
    });

    it('rejects a negative budget amount', async () => {
        const res = await request(app)
            .post('/api/budgets')
            .set(authHeader())
            .send({ amount: -100, month: 5, year: 2026 });
        expect(res.status).toBe(400);
    });
});

describe('DELETE /api/budgets/:id', () => {
    it('returns 404 for a budget the user does not own', async () => {
        prismaMock.budget.deleteMany.mockResolvedValue({ count: 0 });
        const res = await request(app).delete('/api/budgets/x').set(authHeader());
        expect(res.status).toBe(404);
    });
});
