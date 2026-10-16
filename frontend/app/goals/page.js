"use client";
import { useState, useEffect } from 'react';
import { Plus, Target, Trash2, TrendingUp, CalendarClock, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { api, fmt } from '../lib/api';

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function GoalCard({ goal, onDelete, onContribute }) {
    const [contributing, setContributing] = useState(false);
    const [amount, setAmount] = useState('');
    const p = goal.projection || {};
    const pct = p.percentComplete ?? 0;
    const complete = pct >= 100;

    const handleContribute = async (e) => {
        e.preventDefault();
        if (!amount) return;
        await onContribute(goal.id, parseFloat(amount));
        setAmount('');
        setContributing(false);
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${complete ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'}`}>
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{goal.name}</h3>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <CalendarClock className="w-3 h-3" /> Target by {formatDate(goal.deadline)}
                        </p>
                    </div>
                </div>
                <button onClick={() => onDelete(goal.id)} className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fmt(goal.currentAmount)}</span>
                <span className="text-sm text-zinc-400">of {fmt(goal.targetAmount)}</span>
            </div>

            <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${complete ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">{pct.toFixed(0)}% complete · {fmt(p.remaining)} to go</p>

            {/* Projection */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                {complete ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Goal reached — nice work!
                    </div>
                ) : p.onTrack === true ? (
                    <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>On track — projected completion {formatDate(p.projectedCompletionDate)}.</span>
                    </div>
                ) : p.onTrack === false ? (
                    <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            Behind schedule. Save {fmt(p.requiredMonthly)}/mo to hit your deadline
                            {p.projectedCompletionDate ? ` (current pace: ${formatDate(p.projectedCompletionDate)})` : ''}.
                        </span>
                    </div>
                ) : (
                    <div className="flex items-start gap-2 text-zinc-500">
                        <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Add transactions so we can project your completion date.</span>
                    </div>
                )}
            </div>

            {/* Contribute */}
            {contributing ? (
                <form onSubmit={handleContribute} className="mt-3 flex items-center gap-2">
                    <input
                        type="number" step="0.01" min="0" autoFocus placeholder="Amount"
                        value={amount} onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button type="submit" className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">Add</button>
                    <button type="button" onClick={() => setContributing(false)} className="p-2 text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
                </form>
            ) : !complete && (
                <button onClick={() => setContributing(true)} className="mt-3 w-full py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                    + Add contribution
                </button>
            )}
        </div>
    );
}

export default function Goals() {
    const [goals, setGoals] = useState([]);
    const [savingRate, setSavingRate] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '', deadline: '' });

    const load = async () => {
        try {
            const data = await api.get('/goals');
            setGoals(data.goals || []);
            setSavingRate(data.monthlySavingRate || 0);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/goals', {
                name: form.name,
                targetAmount: form.targetAmount,
                currentAmount: form.currentAmount || 0,
                deadline: form.deadline,
            });
            setForm({ name: '', targetAmount: '', currentAmount: '', deadline: '' });
            setShowForm(false);
            load();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleDelete = async (id) => {
        await api.del(`/goals/${id}`);
        load();
    };

    const handleContribute = async (id, amount) => {
        await api.post(`/goals/${id}/contribute`, { amount });
        load();
    };

    return (
        <>
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Savings Goals</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Set targets and track progress.
                        {savingRate !== 0 && (
                            <span className="ml-1">Your current saving rate is <span className={`font-semibold ${savingRate >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(savingRate)}/mo</span>.</span>
                        )}
                    </p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> New Goal
                </button>
            </header>

            {showForm && (
                <div className="mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h2 className="text-base font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Create a Savings Goal</h2>
                    {error && <p className="text-sm text-rose-500 mb-3 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>}
                    <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" onSubmit={handleCreate}>
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Goal name</label>
                            <input required placeholder="e.g. Emergency Fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Target amount ($)</label>
                            <input required type="number" step="0.01" min="0" placeholder="5000" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Saved so far ($)</label>
                            <input type="number" step="0.01" min="0" placeholder="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Deadline</label>
                            <input required type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20" />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">Create Goal</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6">
                            <div className="skeleton h-10 w-10 rounded-full mb-4" />
                            <div className="skeleton h-6 w-32 mb-3" />
                            <div className="skeleton h-2.5 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            ) : goals.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <Target className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">No goals yet</h3>
                    <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">Create a savings goal like "Save $5,000 by December" and FinAI will project whether you're on track.</p>
                    <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> Create your first goal
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {goals.map((g) => (
                        <GoalCard key={g.id} goal={g} onDelete={handleDelete} onContribute={handleContribute} />
                    ))}
                </div>
            )}
        </>
    );
}
