"use client";
import { useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Zap } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 shadow-lg text-sm">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{label}</p>
                {payload.map(p => (
                    <p key={p.dataKey} style={{ color: p.color }}>
                        {p.name}: <span className="font-bold">${Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

function SliderControl({ label, icon: Icon, value, onChange, min, max, step, unit = '$', color }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <Icon className={`w-4 h-4 ${color}`} />
                    {label}
                </div>
                <span className={`text-sm font-bold ${value >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {value >= 0 ? '+' : ''}{unit}{Math.abs(value).toLocaleString()}
                </span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500 bg-zinc-200 dark:bg-zinc-700"
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>{unit}{Math.abs(min).toLocaleString()}</span>
                <span>0</span>
                <span>+{unit}{max.toLocaleString()}</span>
            </div>
        </div>
    );
}

export default function ScenarioSimulator() {
    const [incomeDelta, setIncomeDelta] = useState(0);
    const [expenseDelta, setExpenseDelta] = useState(0);
    const [oneTimeCost, setOneTimeCost] = useState(0);
    const [months, setMonths] = useState(12);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [chartData, setChartData] = useState([]);

    const runSimulation = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/scenario/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    monthlyIncomeDelta: incomeDelta,
                    monthlyExpenseDelta: expenseDelta,
                    oneTimeCost,
                    months,
                }),
            });
            const data = await res.json();
            if (!data.error) {
                setResult(data);
                // Merge projection + baseline into one array for the chart
                const merged = data.projection.map((p, i) => ({
                    month: p.month,
                    Projected: p.balance,
                    Baseline: data.baseline[i]?.balance ?? p.balance,
                }));
                setChartData(merged);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [incomeDelta, expenseDelta, oneTimeCost, months]);

    const balanceDiff = result
        ? result.finalProjectedBalance - (result.baseline[result.baseline.length - 1]?.balance ?? result.currentBalance)
        : 0;

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Scenario Simulator</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Explore "what-if" financial decisions and see their long-term impact.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Controls Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-6">
                        <SliderControl
                            label="Monthly Income Change"
                            icon={TrendingUp}
                            value={incomeDelta}
                            onChange={setIncomeDelta}
                            min={-3000} max={5000} step={100}
                            color="text-emerald-500"
                        />
                        <SliderControl
                            label="Monthly Expense Change"
                            icon={ShoppingCart}
                            value={expenseDelta}
                            onChange={setExpenseDelta}
                            min={-2000} max={3000} step={100}
                            color="text-rose-500"
                        />
                        <SliderControl
                            label="One-Time Purchase"
                            icon={DollarSign}
                            value={oneTimeCost}
                            onChange={setOneTimeCost}
                            min={0} max={50000} step={500}
                            color="text-amber-500"
                        />

                        {/* Months Toggle */}
                        <div>
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2.5">Projection Period</p>
                            <div className="flex gap-2">
                                {[3, 6, 12, 24].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMonths(m)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${months === m
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        {m}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={runSimulation}
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <Zap className="w-4 h-4" />
                            {loading ? 'Running...' : 'Run Simulation'}
                        </button>
                    </div>

                    {/* Result Summary Cards */}
                    {result && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-4">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Simulation Summary</h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                                    <p className="text-xs text-zinc-500">Current Balance</p>
                                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                                        ${result.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                                    <p className="text-xs text-zinc-500">Projected Balance</p>
                                    <p className={`text-base font-bold mt-0.5 ${result.finalProjectedBalance >= result.currentBalance ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        ${result.finalProjectedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                                    <p className="text-xs text-zinc-500">Monthly Savings</p>
                                    <p className={`text-base font-bold mt-0.5 ${result.projectedMonthlySavings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {result.projectedMonthlySavings >= 0 ? '+' : ''}${result.projectedMonthlySavings.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                                    <p className="text-xs text-zinc-500">vs No Change</p>
                                    <p className={`text-base font-bold mt-0.5 ${balanceDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {balanceDiff >= 0 ? '+' : ''}${balanceDiff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div className={`flex items-start gap-3 p-3 rounded-xl text-sm border ${result.projectedMonthlySavings >= 0
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300'
                                }`}>
                                {result.projectedMonthlySavings >= 0
                                    ? <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
                                    : <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />}
                                {result.projectedMonthlySavings >= 0
                                    ? `You'd save $${result.projectedMonthlySavings.toFixed(2)} more per month, building ${months}mo of financial runway.`
                                    : `You'd run a $${Math.abs(result.projectedMonthlySavings).toFixed(2)}/mo deficit. Consider reducing expenses.`}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chart Area */}
                <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Balance Projection</h3>
                    <p className="text-xs text-zinc-400 mb-6">Projected vs baseline (no changes) over {months} months</p>

                    {chartData.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4">
                            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Zap className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-zinc-600 dark:text-zinc-300">Ready to simulate</p>
                                <p className="text-sm mt-1">Adjust the sliders and click <strong>Run Simulation</strong> to see your projected financial future.</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={380}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-zinc-800" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                <Area
                                    type="monotone" dataKey="Baseline" name="Baseline (no change)"
                                    stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5"
                                    fill="url(#baseGrad)"
                                />
                                <Area
                                    type="monotone" dataKey="Projected" name="Your Scenario"
                                    stroke="#10b981" strokeWidth={2.5}
                                    fill="url(#projGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </>
    );
}
