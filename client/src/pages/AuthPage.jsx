import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login, signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(form.email, form.password);
                toast.success('Welcome back! 👋');
            } else {
                await signup({ name: form.name, email: form.email, password: form.password });
                toast.success(`Welcome to SplitSync! 🎉`);
            }
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background">
            {/* Left: Brand Panel */}
            <div className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-14 relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute -top-64 -left-32 w-[500px] h-[500px] bg-primary-700/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-violet-700/20 rounded-full blur-3xl pointer-events-none"></div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M4 12L20 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">SplitSync</span>
                </div>

                {/* Illustration / Stats */}
                <div className="relative z-10 space-y-6">
                    <h1 className="text-5xl font-black leading-tight tracking-tighter text-white">
                        Split the bill. <br />
                        <span className="text-gradient bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
                            Keep the peace.
                        </span>
                    </h1>
                    <p className="text-slate-400 text-xl leading-relaxed font-medium">
                        The modern way to share expenses with friends, family, and teammates — powered by AI settlement.
                    </p>

                    <div className="flex gap-8 pt-4">
                        {[['100%', 'Debt free'], ['AI', 'Smart Splits'], ['₹0', 'No fees']].map(([stat, label]) => (
                            <div key={label}>
                                <p className="text-2xl font-black text-white">{stat}</p>
                                <p className="text-xs font-medium text-slate-400 mt-1">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative z-10 text-xs text-slate-500">&copy; 2025 SplitSync Inc. All rights reserved.</p>
            </div>

            {/* Right: Auth Form */}
            <div className="flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 12L20 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" /></svg>
                        </div>
                        <span className="text-xl font-bold text-slate-900">SplitSync</span>
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-slate-900">
                            {mode === 'login' ? 'Sign in' : 'Create account'}
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium">
                            {mode === 'login' ? 'Welcome back! Enter your details.' : 'Join thousands of happy splitters.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                                <input type="text" required autoFocus placeholder="Your name"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all text-slate-900 font-medium"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                            <input type="email" required placeholder="you@example.com" autoFocus={mode === 'login'}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all text-slate-900 font-medium"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-12 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all text-slate-900 font-medium"
                                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-3 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                <>
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500">
                        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setForm({ name: '', email: '', password: '' }); }}
                            className="ml-2 text-primary-600 font-bold hover:text-primary-700 transition-colors">
                            {mode === 'login' ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
