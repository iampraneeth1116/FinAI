import { jest } from '@jest/globals';
import request from 'supertest';
import { makePrismaMock, authHeader } from './helpers.js';

process.env.GEMINI_API_KEY = 'test-key';

const prismaMock = makePrismaMock();
const generateContent = jest.fn();
jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('@google/generative-ai', () => ({
    GoogleGenerativeAI: class {
        getGenerativeModel() { return { generateContent }; }
    },
}));

const { default: app } = await import('../server.js');

const categories = [
    { id: 'c1', name: 'Groceries', type: 'EXPENSE' },
    { id: 'c2', name: 'Rent', type: 'EXPENSE' },
    { id: 'c3', name: 'Salary', type: 'INCOME' },
];
const aiSays = (text) => generateContent.mockResolvedValue({ response: { text: () => text } });
const categorize = (body) => request(app).post('/api/ai/categorize').set(authHeader('user-1')).send(body);

beforeEach(() => {
    generateContent.mockReset();
    Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn) => fn.mockReset()));
    prismaMock.category.findMany.mockResolvedValue(categories);
});

describe('POST /api/ai/categorize', () => {
    it('requires authentication', async () => {
        const res = await request(app).post('/api/ai/categorize').send({ description: 'Coffee' });
        expect(res.status).toBe(401);
    });

    it("returns the id of the matching user's category", async () => {
        aiSays(' "groceries." ');
        const res = await categorize({ description: 'Whole Foods', amount: -40 });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ category: 'Groceries', categoryId: 'c1' });
        expect(prismaMock.category.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('only offers categories matching the transaction type', async () => {
        aiSays('Salary');
        await categorize({ description: 'Paycheck', amount: 5000 });
        const prompt = generateContent.mock.calls[0][0];
        expect(prompt).toContain('Salary');
        expect(prompt).not.toContain('Groceries');
    });

    it('rejects an answer that is not one of the offered categories', async () => {
        aiSays('Salary');
        const res = await categorize({ description: 'Whole Foods', amount: -40 });
        expect(res.body).toEqual({ category: null, categoryId: null });
    });

    it('skips the AI call when the user has no categories to offer', async () => {
        prismaMock.category.findMany.mockResolvedValue([]);
        const res = await categorize({ description: 'Coffee', amount: -4 });
        expect(res.body).toEqual({ category: null, categoryId: null });
        expect(generateContent).not.toHaveBeenCalled();
    });
});
