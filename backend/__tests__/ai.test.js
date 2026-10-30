import { jest } from '@jest/globals';
import request from 'supertest';
import { makePrismaMock, authHeader } from './helpers.js';

process.env.GROQ_API_KEY = 'test-key';

const prismaMock = makePrismaMock();
const create = jest.fn();
jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('groq-sdk', () => ({
    default: class {
        chat = { completions: { create } };
    },
}));

const { default: app } = await import('../server.js');

const categories = [
    { id: 'c1', name: 'Groceries', type: 'EXPENSE' },
    { id: 'c2', name: 'Rent', type: 'EXPENSE' },
    { id: 'c3', name: 'Salary', type: 'INCOME' },
];
const aiSays = (text) => create.mockResolvedValue({ choices: [{ message: { content: text } }] });
const sentMessages = () => create.mock.calls[0][0].messages;
const categorize = (body) => request(app).post('/api/ai/categorize').set(authHeader('user-1')).send(body);

beforeEach(() => {
    create.mockReset();
    Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn) => fn.mockReset()));
    prismaMock.category.findMany.mockResolvedValue(categories);
    prismaMock.transaction.findMany.mockResolvedValue([
        { amount: -40, date: new Date(), description: 'Whole Foods', category: { name: 'Groceries' } },
    ]);
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
        const prompt = sentMessages()[0].content;
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
        expect(create).not.toHaveBeenCalled();
    });
});

describe('POST /api/ai/chat', () => {
    const chat = (body) => request(app).post('/api/ai/chat').set(authHeader('user-1')).send(body);

    it('grounds the reply in the user data and sends the conversation in order', async () => {
        aiSays('You spent $40.00 on groceries.');
        const res = await chat({
            message: 'And now?',
            history: [{ role: 'user', text: 'Hi' }, { role: 'model', text: 'Hello!' }],
        });

        expect(res.status).toBe(200);
        expect(res.body.reply).toBe('You spent $40.00 on groceries.');
        const messages = sentMessages();
        expect(messages.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
        expect(messages[0].content).toContain('Whole Foods');
        expect(messages[3].content).toBe('And now?');
    });

    it('returns a clear 429 when Groq rate limits the request', async () => {
        create.mockRejectedValue(Object.assign(new Error('rate limited'), { status: 429 }));
        const res = await chat({ message: 'Hi' });
        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/busy/);
    });
});

describe('GET /api/ai/insights', () => {
    const insights = (userId) => request(app).get('/api/ai/insights').set(authHeader(userId));
    const three = [1, 2, 3].map(n => ({ title: `Tip ${n}`, message: `Do ${n}` }));

    it('parses 3 insights, including when wrapped in a code fence', async () => {
        aiSays('```json\n' + JSON.stringify(three) + '\n```');
        const res = await insights('user-fence');
        expect(res.status).toBe(200);
        expect(res.body.insights).toEqual(three);
    });

    it('serves repeat requests from the cache for each user', async () => {
        aiSays(JSON.stringify(three));
        await insights('user-cache');
        const second = await insights('user-cache');
        expect(second.body).toEqual({ insights: three, cached: true });
        expect(create).toHaveBeenCalledTimes(1);

        await insights('user-other');
        expect(create).toHaveBeenCalledTimes(2);
    });
});
