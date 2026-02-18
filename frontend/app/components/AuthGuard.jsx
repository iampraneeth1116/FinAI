"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PUBLIC_ROUTES = ['/login', '/register'];

export default function AuthGuard({ children }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (PUBLIC_ROUTES.includes(pathname)) return;
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/login');
        }
    }, [pathname, router]);

    return children;
}
