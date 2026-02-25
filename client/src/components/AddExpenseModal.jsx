import React, { useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { X, Receipt, Sparkles, Upload, Loader2, DollarSign, Users, Calculator, Percent } from 'lucide-react';

export default function AddExpenseModal({ groupId, members, onClose, onCreated }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        amount: '',
        split_type: 'equal',
        date: new Date().toISOString().split('T')[0],
    });
    const [customSplits, setCustomSplits] = useState(
        members.map(m => ({ user_id: m.id, name: m.name, value: '' }))
    );
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleOCR = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setScanning(true);
        const formData = new FormData();
        formData.append('bill', file);
        try {
            const res = await api.post('/ocr/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const { suggested_expense } = res.data;
            setForm(prev => ({ ...prev, title: suggested_expense.title, amount: suggested_expense.amount.toString() }));
            toast.success('Bill scanned successfully! ✨');
        } catch (err) {
            toast.error('Failed to scan bill');
        } finally {
            setScanning(false);
        }
    };

    const handleSplitChange = (userId, val) => {
        setCustomSplits(prev => prev.map(s => s.user_id === userId ? { ...s, value: val } : s));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.amount) return toast.error('Title and amount are required');
        setLoading(true);
        try {
            let splitsData;
            if (form.split_type === 'equal') {
                splitsData = members.map(m => m.id);
            } else if (form.split_type === 'unequal') {
                splitsData = customSplits.map(s => ({ user_id: s.user_id, amount: s.value || '0' }));
            } else {
                splitsData = customSplits.map(s => ({ user_id: s.user_id, percentage: s.value || '0' }));
            }
            await api.post('/expenses', { ...form, group_id: groupId, splits: splitsData });
            toast.success('Expense added! 💸');
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    const splitTypes = [
        { id: 'equal', icon: Users, label: 'Equal' },
        { id: 'unequal', icon: Calculator, label: 'Custom' },
        { id: 'percentage', icon: Percent, label: 'Percent' },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <Receipt size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Add Expense</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* OCR Scanner */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600">
                                {scanning ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">AI Receipt Scanner</p>
                                <p className="text-xs text-slate-500">Auto-fill from a photo</p>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOCR} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={scanning}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50">
                            <Upload size={14} /> {scanning ? 'Scanning...' : 'Upload Bill'}
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description *</label>
                                <input type="text" required placeholder="e.g. Dinner at Olive" autoFocus
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all text-sm font-medium"
                                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Amount *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                    <input type="number" step="0.01" required placeholder="0.00"
                                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all font-bold text-lg"
                                        value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                                <input type="date"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none transition-all text-sm"
                                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                        </div>

                        {/* Right Column: Split */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Split Type</label>
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                    {splitTypes.map(type => (
                                        <button key={type.id} type="button"
                                            onClick={() => setForm({ ...form, split_type: type.id })}
                                            className={`flex-1 flex flex-col items-center py-2.5 rounded-lg transition-all text-xs font-bold gap-1
                        ${form.split_type === type.id ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                            <type.icon size={16} />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 max-h-[220px] overflow-y-auto space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Members</p>
                                {customSplits.map(s => (
                                    <div key={s.user_id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{s.name[0]}</div>
                                            <span className="text-sm text-slate-700 truncate font-medium">{s.name}</span>
                                        </div>
                                        {form.split_type !== 'equal' ? (
                                            <div className="relative w-24">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                                    {form.split_type === 'percentage' ? '%' : '₹'}
                                                </span>
                                                <input type="number" placeholder="0"
                                                    className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-primary-400 outline-none"
                                                    value={s.value} onChange={(e) => handleSplitChange(s.user_id, e.target.value)} />
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">EVEN</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 flex gap-4 bg-white">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} onClick={handleSubmit}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50">
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Save Expense'}
                    </button>
                </div>
            </div>
        </div>
    );
}
