/**
 * SettlementAnalytics provides a centralized way to track user behavior 
 * and funnel conversion within the settlement flow.
 */
class SettlementAnalytics {
    trackEvent(eventName, properties = {}) {
        // In a real production app, this would integrate with Mixpanel, Amplitude, or Datadog
        console.log(`[Analytics] ${eventName}`, {
            ...properties,
            timestamp: new Date().toISOString(),
        });
    }

    trackError(error, context = {}) {
        console.error(`[Error Tracking] ${error.message}`, {
            error,
            ...context,
        });
    }

    onFlowStarted(groupId) {
        this.trackEvent('settlement_flow_started', { groupId });
    }

    onMethodSelected(method) {
        this.trackEvent('settlement_method_selected', { method });
    }

    onPaymentSuccess(method, amount) {
        this.trackEvent('settlement_payment_success', { method, amount });
    }

    onPaymentFailed(method, error) {
        this.trackEvent('settlement_payment_failed', { method, error: error.message });
        this.trackError(error, { method });
    }
}

export default new SettlementAnalytics();
