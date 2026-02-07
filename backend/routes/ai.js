import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory insights cache: { userId -> { insights, expiresAt } }
const insightsCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper: fetch user's financial context to ground the AI
async function getUserFinancialContext(userId) {
    const [transactions, summary] = await Promise.all([
        prisma.transaction.findMany({
            where: { userId },
            include: { category: true },
            orderBy: { date: 'desc' },
            take: 50,
        }),
        prisma.transaction.groupBy({
            by: ['userId'],
            where: { userId },
            _sum: { amount: true },
        }),
    ]);

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
router.post('/chat', authenticate, async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
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

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build chat history for context
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: 'model',
                    parts: [{ text: "Hello! I'm FinAI, your personal finance assistant. I can see your financial data and I'm ready to help you make smarter decisions. What would you like to know?" }],
                },
                ...history.map(h => ({
                    role: h.role,
                    parts: [{ text: h.text }],
                })),
            ],
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();

        res.json({ reply: response });
    } catch (error) {
        console.error('Gemini chat error:', error);
        res.status(500).json({ error: 'AI service error. Please check your GEMINI_API_KEY.' });
    }
});

// POST /api/ai/categorize — auto-categorize a transaction description
router.post('/categorize', authenticate, async (req, res) => {
    const { description, amount } = req.body;

    if (!description) {
        return res.status(400).json({ error: 'Description is required' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Classify this financial transaction into exactly one of these categories:
Food & Dining, Transportation, Shopping, Entertainment, Health & Fitness, Utilities, Housing, Education, Travel, Personal Care, Income, Investment, Savings, Other.

Transaction: "${description}" (Amount: $${amount || 'unknown'})

Respond with ONLY the category name, nothing else.`;

        const result = await model.generateContent(prompt);
        const category = result.response.text().trim();

        res.json({ category });
    } catch (error) {
        console.error('Categorization error:', error);
        res.status(500).json({ error: 'Categorization failed' });
    }
});

// GET /api/ai/insights — proactive financial insights
router.get('/insights', authenticate, async (req, res) => {
    try {
        // Serve from cache if still valid
        const cached = insightsCache.get(req.user.id);
        if (cached && cached.expiresAt > Date.now()) {
            return res.json({ insights: cached.insights, cached: true });
        }

        const financialContext = await getUserFinancialContext(req.user.id);

        if (financialContext.recentTransactions.length === 0) {
            return res.json({ insights: [] });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are a financial advisor. Based on this user's data, generate exactly 3 short, actionable financial insights.

Financial Data:
- Balance: $${financialContext.balance}
- Total Income: $${financialContext.totalIncome}  
- Total Expenses: $${financialContext.totalExpenses}
- Spending by Category: ${JSON.stringify(financialContext.categoryBreakdown)}

Return a JSON array of 3 objects with keys "title" (short, max 6 words) and "message" (max 20 words, specific and actionable). No markdown, pure JSON array only.`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        // Strip potential markdown code fences
        text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

        let insights;
        try {
            insights = JSON.parse(text);
        } catch {
            insights = [{ title: 'Review your spending', message: 'Add more transactions to get personalized AI insights.' }];
        }

        // Store in cache
        insightsCache.set(req.user.id, { insights, expiresAt: Date.now() + CACHE_TTL_MS });

        res.json({ insights });
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

export default router;
