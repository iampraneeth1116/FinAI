"use client";
import { Repeat } from 'lucide-react';
import { fmt } from '../lib/api';

const CADENCE_LABEL = {
    weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly',
    bimonthly: 'Every 2 months', quarterly: 'Quarterly', yearly: 'Yearly',
};

export default function RecurringCard({ data, loading }) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Recurring & Subscriptions</h3>
                </div>
                {!loading && data?.estimatedMonthlyCost > 0 && (
                    <span className="text-xs font-medium text-zinc-500">{fmt(data.estimatedMonthlyCost)}/mo</span>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="skeleton h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-28" /><div className="skeleton h-2.5 w-16" /></div>
                            <div className="skeleton h-4 w-12" />
                        </div>
                    ))}
                </div>
            ) : !data?.recurring?.length ? (
                <div className="h-32 flex flex-col items-center justify-center text-center text-zinc-400">
                    <Repeat className="w-7 h-7 mb-2 text-zinc-300" />
                    <p className="text-sm">No recurring charges detected yet.</p>
                    <p className="text-xs mt-0.5">Add a few months of transactions to surface subscriptions.</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                    {data.recurring.map((r, i) => (
                        <div key={`${r.merchant}-${i}`} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xs font-bold shrink-0 capitalize">
                                {r.description?.[0]?.toUpperCase() || '$'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate capitalize">{r.description}</p>
                                <p className="text-xs text-zinc-400">{CADENCE_LABEL[r.cadence] || r.cadence} · {r.occurrences}x</p>
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{fmt(r.averageAmount)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
