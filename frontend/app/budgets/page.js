"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, TrendingDown, X, Check } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function BudgetCard({ budget, onDelete, onUpdate }) {
    const [editing, setEditing] = useState(false);
    const [newAmount, setNewAmount] = useState(budget.amount);

    const pct = Math.min((budget.spent / budget.amount) * 100, 100);
    const over = budget.spent > budget.amount;
    const remaining = budget.amount - budget.spent;

    const handleUpdate = async () => {
        await onUpdate(budget.id, newAmount);
        setEditing(false);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {MONTHS[budget.month - 1]} {budget.year}
                    </h3>
                    {editing ? (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-zinc-500">$</span>
                            <input
                                type="number"
                                className="w-28 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1 text-sm outline-none text-zinc-900 dark:text-zinc-100"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                            />
                            <button onClick={handleUpdate} className="text-emerald-500 hover:text-emerald-600"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                            ${budget.amount.toFixed(2)} <span className="text-sm font-normal text-zinc-400">budget</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(true)} className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(budget.id)} className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span>Spent: <span className={`font-semibold ${over ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}`}>${budget.spent.toFixed(2)}</span></span>
                    <span className={over ? 'text-rose-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {over ? `$${Math.abs(remaining).toFixed(2)} over` : `$${remaining.toFixed(2)} left`}
                    </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{pct.toFixed(0)}% of budget used</p>
            </div>
        </div>
    );
}

export default function Budgets() {
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [error, setError] = useState('');

    useEffect(() => { fetchBudgets(); }, []);

    const fetchBudgets = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/budgets`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (Array.isArray(data)) setBudgets(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount, month, year }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setShowForm(false);
        setAmount('');
        fetchBudgets();
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/budgets/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        fetchBudgets();
    };

    const handleUpdate = async (id, newAmount) => {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/budgets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount: newAmount }),
        });
        fetchBudgets();
    };

    const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

    return (
        <>
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Budgets</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Set monthly spending limits and track your progress.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Set Budget
                </button>
            </header>

            {/* Summary */}
            {budgets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Budgeted</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">${totalBudgeted.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Spent</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">${totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Remaining</p>
                        <p className={`text-2xl font-bold mt-1 ${totalSpent > totalBudgeted ? 'text-rose-500' : 'text-emerald-500'}`}>
                            ${Math.abs(totalBudgeted - totalSpent).toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            {/* Add form */}
            {showForm && (
                <div className="mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h2 className="text-base font-semibold mb-4 text-zinc-900 dark:text-zinc-100">New Monthly Budget</h2>
                    {error && <p className="text-sm text-rose-500 mb-3 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>}
                    <form className="grid grid-cols-1 sm:grid-cols-4 gap-4" onSubmit={handleCreate}>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Month</label>
                            <select className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100"
                                value={month} onChange={e => setMonth(Number(e.target.value))}>
                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Year</label>
                            <input type="number" className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100"
                                value={year} onChange={e => setYear(Number(e.target.value))} min="2020" max="2030" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Budget Amount ($)</label>
                            <input type="number" required step="0.01" placeholder="e.g. 2000" className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100"
                                value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div className="flex items-end gap-2">
                            <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">Save</button>
                            <button type="button" onClick={() => setShowForm(false)} className="py-2 px-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Budget Cards */}
            {loading ? (
                <div className="text-center text-zinc-400 py-16">Loading budgets...</div>
            ) : budgets.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <TrendingDown className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">No budgets yet</h3>
                    <p className="text-sm text-zinc-400 mt-1">Click "Set Budget" to create your first monthly budget.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {budgets.map(b => (
                        <BudgetCard key={b.id} budget={b} onDelete={handleDelete} onUpdate={handleUpdate} />
                    ))}
                </div>
            )}
        </>
    );
}
