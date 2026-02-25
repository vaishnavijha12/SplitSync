import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
    Plus,
    Users,
    Settings,
    Receipt,
    ArrowRight,
    PieChart,
    Calendar,
    CheckCircle2,
    MoreVertical,
    Banknote,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import AddExpenseModal from '../components/AddExpenseModal';
import SettlementModal from '../features/settlement/SettlementModal';

const ExpenseItem = ({ expense, user }) => {
    const isPayer = expense.paid_by === user?.id;
    const splitAmount = (expense.splits || []).find(s => s.user_id === user?.id)?.owed_amount || 0;

    return (
        <div className="group relative pl-8 pb-8 last:pb-0">
            {/* Timeline Connector */}
            <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-100 group-last:hidden"></div>

            {/* Date Badge */}
            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 z-10 shadow-sm">
                {new Date(expense.date).getDate()}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-card transition-all duration-300 group-hover:-translate-y-0.5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${isPayer ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                            <Receipt size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg">{expense.title}</h4>
                            <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold uppercase text-[10px] tracking-wide">
                                    {isPayer ? 'YOU PAID' : `${(expense.paid_by_name || 'Someone').split(' ')[0]} PAID`}
                                </span>
                                • {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">₹{(expense.amount / 100).toFixed(2)}</p>
                        {!isPayer ? (
                            <p className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg inline-block mt-1">
                                You owe ₹{(splitAmount / 100).toFixed(2)}
                            </p>
                        ) : (
                            <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block mt-1">
                                You lent ₹{((expense.amount - splitAmount) / 100).toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function GroupPage() {
    const { id } = useParams(); // groupId
    const { socket } = useSocket();
    const { user } = useAuth(); // for checking splits

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showSettle, setShowSettle] = useState(null); // settlement object

    const fetchData = async () => {
        try {
            const [gRes, eRes, bRes, sRes] = await Promise.all([
                api.get(`/groups/${id}`),
                api.get(`/expenses?group_id=${id}`),
                api.get(`/groups/${id}/balances`),
                api.get(`/groups/${id}/settlements`),
            ]);
            setGroup(gRes.data);
            setExpenses(eRes.data);
            setBalances(bRes.data);
            setSettlements(sRes.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load group data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!socket) return;
        socket.emit('join_group', id);

        const handleUpdate = () => {
            fetchData(); // Reload all data
        };

        socket.on('expense:new', handleUpdate);
        socket.on('expense:update', handleUpdate);
        socket.on('expense:delete', handleUpdate);
        socket.on('payment:new', handleUpdate);

        return () => {
            socket.emit('leave_group', id);
            socket.off('expense:new', handleUpdate);
            socket.off('expense:update', handleUpdate);
            socket.off('expense:delete', handleUpdate);
            socket.off('payment:new', handleUpdate);
        };
    }, [socket, id]);

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
        </div>
    );

    if (!group) return <div className="text-center p-20 text-slate-500">Group not found</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Group Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-violet-100 rounded-3xl flex items-center justify-center text-4xl font-black text-primary-600 shadow-float shadow-primary-500/10">
                        {group.name ? group.name[0] : '?'}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">{group.name || 'Untitled Group'}</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-full w-fit">
                            <Users size={16} />
                            <span>{group.members?.length || 0} members</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        <Settings size={18} />
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                    <button
                        onClick={() => setShowAddExpense(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Add Expense</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                {/* Left: Expenses Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Calendar size={20} className="text-slate-400" />
                            Recent Activity
                        </h2>
                        <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex gap-2">
                            <button className="p-1 text-slate-400 hover:text-slate-600 transition">
                                <Search size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 min-h-[400px]">
                        {expenses.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Receipt size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">No expenses yet</h3>
                                <p className="text-slate-400 text-sm">Add an expense to start tracking splits.</p>
                            </div>
                        ) : (
                            <div className="space-y-0 relative">
                                {expenses.map(expense => (
                                    <ExpenseItem key={expense.id} expense={expense} user={user} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Sticky Stats & Settlements */}
                <div className="space-y-6 lg:sticky lg:top-24">
                    {/* Smart Settlement Card */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-card hover:shadow-float transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <PieChart size={20} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">Smart Settlement</h3>
                        </div>

                        {settlements.length === 0 ? (
                            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl text-sm font-bold">
                                <CheckCircle2 size={20} />
                                All settled up! No debts.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {settlements.map((s, i) => {
                                    const isPayer = s.from?.id === user?.id;
                                    if (!isPayer) return null; // Show only my debts to pay

                                    return (
                                        <div key={i} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                                                <span>You owe</span>
                                                <span className="font-bold text-slate-900">{s.to.name}</span>
                                            </div>
                                            <div className="text-2xl font-black text-slate-900 tracking-tight">
                                                ₹{(s.amount / 100).toFixed(2)}
                                            </div>
                                            <button
                                                onClick={() => setShowSettle(s)}
                                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Banknote size={16} /> Pay Now
                                            </button>
                                        </div>
                                    );
                                })}

                                {settlements.every(s => s.from?.id !== user?.id) && (
                                    <div className="text-center p-4 text-sm text-slate-400 font-medium">
                                        You don't owe anyone.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Balances List */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">Balances</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                            {balances.map(b => (
                                <div key={b.user_id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                            {b.name[0]}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{b.name}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${b.net_balance > 0 ? 'text-emerald-500' : b.net_balance < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {b.net_balance > 0 ? '+' : ''}₹{(b.net_balance / 100).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showAddExpense && (
                <AddExpenseModal
                    groupId={id}
                    members={group.members}
                    onClose={() => setShowAddExpense(false)}
                    onCreated={() => {
                        setShowAddExpense(false);
                        fetchData();
                    }}
                />
            )}

            {showSettle && (
                <SettlementModal
                    settlement={showSettle}
                    groupId={id}
                    onClose={() => setShowSettle(null)}
                    onSettled={() => {
                        setShowSettle(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}
