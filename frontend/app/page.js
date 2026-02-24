"use client";
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Zap } from 'lucide-react';
import { SkeletonCard, SkeletonChart } from './components/Skeleton';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function StatCard({ title, value, icon: Icon, trend, trendLabel, color }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
            ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className={`flex items-center font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-zinc-500">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">{label}</p>
        {payload.map((pld) => (
          <p key={pld.dataKey} style={{ color: pld.color }}>
            {pld.name}: ${Number(pld.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Home() {
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0 });
  const [monthly, setMonthly] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [recent, setRecent] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/analytics/summary`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/analytics/monthly`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/analytics/by-category`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/analytics/recent`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/ai/insights`, { headers }).then(r => r.json()),
    ]).then(([sum, mon, cat, rec, ins]) => {
      if (!sum.error) setSummary(sum);
      if (!mon.error) setMonthly(Array.isArray(mon) ? mon : []);
      if (!cat.error) setByCategory(Array.isArray(cat) ? cat : []);
      if (!rec.error) setRecent(Array.isArray(rec) ? rec : []);
      if (ins.insights) setAiInsights(ins.insights);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <SkeletonChart />
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <SkeletonChart />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Overview</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Here's what's happening with your money.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Balance"
          value={summary.balance}
          icon={Wallet}
          color="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          title="Total Income"
          value={summary.income}
          icon={TrendingUp}
          color="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Total Expenses"
          value={summary.expenses}
          icon={ArrowDownRight}
          color="bg-rose-50 dark:bg-rose-500/10 text-rose-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Monthly Income vs Expenses (Area Chart) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Income vs Expenses (6 months)</h3>
          {monthly.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No monthly data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-zinc-800" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Breakdown (Pie Chart) */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Spending by Category</h3>
          {byCategory.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No category data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {byCategory.slice(0, 4).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                      <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">${cat.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Bar Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        {/* Bar Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Monthly Expenses</h3>
          {monthly.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No monthly data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-zinc-800" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent Transactions</h3>
          {recent.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No recent transactions</div>
          ) : (
            <div className="space-y-3">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${t.amount >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {t.amount >= 0 ? '↑' : '↓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{t.description || 'Transaction'}</p>
                    <p className="text-xs text-zinc-400">{new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-semibold ${t.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestion Banner */}
      <div className="mt-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-sm shrink-0 flex items-center justify-center text-white">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">AI Assistant Ready</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">Ask anything about your finances — tap the AI Assistant to get personalized insights.</p>
        </div>
        <a href="/assistant" className="md:ml-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm rounded-xl transition-colors whitespace-nowrap">
          Open AI Assistant
        </a>
      </div>
    </>
  );
}
