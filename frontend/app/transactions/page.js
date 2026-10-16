"use client";
import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Trash2, Edit2, X, Loader2 } from 'lucide-react';
import { api, fmt } from '../lib/api';
import { SkeletonRow } from '../components/Skeleton';

const emptyForm = { amount: '', date: '', description: '', categoryId: '' };

export default function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        try {
            const [txns, cats] = await Promise.all([
                api.get('/transactions'),
                api.get('/categories').catch(() => []),
            ]);
            setTransactions(Array.isArray(txns) ? txns : []);
            setCategories(Array.isArray(cats) ? cats : []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError('');
        setShowForm(true);
    };

    const openEdit = (t) => {
        setEditingId(t.id);
        setForm({
            amount: t.amount,
            date: new Date(t.date).toISOString().split('T')[0],
            description: t.description || '',
            categoryId: t.categoryId || '',
        });
        setError('');
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        const payload = {
            amount: form.amount,
            date: form.date,
            description: form.description,
            categoryId: form.categoryId || null,
        };
        try {
            if (editingId) {
                await api.put(`/transactions/${editingId}`, payload);
                setNotice('Transaction updated');
            } else {
                await api.post('/transactions', payload);
                setNotice('Transaction added');
            }
            setShowForm(false);
            setForm(emptyForm);
            setEditingId(null);
            fetchData();
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await api.del(`/transactions/${id}`);
            setTransactions((prev) => prev.filter((t) => t.id !== id));
        } catch (e) {
            setError(e.message);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.upload('/transactions/upload', formData);
            setNotice(res.message || 'CSV imported');
            fetchData();
        } catch (err) {
            setError(err.message || 'Failed to import CSV');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Transactions</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your income and expenses.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm disabled:opacity-50">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Importing...' : 'Import CSV'}
                    </button>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add New
                    </button>
                </div>
            </header>

            {notice && (
                <div className="mb-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl text-sm border border-emerald-200 dark:border-emerald-500/20 flex justify-between items-center">
                    {notice}
                    <button onClick={() => setNotice('')}><X className="w-4 h-4" /></button>
                </div>
            )}

            {showForm && (
                <div className="mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
                    {error && <p className="text-sm text-rose-500 mb-3 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>}
                    <form className="grid grid-cols-1 md:grid-cols-5 gap-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Date</label>
                            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
                            <input type="text" required placeholder="e.g. Groceries at Whole Foods" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Category</label>
                            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100">
                                <option value="">Uncategorized</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Amount</label>
                            <input type="number" step="0.01" required placeholder="0.00 (use - for expense)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div className="md:col-span-5 flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">Cancel</button>
                            <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingId ? 'Save Changes' : 'Save Transaction'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 min-w-[300px]">Description</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan="5" className="px-6"><SkeletonRow /></td></tr>
                                ))
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <p className="text-zinc-500 font-medium">No transactions found</p>
                                        <p className="text-zinc-400 text-xs mt-1">Add one manually or upload a CSV (columns: Date, Description, Amount) to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{t.description || '—'}</td>
                                        <td className="px-6 py-4">
                                            {t.category ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">{t.category.name}</span>
                                            ) : (
                                                <span className="text-zinc-400 text-xs">Uncategorized</span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-semibold ${t.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {t.amount < 0 ? '-' : '+'}{fmt(Math.abs(t.amount))}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEdit(t)} className="p-1.5 text-zinc-400 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
