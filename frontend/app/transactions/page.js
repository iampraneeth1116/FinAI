"use client";
import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Trash2, Edit2 } from 'lucide-react';

export default function Transactions() {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const fileInputRef = useRef(null);

    // Form State
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return; // Need to handle unauthorized state better eventually

            const res = await fetch(`${API_BASE}/transactions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ amount, date, description }),
            });

            if (res.ok) {
                setShowForm(false);
                setAmount('');
                setDate('');
                setDescription('');
                fetchTransactions();
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/transactions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                fetchTransactions();
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/transactions/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                alert('CSV Imported successfully!');
                fetchTransactions();
            } else {
                alert('Failed to import CSV');
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            // Reset input
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
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                    >
                        <Upload className="w-4 h-4" />
                        Import CSV
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add New
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">New Transaction</h2>
                    <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleAddTransaction}>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-zinc-900 dark:text-zinc-100"
                                value={date} onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Groceries at Whole Foods"
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-zinc-900 dark:text-zinc-100"
                                value={description} onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-zinc-900 dark:text-zinc-100"
                                value={amount} onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-4 flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Save Transaction
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
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-zinc-500">Loading transactions...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-zinc-500">
                                        No transactions found. Add one or upload a CSV to get started.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{t.description || '—'}</td>
                                        <td className="px-6 py-4">
                                            {t.category ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                                    {t.category.name}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-400 text-xs">Uncategorized</span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-semibold ${t.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-1.5 text-zinc-400 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
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
