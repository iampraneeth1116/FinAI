import { jest } from '@jest/globals';
import request from 'supertest';
import { makePrismaMock, authHeader } from './helpers.js';

const prismaMock = makePrismaMock();
jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));

const { default: app } = await import('../server.js');

beforeEach(() => {
    Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn) => fn.mockReset()));
});

describe('GET /api/alerts', () => {
    it('requires authentication', async () => {
        const res = await request(app).get('/api/alerts');
        expect(res.status).toBe(401);
    });

    it('returns overspent budgets first and counts them by severity', async () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        prismaMock.transaction.findMany.mockResolvedValue([
            { id: 't1', amount: -150, description: 'Groceries', date: today },
        ]);
        prismaMock.budget.findMany.mockResolvedValue([
            { id: 'b1', amount: 100, month: now.getMonth() + 1, year: now.getFullYear() },
        ]);

        const res = await request(app).get('/api/alerts').set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.alerts[0].type).toBe('budget_over');
        expect(res.body.bySeverity.high).toBe(1);
    });

    it("only looks at the current user's budgets for the current month", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([]);
        prismaMock.budget.findMany.mockResolvedValue([]);
        const now = new Date();

        await request(app).get('/api/alerts').set(authHeader('user-9'));

        expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-9', month: now.getMonth() + 1, year: now.getFullYear() },
        });
    });
});
