"use client";
import { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Copy, Sparkle, ChevronDown } from 'lucide-react';

const ICONS = { amount_spike: AlertTriangle, duplicate: Copy, new_merchant: Sparkle };
const SEVERITY_STYLES = {
    high: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400',
    medium: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400',
    low: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400',
};

export default function AlertsPanel({ data, loading }) {
    const [expanded, setExpanded] = useState(false);
    const alerts = data?.alerts || [];
    const visible = expanded ? alerts : alerts.slice(0, 3);

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="skeleton h-5 w-40 mb-4" />
                <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}</div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                {alerts.length > 0 ? <ShieldAlert className="w-4 h-4 text-rose-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Anomaly Alerts</h3>
                {alerts.length > 0 && (
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        {alerts.length}
                    </span>
                )}
            </div>

            {alerts.length === 0 ? (
                <div className="h-24 flex flex-col items-center justify-center text-center text-zinc-400">
                    <ShieldCheck className="w-7 h-7 mb-2 text-emerald-400" />
                    <p className="text-sm">No unusual activity detected.</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2.5">
                        {visible.map((a, i) => {
                            const Icon = ICONS[a.type] || AlertTriangle;
                            return (
                                <div key={a.id || i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.low}`}>
                                    <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-semibold">{a.title}</p>
                                        <p className="text-xs opacity-90 mt-0.5">{a.message}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {alerts.length > 3 && (
                        <button onClick={() => setExpanded(!expanded)} className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
                            {expanded ? 'Show less' : `Show ${alerts.length - 3} more`}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
