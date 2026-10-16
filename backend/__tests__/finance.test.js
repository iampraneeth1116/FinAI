import {
    merchantKey, detectRecurring, estimateMonthlyRecurringCost,
    detectAnomalies, projectGoal, estimateMonthlySavingRate,
} from '../lib/finance.js';
import { buildMonthlyReport, reportToCsv } from '../lib/report.js';

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

describe('merchantKey', () => {
    it('normalizes descriptions to a stable key', () => {
        expect(merchantKey('Netflix #1234')).toBe('netflix');
        expect(merchantKey('NETFLIX subscription')).toBe('netflix subscription');
        expect(merchantKey('')).toBe('unknown');
    });
});

describe('detectRecurring', () => {
    it('detects a monthly subscription with consistent amounts', () => {
        const txns = [
            { id: '1', amount: -15.99, description: 'Netflix', date: daysAgo(90) },
            { id: '2', amount: -15.99, description: 'Netflix', date: daysAgo(60) },
            { id: '3', amount: -15.99, description: 'Netflix', date: daysAgo(30) },
        ];
        const result = detectRecurring(txns);
        expect(result).toHaveLength(1);
        expect(result[0].cadence).toBe('monthly');
        expect(result[0].averageAmount).toBeCloseTo(15.99, 2);
        expect(result[0].occurrences).toBe(3);
        expect(new Date(result[0].nextExpectedDate).getTime()).toBeGreaterThan(Date.now() - 1);
    });

    it('ignores one-off purchases and irregular spending', () => {
        const txns = [
            { id: '1', amount: -200, description: 'Random Shop', date: daysAgo(40) },
            { id: '2', amount: -12, description: 'Groceries', date: daysAgo(35) },
        ];
        expect(detectRecurring(txns)).toHaveLength(0);
    });

    it('ignores income and groups with wildly varying amounts', () => {
        const txns = [
            { id: '1', amount: 3000, description: 'Salary', date: daysAgo(60) },
            { id: '2', amount: 3000, description: 'Salary', date: daysAgo(30) },
            { id: '3', amount: -10, description: 'Coffee', date: daysAgo(60) },
            { id: '4', amount: -90, description: 'Coffee', date: daysAgo(30) },
        ];
        const result = detectRecurring(txns);
        // income excluded; coffee amounts vary > 25% so not recurring
        expect(result).toHaveLength(0);
    });

    it('estimates total monthly recurring cost', () => {
        const recurring = [
            { cadence: 'monthly', averageAmount: 16 },
            { cadence: 'yearly', averageAmount: 120 },
        ];
        expect(estimateMonthlyRecurringCost(recurring)).toBeCloseTo(16 + 10, 1);
    });
});

describe('detectAnomalies', () => {
    it('flags an unusually large transaction', () => {
        const txns = [
            ...Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, amount: -20, description: `Shop ${i}`, date: daysAgo(20 + i) })),
            { id: 'big', amount: -2000, description: 'Laptop', date: daysAgo(2) },
        ];
        const alerts = detectAnomalies(txns);
        expect(alerts.some(a => a.type === 'amount_spike' && a.id === 'big')).toBe(true);
    });

    it('flags duplicate charges within a short window', () => {
        const txns = [
            { id: 'd1', amount: -49.99, description: 'Gym', date: daysAgo(5) },
            { id: 'd2', amount: -49.99, description: 'Gym', date: daysAgo(4) },
        ];
        const alerts = detectAnomalies(txns);
        expect(alerts.some(a => a.type === 'duplicate')).toBe(true);
    });

    it('flags a first-time merchant in the recent window', () => {
        const txns = [
            { id: 'o1', amount: -20, description: 'Old Cafe', date: daysAgo(120) },
            { id: 'o2', amount: -22, description: 'Old Cafe', date: daysAgo(90) },
            { id: 'new', amount: -25, description: 'Brand New Store', date: daysAgo(2) },
        ];
        const alerts = detectAnomalies(txns);
        expect(alerts.some(a => a.type === 'new_merchant' && a.id === 'new')).toBe(true);
    });

    it('returns no alerts for an empty history', () => {
        expect(detectAnomalies([])).toEqual([]);
    });
});

describe('projectGoal', () => {
    it('computes progress and projects completion when saving', () => {
        const now = new Date('2026-01-01');
        const goal = { targetAmount: 5000, currentAmount: 1000, deadline: new Date('2026-12-01') };
        const p = projectGoal(goal, 1000, now);
        expect(p.remaining).toBe(4000);
        expect(p.percentComplete).toBe(20);
        expect(p.monthsToGoal).toBe(4);
        expect(p.onTrack).toBe(true);
    });

    it('marks a goal off-track when the saving rate is too low for the deadline', () => {
        const now = new Date('2026-01-01');
        const goal = { targetAmount: 12000, currentAmount: 0, deadline: new Date('2026-04-01') };
        const p = projectGoal(goal, 1000, now);
        expect(p.onTrack).toBe(false);
        expect(p.requiredMonthly).toBeCloseTo(4000, 1);
    });

    it('treats a fully-funded goal as complete', () => {
        const goal = { targetAmount: 1000, currentAmount: 1000, deadline: new Date('2026-12-01') };
        const p = projectGoal(goal, 0);
        expect(p.percentComplete).toBe(100);
        expect(p.remaining).toBe(0);
        expect(p.onTrack).toBe(true);
    });
});

describe('estimateMonthlySavingRate', () => {
    it('averages net cash flow over the lookback window', () => {
        const txns = [
            { amount: 3000, date: daysAgo(10) },
            { amount: -1500, date: daysAgo(10) },
            { amount: 3000, date: daysAgo(40) },
            { amount: -1500, date: daysAgo(40) },
        ];
        const rate = estimateMonthlySavingRate(txns, 3);
        expect(rate).toBeCloseTo(1000, 0); // 3000 net over 3 months
    });
});

describe('buildMonthlyReport + reportToCsv', () => {
    const txns = [
        { id: 't1', amount: 4000, date: new Date('2026-03-01'), description: 'Salary', category: { name: 'Salary' } },
        { id: 't2', amount: -100, date: new Date('2026-03-05'), description: 'Groceries', category: { name: 'Food & Dining' } },
        { id: 't3', amount: -50, date: new Date('2026-03-10'), description: 'Gas', category: null },
        { id: 't4', amount: -999, date: new Date('2026-02-10'), description: 'Old', category: null }, // out of range
    ];

    it('summarizes only transactions within the month', () => {
        const report = buildMonthlyReport(txns, 3, 2026);
        expect(report.summary.income).toBe(4000);
        expect(report.summary.expenses).toBe(150);
        expect(report.summary.net).toBe(3850);
        expect(report.summary.transactionCount).toBe(3);
        expect(report.byCategory[0].name).toBe('Food & Dining');
    });

    it('produces CSV with a header and totals', () => {
        const report = buildMonthlyReport(txns, 3, 2026);
        const csv = reportToCsv(report);
        expect(csv).toMatch(/Date,Description,Category,Type,Amount/);
        expect(csv).toMatch(/Net,3850.00/);
    });
});
