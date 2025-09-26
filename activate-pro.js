// Emergency Pro Activation Script
// Run this in the browser console on the extension popup to activate Pro features

(async function activateProNow() {
    try {
        console.log('🚀 Activating Pro features...');

        // Pro activation data
        const proData = {
            isPremium: true,
            subscriptionActive: true,
            planType: 'pro',
            activatedAt: new Date().toISOString(),
            activatedBy: 'payment_confirmation',
            nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            subscriptionId: 'paid_' + Date.now(),
            features: ['unlimited_tabs', 'advanced_management', 'premium_themes', 'export_features'],
            paymentConfirmed: true,
            manualActivation: true
        };

        // Activate in Chrome storage
        if (chrome && chrome.storage) {
            await chrome.storage.local.set(proData);
            console.log('✅ Pro features activated in storage');
        }

        // If popup instance exists, update it
        if (window.tabmangmentPopup) {
            window.tabmangmentPopup.isPremium = true;
            await window.tabmangmentPopup.render();
            await window.tabmangmentPopup.updateUIForProUser();
            await window.tabmangmentPopup.renderSubscriptionPlan();
        }

        console.log('🎉 Pro features activated successfully!');
        console.log('Pro features now include:');
        console.log('- ✅ Unlimited tabs');
        console.log('- ✅ Advanced tab management');
        console.log('- ✅ Premium themes');
        console.log('- ✅ Export features');

        return true;

    } catch (error) {
        console.error('❌ Activation failed:', error);
        return false;
    }
})();