import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function PaymentStatus({ type, title, message, onRetry }) {
    const configs = {
        processing: {
            icon: <Loader2 size={44} className="animate-spin text-primary-600" />,
            titleColor: 'text-slate-900',
            bgColor: 'bg-white'
        },
        success: {
            icon: <CheckCircle2 size={44} className="text-emerald-600" />,
            titleColor: 'text-slate-900',
            bgColor: 'bg-emerald-50/30'
        },
        error: {
            icon: <AlertCircle size={44} className="text-rose-500" />,
            titleColor: 'text-slate-900',
            bgColor: 'bg-rose-50/30'
        }
    };

    const config = configs[type];

    return (
        <div className={`p-12 flex flex-col items-center text-center rounded-3xl ${config.bgColor}`}>
            <div className="mb-6">{config.icon}</div>
            <h3 className={`text-2xl font-black ${config.titleColor} mb-2 tracking-tight`}>{title}</h3>
            <p className="text-slate-500 text-sm max-w-[200px]">{message}</p>

            {type === 'error' && (
                <button
                    onClick={onRetry}
                    className="mt-6 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}
