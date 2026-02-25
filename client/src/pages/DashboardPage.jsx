import React, { useEffect, useState } from 'react';
import api from '../api/client';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    MoreHorizontal,
    Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import PendingUPIApprovals from '../components/PendingUPIApprovals';

const StatCard = ({ title, amount, type, icon: Icon }) => {
    const isPositive = type === 'positive';
    const isNeutral = type === 'neutral';
    const colorClass = isPositive ? 'text-emerald-600 bg-emerald-50' : isNeutral ? 'text-primary-600 bg-primary-50' : 'text-rose-600 bg-rose-50';

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-card transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={24} />
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={20} />
                </button>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">₹{(amount / 100).toFixed(2)}</h3>
            </div>
        </div>
    );
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [groupsRes, balancesRes] = await Promise.all([
                    api.get('/groups'),
                    api.get('/users/me/balances'),
                ]);
                setData({ groups: groupsRes.data, ...balancesRes.data });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-3xl" />)}
        </div>
    );

    return (
        <div className="space-y-8">
            <PendingUPIApprovals />
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Welcome back, {user?.name?.split(' ')[0]}! 👋</p>
                </div>
                <div className="hidden md:flex gap-3">
                    <select className="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-3 py-2 outline-none hover:border-slate-300 focus:ring-2 focus:ring-primary-100 transition-all">
                        <option>This Month</option>
                        <option>Last Month</option>
                    </select>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Balance"
                    amount={data?.net_balance || 0}
                    type={(data?.net_balance || 0) >= 0 ? 'positive' : 'negative'}
                    icon={Wallet}
                />
                <StatCard
                    title="You Owe"
                    amount={data?.total_i_owe || 0}
                    type="negative"
                    icon={TrendingDown}
                />
                <StatCard
                    title="You are Owed"
                    amount={data?.total_owed_to_me || 0}
                    type="positive"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Wallet Funds"
                    amount={user?.wallet_balance || 0}
                    type="neutral"
                    icon={Wallet}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Groups */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Your Groups</h2>
                        <Link to="/groups" className="text-sm font-semibold text-primary-600 hover:text-primary-700">View All</Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data?.groups?.length > 0 ? data.groups.slice(0, 4).map(group => (
                            <Link key={group.id} to={`/groups/${group.id}`} className="group relative bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-card hover:-translate-y-1 transition-all duration-300">
                                <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-50"></div>
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-indigo-50 text-primary-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="font-bold text-lg">{group.name ? group.name[0] : '?'}</span>
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1">{group.name}</h3>
                                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{group.description || 'No description'}</p>
                                <div className="flex items-center text-xs font-medium text-slate-400 gap-2">
                                    <Users size={14} />
                                    <span>{group.member_count || 1} Members</span>
                                </div>
                            </Link>
                        )) : (
                            <div className="col-span-2 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                    <Users size={20} />
                                </div>
                                <p className="text-slate-500 font-medium">No groups yet</p>
                                <p className="text-xs text-slate-400 mb-4">Create a group to start sharing expenses</p>
                            </div>
                        )}

                        {/* Create New Group Card */}
                        <button className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 text-slate-400 hover:text-primary-600 transition-all duration-300 group h-full min-h-[180px]">
                            <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center mb-3 shadow-sm transition-colors">
                                <Users size={20} />
                            </div>
                            <span className="font-semibold text-sm">Create New Group</span>
                        </button>
                    </div>
                </div>

                {/* Recent Activity (Feed) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-50 to-transparent rounded-bl-full opacity-50"></div>

                        <div className="space-y-6 relative z-10">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="flex flex-col items-center h-full">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${i % 2 === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {i % 2 === 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                        </div>
                                        {i !== 2 && <div className="w-0.5 h-full bg-slate-100 -my-2"></div>}
                                    </div>
                                    <div className="pb-6">
                                        <p className="text-sm font-medium text-slate-800">
                                            {i % 2 === 0 ? 'You received payment' : 'You paid for Dinner'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                                    </div>
                                </div>
                            ))}

                            <button className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition-colors">
                                View All Activity
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
