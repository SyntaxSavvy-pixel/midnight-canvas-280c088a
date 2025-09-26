// Reset Pro Plan to Free Plan Script
// Run this in the browser console on the extension popup

(async function resetToFreePlan() {
    try {
        console.log('🔄 Resetting to Free Plan...');

        // Clear all Pro-related data
        const freeData = {
            isPremium: false,
            subscriptionActive: false,
            planType: 'free',
            deactivatedAt: new Date().toISOString(),
            deactivatedBy: 'manual_reset',
            // Clear all subscription data
            nextBillingDate: null,
            subscriptionId: null,
            stripeCustomerId: null,
            paymentConfirmed: false,
            activatedAt: null,
            currentPeriodEnd: null,
            subscriptionStatus: null,
            // Keep user email but clear payment data
            payment_success: null,
            paymentInitiated: null,
            checkoutSessionId: null
        };

        // Reset in Chrome storage
        if (chrome && chrome.storage) {
            await chrome.storage.local.set(freeData);
            console.log('✅ Reset to Free Plan in storage');
        }

        // If popup instance exists, update it
        if (window.tabmangmentPopup) {
            window.tabmangmentPopup.isPremium = false;
            await window.tabmangmentPopup.render();
            await window.tabmangmentPopup.renderSubscriptionPlan();
        }

        // Reload the page to show changes
        location.reload();

        console.log('🆓 Successfully reset to Free Plan');
        console.log('Free Plan limitations:');
        console.log('- ⚠️ Limited to 10 tabs');
        console.log('- ❌ No advanced features');
        console.log('- ❌ No premium themes');

        return true;

    } catch (error) {
        console.error('❌ Reset failed:', error);
        return false;
    }
})();