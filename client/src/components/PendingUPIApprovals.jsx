import React, { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { Clock, CheckCircle2, XCircle, Bell } from 'lucide-react';

export default function PendingUPIApprovals() {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const fetchPending = () => {
        api.get('/payments/upi/pending')
            .then(res => setPending(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchPending();
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('upi:payer_confirmed', fetchPending);
        return () => socket.off('upi:payer_confirmed', fetchPending);
    }, [socket]);

    const handleApprove = async (id, fromName, amount) => {
        try {
            await api.post(`/payments/upi/approve/${id}`);
            setPending(prev => prev.filter(p => p.id !== id));
            toast.success(`Payment from ${fromName} approved! ✅`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to approve');
        }
    };

    const handleReject = async (id, fromName) => {
        try {
            await api.post(`/payments/upi/reject/${id}`);
            setPending(prev => prev.filter(p => p.id !== id));
            toast(`Payment from ${fromName} rejected.`, { icon: '❌' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to reject');
        }
    };

    if (loading || pending.length === 0) return null;

    return (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <Bell size={16} className="text-amber-500" />
                {pending.length} Pending Payment{pending.length > 1 ? 's' : ''} to Approve
            </div>

            {pending.map(p => (
                <div key={p.id} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-bold text-slate-900">{p.from_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                says they paid you via UPI
                                {p.group_name && <span className="ml-1 text-slate-500">• {p.group_name}</span>}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-slate-900">₹{(p.amount / 100).toFixed(2)}</p>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 mt-1">
                                <Clock size={9} /> PENDING
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleReject(p.id, p.from_name)}
                            className="flex-1 py-2 border border-rose-200 text-rose-500 text-sm font-bold rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            <XCircle size={15} /> Reject
                        </button>
                        <button
                            onClick={() => handleApprove(p.id, p.from_name, p.amount)}
                            className="flex-[2] py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                            <CheckCircle2 size={15} /> Approve Payment
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
