"use client";
import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-6">
            <div className="text-center max-w-sm animate-fade-up">
                <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-9 h-9 text-zinc-400" />
                </div>
                <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">404</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mb-8">This page doesn't exist. Let's get you back on track.</p>
                <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors">
                    <Home className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
