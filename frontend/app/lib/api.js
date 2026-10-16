// Centralized API client: injects the auth token, parses JSON, and surfaces
// backend error messages consistently so pages don't each reimplement fetch.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

export class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
    const token = getToken();
    const opts = { method, headers: { ...headers } };

    if (body instanceof FormData) {
        opts.body = body;
    } else if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, opts);

    // Session expired / invalid — bounce to login.
    if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
    }

    if (raw) {
        if (!res.ok) throw new ApiError('Request failed', res.status);
        return res;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(data.error || 'Something went wrong', res.status, data.details);
    }
    return data;
}

export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' }),
    upload: (path, formData) => request(path, { method: 'POST', body: formData }),
    // Returns the raw Response (used for file downloads).
    rawGet: (path) => request(path, { raw: true }),
};

// Trigger a browser download for a report endpoint (PDF/CSV) with auth.
export async function downloadReport(path, filename) {
    const res = await api.rawGet(path);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

// Shared currency formatter.
export const fmt = (n) =>
    `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
