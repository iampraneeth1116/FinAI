"use client";
import { useState, useEffect } from 'react';
import { User, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Settings() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileMsg, setProfileMsg] = useState(null); // { type: 'success'|'error', text }
    const [passwordMsg, setPasswordMsg] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        fetch(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                if (data.name) setName(data.name);
                if (data.email) setEmail(data.email);
            })
            .catch(console.error);
    }, []);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMsg(null);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/users/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            // Update localStorage too
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...stored, name }));
            setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.message });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPasswordMsg(null);
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }
        setPasswordLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/users/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordMsg({ type: 'error', text: err.message });
        } finally {
            setPasswordLoading(false);
        }
    };

    const Feedback = ({ msg }) => {
        if (!msg) return null;
        return (
            <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl mt-4 ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'}`}>
                {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {msg.text}
            </div>
        );
    };

    const inputClass = "w-full bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-2.5 text-sm outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all";
    const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Settings</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your account and preferences.</p>
            </header>

            <div className="max-w-2xl space-y-6">
                {/* Profile Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <User className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Profile Details</h2>
                            <p className="text-xs text-zinc-500">Update your name and personal info.</p>
                        </div>
                    </div>
                    <form onSubmit={handleProfileSave} className="p-6 space-y-4">
                        <div>
                            <label className={labelClass}>Full Name</label>
                            <input type="text" required className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                        </div>
                        <div>
                            <label className={labelClass}>Email Address</label>
                            <input type="email" disabled className={`${inputClass} opacity-50 cursor-not-allowed`} value={email} />
                            <p className="text-xs text-zinc-400 mt-1">Email cannot be changed.</p>
                        </div>
                        <Feedback msg={profileMsg} />
                        <div className="flex justify-end">
                            <button type="submit" disabled={profileLoading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                                <Save className="w-4 h-4" />
                                {profileLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Password Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Lock className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Change Password</h2>
                            <p className="text-xs text-zinc-500">Update your account password.</p>
                        </div>
                    </div>
                    <form onSubmit={handlePasswordSave} className="p-6 space-y-4">
                        <div>
                            <label className={labelClass}>Current Password</label>
                            <input type="password" required className={inputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        <div>
                            <label className={labelClass}>New Password</label>
                            <input type="password" required className={inputClass} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        <div>
                            <label className={labelClass}>Confirm New Password</label>
                            <input type="password" required className={inputClass} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        <Feedback msg={passwordMsg} />
                        <div className="flex justify-end">
                            <button type="submit" disabled={passwordLoading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                                <Lock className="w-4 h-4" />
                                {passwordLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Danger Zone */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-rose-200 dark:border-rose-500/20 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-rose-100 dark:border-rose-500/20">
                        <h2 className="font-semibold text-rose-600 text-sm">Danger Zone</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Irreversible actions — proceed with caution.</p>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Delete Account</p>
                            <p className="text-xs text-zinc-400 mt-0.5">Permanently remove your account and all your data.</p>
                        </div>
                        <button className="px-4 py-2 border border-rose-300 dark:border-rose-500/30 text-rose-600 text-sm font-medium rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
