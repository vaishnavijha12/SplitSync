import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, ArrowRight } from 'lucide-react';
import { useSettlementMachine } from './hooks/useSettlementMachine';
import { SettlementStates } from './types/SettlementTypes';

// Sub-components
import MethodSelector from './components/MethodSelector';
import PaymentStatus from './components/PaymentStatus';
import UPIDisplay from './components/UPIDisplay';
import { Clock } from 'lucide-react';

const SectionHeader = ({ title, onBack, onClose }) => (
    <div className="flex justify-between items-center mb-6">
        <div>
            {onBack && (
                <button onClick={onBack} className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600 mb-1 transition-colors">
                    <ArrowRight size={12} className="rotate-180" /> Back
                </button>
            )}
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-all">
            <X size={20} />
        </button>
    </div>
);

export default function SettlementModal({ settlement, groupId, onClose, onSettled }) {
    const { user } = useAuth();
    const { state, error, actions } = useSettlementMachine(settlement, groupId, onSettled);

    // Initial trigger
    useEffect(() => {
        actions.startFlow();
    }, [actions]);

    const amountInRupees = (settlement.amount / 100).toFixed(2);

    const renderContent = () => {
        switch (state) {
            case SettlementStates.SELECTING_METHOD:
                return (
                    <div className="animate-scale-in">
                        <SectionHeader title="Settle Up" onClose={onClose} />

                        <div className="text-center py-6 mb-8 bg-slate-50/80 rounded-3xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Payment</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tight">₹{amountInRupees}</p>
                            <p className="text-sm text-slate-500 mt-1 font-medium italic">to {settlement.to.name}</p>
                        </div>

                        <MethodSelector
                            walletBalance={user?.wallet_balance || 0}
                            amount={settlement.amount}
                            onSelectWallet={actions.executeWalletPayment}
                            onSelectUPI={actions.initiateUPI}
                        />
                    </div>
                );

            case SettlementStates.PROCESSING_WALLET:
                return (
                    <PaymentStatus
                        type="processing"
                        title="Processing"
                        message="Deducting from your SplitSync wallet..."
                    />
                );

            case SettlementStates.SUCCESS:
                return (
                    <PaymentStatus
                        type="success"
                        title="Done!"
                        message={`Paid ₹${amountInRupees} to ${settlement.to.name}.`}
                    />
                );

            case SettlementStates.INITIATING_UPI:
                return (
                    <PaymentStatus
                        type="processing"
                        title="Generating"
                        message="Securing your payment link..."
                    />
                );

            case SettlementStates.DISPLAYING_UPI_QR:
            case SettlementStates.CONFIRMING_UPI:
                return (
                    <div className="animate-scale-in">
                        <SectionHeader
                            title="Pay via UPI"
                            onBack={actions.reset}
                            onClose={onClose}
                        />
                        <UPIDisplay
                            upiData={upiData}
                            amount={settlement.amount}
                            onConfirm={actions.confirmUPI}
                            isConfirming={state === SettlementStates.CONFIRMING_UPI}
                        />
                    </div>
                );

            case SettlementStates.AWAITING_APPROVAL:
                return (
                    <div className="p-12 flex flex-col items-center text-center rounded-3xl bg-amber-50/30">
                        <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-6">
                            <Clock size={44} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Awaiting Approval</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Confirmation sent to <b>{settlement.to.name}</b>. They need to approve to clear your balance.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all"
                        >
                            Close
                        </button>
                    </div>
                );

            case SettlementStates.ERROR:
                return (
                    <PaymentStatus
                        type="error"
                        title="Payment Failed"
                        message={error?.message || "Something went wrong."}
                        onRetry={actions.reset}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-white/20 p-8">
                {renderContent()}
            </div>
        </div>
    );
}
