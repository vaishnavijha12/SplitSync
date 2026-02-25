import React, { useState } from 'react';
import { Smartphone, Copy, Check, Clock, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const UPIQRCode = ({ value, size = 180 }) => {
    const encoded = encodeURIComponent(value);
    return (
        <div className="flex flex-col items-center">
            <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=ffffff&color=1e293b&margin=10`}
                alt="UPI QR Code"
                className="rounded-2xl shadow-lg border border-slate-100 mb-3"
                width={size}
                height={size}
            />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scan with any UPI app</p>
        </div>
    );
};

const AppShortcut = ({ name, emoji, upiLink, colorClass }) => (
    <a
        href={upiLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-slate-100 hover:border-${colorClass}-200 hover:bg-${colorClass}-50 hover:scale-105 transition-all active:scale-95`}
    >
        <span className="text-2xl">{emoji}</span>
        <span className="text-[10px] font-bold text-slate-600">{name}</span>
    </a>
);

export default function UPIDisplay({ upiData, amount, onConfirm, isConfirming }) {
    const [copied, setCopied] = useState(false);
    const amountStr = (amount / 100).toFixed(2);

    const handleCopy = () => {
        navigator.clipboard.writeText(upiData.upi_link);
        setCopied(true);
        toast.success('UPI link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* QR Card */}
            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 flex items-center justify-center">
                <UPIQRCode value={upiData.upi_link} />
            </div>

            {/* Recipient Info */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700 font-bold">RECIPIENT</span>
                    <span className="font-bold text-slate-900">{upiData.to_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700 font-bold">UPI ID</span>
                    <span className="font-mono font-bold text-slate-700 select-all">{upiData.upi_id}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-100">
                    <span className="text-emerald-700 font-bold">AMOUNT</span>
                    <span className="text-lg font-black text-slate-900">₹{amountStr}</span>
                </div>
            </div>

            {/* App Launchers */}
            <div className="grid grid-cols-3 gap-3">
                <AppShortcut name="GPay" emoji="🔹" colorClass="blue" upiLink={upiData.upi_link} />
                <AppShortcut name="PhonePe" emoji="🟣" colorClass="purple" upiLink={upiData.upi_link.replace('upi://', 'phonepe://')} />
                <AppShortcut name="Paytm" emoji="🔵" colorClass="sky" upiLink={upiData.upi_link.replace('upi://', 'paytmmp://')} />
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <button
                    onClick={handleCopy}
                    className="w-full py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy UPI Link'}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isConfirming}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-sm shadow-xl shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isConfirming ? 'RECORDING...' : '✅ I HAVE PAID'}
                </button>
            </div>
        </div>
    );
}
