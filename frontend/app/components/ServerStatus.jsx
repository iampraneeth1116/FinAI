"use client";
import { useState, useEffect } from 'react';

export default function ServerStatus() {
    const [status, setStatus] = useState('Checking API...');

    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        fetch(`${base}/health`)
            .then(res => res.json())
            .then(data => setStatus('API connected'))
            .catch(err => setStatus('API disconnected'));
    }, []);

    return (
        <div className={`hidden md:flex text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${status === 'API connected'
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
            : status === 'API disconnected'
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
            }`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 my-auto ${status === 'API connected' ? 'bg-emerald-500' : status === 'API disconnected' ? 'bg-rose-500' : 'bg-zinc-400'
                }`}></span>
            {status}
        </div>
    );
}
