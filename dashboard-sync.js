// Dashboard Sync Script
// This script runs on the dashboard page and automatically syncs user data to the extension

(async function() {
    console.log('🔄 Dashboard sync script loaded');

    // Wait for page to fully load
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    // Give the page a moment to load user data
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Function to sync user data from localStorage to extension
    function syncUserDataToExtension() {
        try {
            // Get user data from localStorage
            const userStr = localStorage.getItem('tabmangment_user');
            const token = localStorage.getItem('tabmangment_token');

            if (!userStr || !token) {
                console.log('❌ No user data found in localStorage');
                return;
            }

            const user = JSON.parse(userStr);
            console.log('✅ Found user data:', user.email);

            // Send message to extension
            chrome.runtime.sendMessage({
                type: 'USER_DATA_SYNC',
                data: {
                    userEmail: user.email,
                    userName: user.name || user.email.split('@')[0],
                    authToken: token,
                    isPremium: user.isPro || user.plan === 'pro' || false,
                    planType: user.plan || 'free',
                    subscriptionActive: user.isPro || user.plan === 'pro' || false,
                    userId: user.id || user.email,
                    provider: user.provider || 'email',
                    avatar: user.avatar || null,
                    proActivatedAt: user.proActivatedAt || null,
                    deletionScheduledAt: user.deletionScheduledAt || null,
                    syncTimestamp: Date.now()
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Sync error:', chrome.runtime.lastError);
                } else if (response && response.success) {
                    console.log('✅ User data synced to extension successfully');
                } else {
                    console.warn('⚠️ Sync response:', response);
                }
            });

        } catch (error) {
            console.error('❌ Error syncing user data:', error);
        }
    }

    // Initial sync
    syncUserDataToExtension();

    // Re-sync every 10 seconds while dashboard is open
    const syncInterval = setInterval(syncUserDataToExtension, 10000);

    // Listen for storage changes and sync immediately
    window.addEventListener('storage', (e) => {
        if (e.key === 'tabmangment_user' || e.key === 'tabmangment_token') {
            console.log('🔄 Storage changed, re-syncing...');
            syncUserDataToExtension();
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(syncInterval);
    });

    console.log('✅ Dashboard sync initialized');
})();
