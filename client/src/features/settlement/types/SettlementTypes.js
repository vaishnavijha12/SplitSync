/**
 * SettlementStates defines the finite set of possible states for the settlement flow.
 */
export const SettlementStates = {
    IDLE: 'IDLE',
    SELECTING_METHOD: 'SELECTING_METHOD',
    PROCESSING_WALLET: 'PROCESSING_WALLET',
    INITIATING_UPI: 'INITIATING_UPI',
    DISPLAYING_UPI_QR: 'DISPLAYING_UPI_QR',
    CONFIRMING_UPI: 'CONFIRMING_UPI',
    AWAITING_APPROVAL: 'AWAITING_APPROVAL',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
};

/**
 * SettlementMethods defines the supported payment channels.
 */
export const SettlementMethods = {
    WALLET: 'wallet',
    UPI: 'upi',
    CASH: 'cash', // Future proofing
};
