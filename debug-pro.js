// Debug Pro Activation - paste in Chrome DevTools Console
(async function debugProActivation() {
    console.log('🔍 DEBUG: Checking Pro activation status...');

    // Check Chrome storage
    if (chrome && chrome.storage) {
        const storage = await chrome.storage.local.get([
            'isPremium', 'subscriptionActive', 'planType', 'currentPeriodEnd',
            'customerId', 'subscriptionId', 'subscriptionStatus', 'nextBillingDate'
        ]);
        console.log('📦 Chrome Storage:', storage);

        if (storage.isPremium) {
            console.log('✅ Pro found in Chrome storage');
            if (storage.currentPeriodEnd) {
                console.log('📅 Next billing:', new Date(storage.currentPeriodEnd).toLocaleDateString());
            }
        } else {
            console.log('❌ No Pro found in Chrome storage');
        }
    }

    // Check Stripe integration
    if (window.stripeProIntegration) {
        console.log('🔗 Stripe integration found');
        const userPlan = await window.stripeProIntegration.checkUserPlan();
        console.log('👤 User plan from API:', userPlan);
    } else {
        console.log('❌ Stripe integration not found');
    }

    // Check localStorage
    const localStatus = localStorage.getItem('tabmangment_pro_status');
    if (localStatus) {
        console.log('💾 LocalStorage Pro status:', JSON.parse(localStatus));
    } else {
        console.log('❌ No Pro status in localStorage');
    }

    console.log('🔧 To test Pro activation after payment:');
    console.log('1. Complete real Stripe payment');
    console.log('2. Wait 30-60 seconds for webhook');
    console.log('3. Refresh extension popup');
    console.log('4. Check if Pro features are unlocked');

})();