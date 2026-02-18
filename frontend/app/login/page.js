"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fillDemo = () => {
        setEmail('alice@example.com');
        setPassword('password123');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.dispatchAuthEvent && window.dispatchAuthEvent(); // trigger nav update if needed
            router.push('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Sign in to your account
                </h2>
                <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    Or{' '}
                    <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
                        create a new account
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-zinc-200 dark:border-zinc-800">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {/* Demo credentials banner */}
                        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3">
                            <div>
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Demo Account</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-0.5">alice@example.com · password123</p>
                            </div>
                            <button
                                type="button"
                                onClick={fillDemo}
                                className="text-xs font-medium px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                            >
                                Use Demo
                            </button>
                        </div>

                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 p-3 rounded-lg text-sm border border-rose-200 dark:border-rose-500/20">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Email address
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-zinc-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-10 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-950 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-2 px-3 text-sm transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-zinc-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-10 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-950 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-2 px-3 text-sm transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
