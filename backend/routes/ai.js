import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { chatSchema, categorizeSchema } from '../schemas/index.js';

const router = express.Router();

// Lazily construct the Gemini client so the server can boot (and tests can run)
// without an API key present. Throws a clear 503 only when AI is actually used.
let genAI = null;
function getGenAI() {
    if (!process.env.GEMINI_API_KEY) {
        throw new ApiError(503, 'AI service is not configured. Set GEMINI_API_KEY to enable it.');
    }
    if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI;
}

const MODEL = 'gemini-2.5-flash';

// In-memory insights cache: { userId -> { insights, expiresAt } }
const insightsCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper: fetch user's financial context to ground the AI
async function getUserFinancialContext(userId) {
    const transactions = await prisma.transaction.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 50,
    });

    const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const balance = income - expenses;

    const categoryBreakdown = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
        const cat = t.category?.name || 'Uncategorized';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(t.amount);
    });

    return {
        balance: balance.toFixed(2),
        totalIncome: income.toFixed(2),
        totalExpenses: expenses.toFixed(2),
        categoryBreakdown,
        recentTransactions: transactions.slice(0, 10).map(t => ({
            date: t.date.toISOString().split('T')[0],
            description: t.description,
            amount: t.amount,
            category: t.category?.name || 'Uncategorized',
        })),
    };
}

// POST /api/ai/chat — main conversational AI endpoint
router.post('/chat', authenticate, validate({ body: chatSchema }), asyncHandler(async (req, res) => {
    const { message, history } = req.body;
    const ai = getGenAI();

    const financialContext = await getUserFinancialContext(req.user.id);

    const systemPrompt = `You are FinAI, a smart and empathetic personal finance assistant.
You have access to the user's real financial data. Always reference specific numbers from their data when relevant.
Be concise, encouraging, and actionable. Format currency as $X.XX.

USER'S FINANCIAL SNAPSHOT:
- Current Balance: $${financialContext.balance}
- Total Income: $${financialContext.totalIncome}
- Total Expenses: $${financialContext.totalExpenses}
- Spending by Category: ${JSON.stringify(financialContext.categoryBreakdown, null, 2)}
- Recent Transactions (last 10): ${JSON.stringify(financialContext.recentTransactions, null, 2)}

Answer the user's question using this data. If something isn't in the data, say so honestly.`;

    const model = ai.getGenerativeModel({ model: MODEL });

    const chat = model.startChat({
        history: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Hello! I'm FinAI, your personal finance assistant. I can see your financial data and I'm ready to help you make smarter decisions. What would you like to know?" }] },
            ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        ],
    });

    const result = await chat.sendMessage(message);
    res.json({ reply: result.response.text() });
}));

// POST /api/ai/categorize — suggest one of the user's own categories for a transaction
router.post('/categorize', authenticate, validate({ body: categorizeSchema }), asyncHandler(async (req, res) => {
    const { description, amount } = req.body;

    const categories = await prisma.category.findMany({ where: { userId: req.user.id } });
    // Expenses are negative and income positive, so only offer categories of that type.
    const type = amount > 0 ? 'INCOME' : amount < 0 ? 'EXPENSE' : null;
    const options = type ? categories.filter(c => c.type === type) : categories;
    if (options.length === 0) {
        return res.json({ category: null, categoryId: null });
    }

    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: MODEL });

    const prompt = `Classify this financial transaction into exactly one of these categories:
${options.map(c => c.name).join(', ')}.

Transaction: "${description}" (Amount: $${amount ?? 'unknown'})

Respond with ONLY the category name, nothing else.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim().replace(/^["'`]+|["'`.]+$/g, '').toLowerCase();
    const match = options.find(c => c.name.toLowerCase() === answer);
    res.json({ category: match?.name ?? null, categoryId: match?.id ?? null });
}));

// GET /api/ai/insights — proactive financial insights
router.get('/insights', authenticate, asyncHandler(async (req, res) => {
    const cached = insightsCache.get(req.user.id);
    if (cached && cached.expiresAt > Date.now()) {
        return res.json({ insights: cached.insights, cached: true });
    }

    const financialContext = await getUserFinancialContext(req.user.id);
    if (financialContext.recentTransactions.length === 0) {
        return res.json({ insights: [] });
    }

    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: MODEL });

    const prompt = `You are a financial advisor. Based on this user's data, generate exactly 3 short, actionable financial insights.

Financial Data:
- Balance: $${financialContext.balance}
- Total Income: $${financialContext.totalIncome}
- Total Expenses: $${financialContext.totalExpenses}
- Spending by Category: ${JSON.stringify(financialContext.categoryBreakdown)}

Return a JSON array of 3 objects with keys "title" (short, max 6 words) and "message" (max 20 words, specific and actionable). No markdown, pure JSON array only.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    let insights;
    try {
        insights = JSON.parse(text);
    } catch {
        insights = [{ title: 'Review your spending', message: 'Add more transactions to get personalized AI insights.' }];
    }

    insightsCache.set(req.user.id, { insights, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json({ insights });
}));

export default router;
