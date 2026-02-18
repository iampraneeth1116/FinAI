"use client";
import { Bell, Search, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ServerStatus from './ServerStatus';
import { useMobileNav } from '../context/MobileNavContext';

export default function Navbar() {
    const pathname = usePathname();
    const { setIsMobileNavOpen } = useMobileNav();

    if (pathname === '/login' || pathname === '/register') return null;

    return (
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileNavOpen(true)} className="md:hidden text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                    <Menu className="w-6 h-6" />
                </button>
                <ServerStatus />
                <div className="relative hidden sm:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent rounded-full text-sm focus:bg-white dark:focus:bg-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all w-64 text-zinc-800 dark:text-zinc-200 placeholder-zinc-500"
                    />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-sm md:hidden"></div>
            </div>
        </header>
    );
}
