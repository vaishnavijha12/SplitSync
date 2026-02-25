import api from '../../../api/client';

/**
 * SettlementService handles all network requests and business logic side-effects
 * for the settlement feature.
 */
class SettlementService {
    /**
     * Executes a wallet-to-wallet settlement
     * @param {Object} params - { to_user_id, amount, group_id }
     * @returns {Promise<Object>} The transaction result
     */
    async settleViaWallet({ toUserId, amount, groupId }) {
        try {
            const response = await api.post('/payments/settle', {
                to_user_id: toUserId,
                amount: amount / 100, // API expects rupees, we store cents
                group_id: groupId,
                note: 'Settled via SplitSync Wallet',
            }, {
                headers: {
                    'X-Idempotency-Key': `wallet_settle_${Date.now()}` // Production-grade idempotency
                }
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'Wallet settlement failed');
        }
    }

    /**
     * Generates a UPI deep link and creates an external transaction record
     */
    async initiateUPISettlement({ toUserId, amount, groupId }) {
        try {
            const response = await api.post('/payments/upi/create', {
                to_user_id: toUserId,
                amount: amount / 100,
                group_id: groupId,
                note: 'SplitSync: group settlement',
            });
            return response.data;
        } catch (error) {
            this._handleError(error, 'UPI initiation failed');
        }
    }

    /**
     * Confirms that the payer has completed the UPI payment
     */
    async confirmUPIPayment(transactionId) {
        try {
            const response = await api.post(`/payments/upi/confirm/${transactionId}`);
            return response.data;
        } catch (error) {
            this._handleError(error, 'UPI confirmation failed');
        }
    }

    _handleError(error, defaultMessage) {
        const message = error.response?.data?.error || defaultMessage;
        const status = error.response?.status;

        const enhancedError = new Error(message);
        enhancedError.status = status;
        enhancedError.originalError = error;

        throw enhancedError;
    }
}

export default new SettlementService();
