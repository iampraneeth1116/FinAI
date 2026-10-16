// Build a structured monthly financial report from a list of transactions.
// Pure function — easy to unit-test and reuse for both PDF and CSV output.

export function buildMonthlyReport(transactions, month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const inRange = transactions
        .filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const income = inRange.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = inRange.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    const categoryMap = {};
    inRange.filter(t => t.amount < 0).forEach(t => {
        const name = t.category?.name || 'Uncategorized';
        categoryMap[name] = (categoryMap[name] || 0) + Math.abs(t.amount);
    });
    const byCategory = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value);

    return {
        month,
        year,
        period: start.toLocaleString('default', { month: 'long', year: 'numeric' }),
        summary: {
            income: parseFloat(income.toFixed(2)),
            expenses: parseFloat(expenses.toFixed(2)),
            net: parseFloat((income - expenses).toFixed(2)),
            transactionCount: inRange.length,
            savingsRate: income > 0 ? parseFloat((((income - expenses) / income) * 100).toFixed(1)) : 0,
        },
        byCategory,
        transactions: inRange,
    };
}

// Build a CSV string from the report's transactions.
export function reportToCsv(report) {
    const escape = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount']];
    for (const t of report.transactions) {
        rows.push([
            new Date(t.date).toISOString().split('T')[0],
            t.description || '',
            t.category?.name || 'Uncategorized',
            t.amount >= 0 ? 'Income' : 'Expense',
            t.amount.toFixed(2),
        ]);
    }
    rows.push([]);
    rows.push(['', '', '', 'Total Income', report.summary.income.toFixed(2)]);
    rows.push(['', '', '', 'Total Expenses', report.summary.expenses.toFixed(2)]);
    rows.push(['', '', '', 'Net', report.summary.net.toFixed(2)]);
    return rows.map(r => r.map(escape).join(',')).join('\n');
}
