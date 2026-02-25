import { useState, useCallback } from 'react';
import { SettlementStates, SettlementMethods } from '../types/SettlementTypes';
import SettlementService from '../services/SettlementService';
import SettlementAnalytics from '../services/SettlementAnalytics';
import toast from 'react-hot-toast';

/**
 * useSettlementMachine provides a strict FSM interface for the settlement UI.
 */
export const useSettlementMachine = (settlement, groupId, onSettled) => {
    const [state, setState] = useState(SettlementStates.IDLE);
    const [error, setError] = useState(null);
    const [upiData, setUpiData] = useState(null);

    // Initial transition
    const startFlow = useCallback(() => {
        setState(SettlementStates.SELECTING_METHOD);
        SettlementAnalytics.onFlowStarted(groupId);
    }, [groupId]);

    // Handle Wallet Payment
    const executeWalletPayment = async () => {
        // Guard: Prevent double-processing
        if (state === SettlementStates.PROCESSING_WALLET) return;

        setState(SettlementStates.PROCESSING_WALLET);
        SettlementAnalytics.onMethodSelected(SettlementMethods.WALLET);

        try {
            await SettlementService.settleViaWallet({
                toUserId: settlement.to.id,
                amount: settlement.amount,
                groupId
            });

            setState(SettlementStates.SUCCESS);
            SettlementAnalytics.onPaymentSuccess(SettlementMethods.WALLET, settlement.amount);

            // Auto-close hook
            setTimeout(onSettled, 2000);
        } catch (err) {
            setError(err);
            setState(SettlementStates.ERROR);
            SettlementAnalytics.onPaymentFailed(SettlementMethods.WALLET, err);
        }
    };

    // Handle UPI Payment initiation
    const initiateUPI = async () => {
        setState(SettlementStates.INITIATING_UPI);
        SettlementAnalytics.onMethodSelected(SettlementMethods.UPI);

        try {
            const data = await SettlementService.initiateUPISettlement({
                toUserId: settlement.to.id,
                amount: settlement.amount,
                groupId
            });
            setUpiData(data);
            setState(SettlementStates.DISPLAYING_UPI_QR);
        } catch (err) {
            setError(err);
            setState(SettlementStates.ERROR);
            SettlementAnalytics.onPaymentFailed(SettlementMethods.UPI, err);
        }
    };

    // Confirm UPI Payment by payer
    const confirmUPI = async () => {
        if (!upiData?.transaction?.id) return;

        setState(SettlementStates.CONFIRMING_UPI);
        try {
            await SettlementService.confirmUPIPayment(upiData.transaction.id);
            setState(SettlementStates.AWAITING_APPROVAL);
            SettlementAnalytics.trackEvent('upi_confirmed_by_payer');
        } catch (err) {
            toast.error(err.message);
            setState(SettlementStates.DISPLAYING_UPI_QR);
        }
    };

    const reset = () => {
        setState(SettlementStates.SELECTING_METHOD);
        setError(null);
    };

    return {
        state,
        error,
        upiData,
        actions: {
            startFlow,
            executeWalletPayment,
            initiateUPI,
            confirmUPI,
            reset
        }
    };
};
