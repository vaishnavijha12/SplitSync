import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, TrendingUp, Smartphone, CheckCircle2, X, Save } from 'lucide-react';

const TransactionRow = ({ tx }) => {
    const isCredit = tx.type === 'credit';
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors group cursor-default">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{tx.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(tx.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <p className={`text-sm font-black ${isCredit ? 'text-emerald-600' : 'text-rose-500'} shrink-0`}>
                {isCredit ? '+' : '-'}₹{(tx.amount / 100).toFixed(2)}
            </p>
        </div>
    );
};

export default function WalletPage() {
    const { user, updateBalance } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositing, setDepositing] = useState(false);
    const [showDeposit, setShowDeposit] = useState(false);

    // UPI ID Management
    const [upiId, setUpiId] = useState(user?.upi_id || '');
    const [savingUpi, setSavingUpi] = useState(false);
    const [upiSaved, setUpiSaved] = useState(false);
    const [editingUpi, setEditingUpi] = useState(false);

    useEffect(() => {
        api.get('/wallet/transactions')
            .then(res => setTransactions(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));

        // Fetch current UPI ID from profile
        api.get(`/users/${user?.id}`).then(res => {
            if (res.data?.upi_id) setUpiId(res.data.upi_id);
        }).catch(() => { });
    }, []);

    const handleDeposit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);
        if (!amount || amount <= 0) return toast.error('Enter a valid amount');
        setDepositing(true);
        try {
            const res = await api.post('/wallet/deposit', { amount });
            updateBalance(res.data.balance);
            setTransactions(prev => [res.data.transaction, ...prev]);
            toast.success(`₹${amount.toFixed(2)} deposited! 🎉`);
            setDepositAmount('');
            setShowDeposit(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Deposit failed');
        } finally {
            setDepositing(false);
        }
    };

    const handleSaveUpi = async () => {
        if (!upiId || !upiId.includes('@')) return toast.error('Enter a valid UPI ID (e.g. name@upi)');
        setSavingUpi(true);
        try {
            await api.put('/payments/upi/set-upi-id', { upi_id: upiId });
            setUpiSaved(true);
            setEditingUpi(false);
            toast.success('UPI ID saved! ✅');
            setTimeout(() => setUpiSaved(false), 3000);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save UPI ID');
        } finally {
            setSavingUpi(false);
        }
    };

    const balance = (user?.wallet_balance || 0) / 100;
    const totalIn = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0) / 100;
    const totalOut = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0) / 100;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Wallet</h1>
                <p className="text-slate-500">Manage your in-app balance and payment settings</p>
            </div>

            {/* Hero Balance Card */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-primary-950 text-white overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-600/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Wallet size={20} />
                            </div>
                            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Available Balance</p>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                            <TrendingUp size={14} className="text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-300">Active</span>
                        </div>
                    </div>

                    <p className="text-5xl font-black tracking-tight mb-8">₹{balance.toFixed(2)}</p>

                    <div className="flex items-center justify-between">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Total In</p>
                                <p className="text-base font-bold text-emerald-400">+₹{totalIn.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Total Out</p>
                                <p className="text-base font-bold text-rose-400">-₹{totalOut.toFixed(2)}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDeposit(v => !v)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 active:scale-95 transition-all shadow-lg"
                        >
                            <Plus size={16} /> Add Money
                        </button>
                    </div>
                </div>
            </div>

            {/* Deposit Form */}
            {showDeposit && (
                <form onSubmit={handleDeposit} className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-card">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                        <input type="number" step="0.01" min="1" max="100000" required autoFocus
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none font-bold text-lg"
                            placeholder="Enter amount"
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={depositing}
                        className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-200 disabled:opacity-50">
                        {depositing ? 'Depositing...' : 'Deposit'}
                    </button>
                </form>
            )}

            {/* UPI ID Settings Card */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900">UPI Payment ID</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Others will use this to pay you via UPI</p>
                        </div>
                    </div>
                    {!editingUpi && (
                        <button
                            onClick={() => setEditingUpi(true)}
                            className="text-xs font-bold text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-all"
                        >
                            {upiId ? 'Change' : 'Add UPI ID'}
                        </button>
                    )}
                </div>

                {!editingUpi ? (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                        {upiId ? (
                            <>
                                <span className="font-mono font-bold text-slate-800 flex-1">{upiId}</span>
                                {upiSaved && <span className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={13} /> Saved</span>}
                            </>
                        ) : (
                            <span className="text-slate-400 text-sm">No UPI ID set. Add one to receive payments.</span>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <input
                            type="text"
                            autoFocus
                            placeholder="yourname@upi"
                            value={upiId}
                            onChange={e => setUpiId(e.target.value)}
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none font-mono text-sm"
                        />
                        <button onClick={() => setEditingUpi(false)} className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all">
                            <X size={16} />
                        </button>
                        <button onClick={handleSaveUpi} disabled={savingUpi}
                            className="px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                            <Save size={16} /> {savingUpi ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                )}
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 text-lg">Transaction History</h2>
                    <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-bold text-slate-500">{transactions.length} entries</span>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">No transactions yet</p>
                        <p className="text-sm mt-1">Add money to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 px-2 py-2">
                        {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
