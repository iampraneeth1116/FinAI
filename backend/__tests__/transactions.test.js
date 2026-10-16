import { jest } from '@jest/globals';
import request from 'supertest';
import { makePrismaMock, authHeader } from './helpers.js';

const prismaMock = makePrismaMock();
jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));

const { default: app } = await import('../server.js');

beforeEach(() => {
    Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn) => fn.mockReset()));
});

describe('GET /api/transactions', () => {
    it('requires authentication', async () => {
        const res = await request(app).get('/api/transactions');
        expect(res.status).toBe(401);
    });

    it('returns the user\'s transactions', async () => {
        prismaMock.transaction.findMany.mockResolvedValue([
            { id: 't1', amount: -20, description: 'Coffee', date: new Date().toISOString() },
        ]);
        const res = await request(app).get('/api/transactions').set(authHeader());
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'user-1' } })
        );
    });
});

describe('POST /api/transactions', () => {
    it('creates a transaction with valid data', async () => {
        prismaMock.transaction.create.mockResolvedValue({ id: 't1', amount: -50, description: 'Food' });
        const res = await request(app)
            .post('/api/transactions')
            .set(authHeader())
            .send({ amount: -50, date: '2026-01-01', description: 'Food' });
        expect(res.status).toBe(201);
        expect(prismaMock.transaction.create).toHaveBeenCalled();
        const data = prismaMock.transaction.create.mock.calls[0][0].data;
        expect(data.userId).toBe('user-1');
        expect(data.amount).toBe(-50);
    });

    it('rejects missing amount with validation error', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .set(authHeader())
            .send({ date: '2026-01-01', description: 'Food' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/validation/i);
    });

    it('rejects a zero amount', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .set(authHeader())
            .send({ amount: 0, date: '2026-01-01' });
        expect(res.status).toBe(400);
    });

    it('rejects a category that does not belong to the user', async () => {
        prismaMock.category.findFirst.mockResolvedValue(null);
        const res = await request(app)
            .post('/api/transactions')
            .set(authHeader())
            .send({ amount: -10, date: '2026-01-01', categoryId: 'other-user-cat' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid category/i);
    });
});

describe('DELETE /api/transactions/:id', () => {
    it('returns 404 when the transaction is not owned by the user', async () => {
        prismaMock.transaction.deleteMany.mockResolvedValue({ count: 0 });
        const res = await request(app).delete('/api/transactions/t-x').set(authHeader());
        expect(res.status).toBe(404);
    });

    it('deletes an owned transaction', async () => {
        prismaMock.transaction.deleteMany.mockResolvedValue({ count: 1 });
        const res = await request(app).delete('/api/transactions/t1').set(authHeader());
        expect(res.status).toBe(200);
    });
});
