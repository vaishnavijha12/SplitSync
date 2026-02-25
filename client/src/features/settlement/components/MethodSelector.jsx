import React from 'react';
import { Wallet, Smartphone, ArrowRight } from 'lucide-react';

const MethodCard = ({ title, subtitle, icon: Icon, badge, onClick, disabled, colorClass }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all
            ${disabled
                ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50'
                : `border-slate-200 hover:border-${colorClass}-400 hover:bg-${colorClass}-50 group`}`}
    >
        <div className={`w-12 h-12 bg-${colorClass}-50 text-${colorClass}-600 rounded-xl flex items-center justify-center group-hover:bg-${colorClass}-100 transition-colors`}>
            <Icon size={22} />
        </div>
        <div className="flex-1">
            <p className="font-bold text-slate-900">{title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {badge ? (
            <span className={`text-[10px] font-bold ${badge.color} px-2 py-1 rounded-lg`}>{badge.text}</span>
        ) : (
            <ArrowRight size={18} className={`text-slate-300 group-hover:text-${colorClass}-500 transition-colors`} />
        )}
    </button>
);

export default function MethodSelector({ walletBalance, amount, onSelectWallet, onSelectUPI }) {
    const isInsufficient = walletBalance < amount;

    return (
        <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Choose payment method</p>

            <MethodCard
                title="SplitSync Wallet"
                subtitle={`Balance: ₹${(walletBalance / 100).toFixed(2)}`}
                icon={Wallet}
                colorClass="primary"
                onClick={onSelectWallet}
                disabled={isInsufficient}
                badge={isInsufficient ? { text: 'LOW BALANCE', color: 'bg-rose-50 text-rose-400' } : null}
            />

            <MethodCard
                title="UPI / Payment Apps"
                subtitle="GPay, PhonePe, Paytm & more"
                icon={Smartphone}
                colorClass="emerald"
                onClick={onSelectUPI}
            />
        </div>
    );
}
