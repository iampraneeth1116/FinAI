"use client";
import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { downloadReport } from '../lib/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ReportExport() {
    const now = new Date();
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [busy, setBusy] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const handleExport = async (format) => {
        setBusy(format);
        const ext = format === 'pdf' ? 'pdf' : 'csv';
        try {
            await downloadReport(
                `/reports/monthly.${ext}?month=${month}&year=${year}`,
                `finai-report-${year}-${String(month).padStart(2, '0')}.${ext}`
            );
            setOpen(false);
        } catch (e) {
            alert(`Export failed: ${e.message}`);
        } finally {
            setBusy('');
        }
    };

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Export Report
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-lg p-4 z-20">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Report period</p>
                    <div className="flex gap-2 mb-4">
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100">
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                            className="w-24 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-2 text-sm outline-none text-zinc-900 dark:text-zinc-100">
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button onClick={() => handleExport('pdf')} disabled={!!busy}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors disabled:opacity-50">
                        {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Download PDF
                    </button>
                    <button onClick={() => handleExport('csv')} disabled={!!busy}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors disabled:opacity-50">
                        {busy === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        Download CSV
                    </button>
                </div>
            )}
        </div>
    );
}
