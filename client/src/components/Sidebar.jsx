import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Library,
    LayoutDashboard,
    Users,
    Wallet,
    Settings,
    LogOut,
    PieChart
} from 'lucide-react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/groups', icon: Users, label: 'Groups' },
        { to: '/activity', icon: Library, label: 'Activity' },
        { to: '/wallet', icon: Wallet, label: 'My Wallet' },
        { to: '/settlements', icon: PieChart, label: 'Settlements' },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-20">
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-slate-100/50">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-primary-500/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 12L20 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">SplitSync</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
                    Menu
                </div>

                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
              ${isActive
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full" />
                                )}
                                <item.icon
                                    size={18}
                                    className={`transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                                />
                                {item.label}
                            </>
                        )}
                    </NavLink>
                ))}

                <div className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
                    General
                </div>

                <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all group"
                >
                    <Settings size={18} className="text-slate-400 group-hover:text-slate-600" />
                    Settings
                </button>
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-danger hover:shadow-sm transition-all"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
