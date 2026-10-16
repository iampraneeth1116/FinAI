import { jest } from '@jest/globals';
import request from 'supertest';
import { makePrismaMock, authHeader } from './helpers.js';

const prismaMock = makePrismaMock();
jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));

const { default: app } = await import('../server.js');

beforeEach(() => {
    Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn) => fn.mockReset()));
});

describe('POST /api/scenario/simulate', () => {
    it('projects future balances over the requested period', async () => {
        const now = new Date();
        const recent = [
            { amount: 9000, date: now },   // ~3000/mo income over 3 months
            { amount: -3000, date: now },  // ~1000/mo expense over 3 months
        ];
        // first findMany -> recent (last 3 months), second findMany -> all
        prismaMock.transaction.findMany
            .mockResolvedValueOnce(recent)
            .mockResolvedValueOnce(recent);

        const res = await request(app)
            .post('/api/scenario/simulate')
            .set(authHeader())
            .send({ monthlyIncomeDelta: 0, monthlyExpenseDelta: 0, oneTimeCost: 0, months: 6 });

        expect(res.status).toBe(200);
        expect(res.body.projection).toHaveLength(6);
        expect(res.body.baseMonthlyIncome).toBeCloseTo(3000, 1);
        expect(res.body.baseMonthlyExpense).toBeCloseTo(1000, 1);
        expect(res.body.projectedMonthlySavings).toBeCloseTo(2000, 1);
        // current balance = 9000 - 3000 = 6000
        expect(res.body.currentBalance).toBeCloseTo(6000, 1);
    });

    it('applies a one-time cost immediately and income/expense deltas monthly', async () => {
        const now = new Date();
        const recent = [{ amount: 6000, date: now }, { amount: -3000, date: now }];
        prismaMock.transaction.findMany
            .mockResolvedValueOnce(recent)
            .mockResolvedValueOnce(recent);

        const res = await request(app)
            .post('/api/scenario/simulate')
            .set(authHeader())
            .send({ monthlyIncomeDelta: 500, monthlyExpenseDelta: -200, oneTimeCost: 1000, months: 12 });

        expect(res.status).toBe(200);
        // base income 2000, base expense 1000 => base savings 1000
        // projected savings = (2000+500) - (1000-200) = 2500 - 800 = 1700
        expect(res.body.projectedMonthlySavings).toBeCloseTo(1700, 1);
        expect(res.body.projection).toHaveLength(12);
        expect(res.body.baseline).toHaveLength(12);
    });

    it('rejects months outside the allowed range', async () => {
        const res = await request(app)
            .post('/api/scenario/simulate')
            .set(authHeader())
            .send({ months: 999 });
        expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
        const res = await request(app).post('/api/scenario/simulate').send({});
        expect(res.status).toBe(401);
    });
});
