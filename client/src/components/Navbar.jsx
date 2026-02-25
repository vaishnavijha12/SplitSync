import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, Plus, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar({ onAddExpense }) {
    const { user } = useAuth();
    const [hasUnread, setHasUnread] = useState(true); // Mock status

    return (
        <header className="h-16 fixed top-0 right-0 left-0 md:left-64 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-10 px-4 md:px-8 flex items-center justify-between transition-all">
            {/* Mobile Menu & Search */}
            <div className="flex items-center gap-4 flex-1">
                <button className="md:hidden p-2 -ml-2 text-slate-500">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>

                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-lg text-slate-500 border border-transparent focus-within:border-primary-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100 transition-all w-64">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search groups or expenses..."
                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 md:gap-5">
                {/* Wallet Pill */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                    <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <Wallet size={10} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                        ₹{((user?.wallet_balance || 0) / 100).toFixed(2)}
                    </span>
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                    <Bell size={20} />
                    {hasUnread && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
                    )}
                </button>

                {/* Primary CTA */}
                <button
                    onClick={onAddExpense}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 hover:shadow-lg transition-all active:scale-95"
                >
                    <Plus size={16} />
                    <span>New Expense</span>
                </button>
            </div>
        </header>
    );
}
