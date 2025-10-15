// Dashboard Sync Script v3.0.0
// This script runs on the dashboard page and acts as a bridge between the web page and Chrome extension
// Handles user data sync AND Smart Suggestions data communication

(async function() {
    console.log('[Content Script] Dashboard sync bridge loaded');

    // Wait for page to fully load
    if (document.readyState === 'loading') {
        console.log('[Content Script] Waiting for DOM...');
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    console.log('[Content Script] DOM ready, waiting 1 second...');
    // Give the page a moment to load user data
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('[Content Script] Bridge fully initialized and listening');

    // ============================================
    // USER DATA SYNC (existing functionality)
    // ============================================

    function syncUserDataToExtension() {
        try {
            const userStr = localStorage.getItem('tabmangment_user');
            const token = localStorage.getItem('tabmangment_token');

            if (!userStr || !token) {
                return;
            }

            const user = JSON.parse(userStr);

            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                return;
            }

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
                    return;
                }
            });

        } catch (error) {
            // Silent fail
        }
    }

    // Initial sync
    syncUserDataToExtension();

    // Re-sync every 10 seconds
    const syncInterval = setInterval(syncUserDataToExtension, 10000);

    // Listen for storage changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'tabmangment_user' || e.key === 'tabmangment_token') {
            syncUserDataToExtension();
        }
    });

    // ============================================
    // SMART SUGGESTIONS BRIDGE (new functionality)
    // ============================================

    // Listen for messages from the dashboard page
    window.addEventListener('message', async (event) => {
        // Only accept messages from same origin
        if (event.source !== window) return;

        const message = event.data;

        // Only process messages from our dashboard
        if (message.source !== 'tabmangment-dashboard') return;

        console.log('[Bridge] Received message from dashboard:', message.type);

        // Check if extension APIs are available
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            console.log('[Bridge] Extension APIs not available');
            // Extension not available - send error response
            window.postMessage({
                type: 'EXTENSION_TABS_DATA_RESPONSE',
                source: 'tabmangment-extension',
                success: false,
                error: 'Extension not available'
            }, '*');
            return;
        }

        // Handle different message types from dashboard
        switch (message.type) {
            case 'DASHBOARD_REQUEST_TABS_DATA':
                console.log('[Bridge] Requesting tabs data from background script...');
                // Request tabs data from extension
                try {
                    chrome.runtime.sendMessage({
                        type: 'GET_TABS_DATA'
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log('[Bridge] Extension error:', chrome.runtime.lastError.message);
                            window.postMessage({
                                type: 'EXTENSION_TABS_DATA_RESPONSE',
                                source: 'tabmangment-extension',
                                success: false,
                                error: chrome.runtime.lastError.message
                            }, '*');
                            return;
                        }

                        console.log('[Bridge] Got response from background script:', response);
                        // Forward extension response to dashboard
                        window.postMessage({
                            type: 'EXTENSION_TABS_DATA_RESPONSE',
                            source: 'tabmangment-extension',
                            success: response.success,
                            data: response.data
                        }, '*');
                    });
                } catch (error) {
                    console.log('[Bridge] Extension context invalidated:', error.message);
                    window.postMessage({
                        type: 'EXTENSION_TABS_DATA_RESPONSE',
                        source: 'tabmangment-extension',
                        success: false,
                        error: 'Extension context invalidated. Please refresh the page.'
                    }, '*');
                }
                break;

            case 'DASHBOARD_CLEAN_TABS':
                // Clean inactive tabs
                try {
                    chrome.runtime.sendMessage({
                        type: 'CLEAN_INACTIVE_TABS'
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            window.postMessage({
                                type: 'EXTENSION_CLEAN_TABS_RESPONSE',
                                source: 'tabmangment-extension',
                                success: false,
                                error: chrome.runtime.lastError.message
                            }, '*');
                            return;
                        }

                        window.postMessage({
                            type: 'EXTENSION_CLEAN_TABS_RESPONSE',
                            source: 'tabmangment-extension',
                            success: response.success,
                            data: response
                        }, '*');
                    });
                } catch (error) {
                    window.postMessage({
                        type: 'EXTENSION_CLEAN_TABS_RESPONSE',
                        source: 'tabmangment-extension',
                        success: false,
                        error: 'Extension context invalidated. Please refresh the page.'
                    }, '*');
                }
                break;

            case 'DASHBOARD_ENABLE_AUTO_CLEAN':
                // Enable auto-clean
                try {
                    chrome.runtime.sendMessage({
                        type: 'ENABLE_AUTO_CLEAN'
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            window.postMessage({
                                type: 'EXTENSION_AUTO_CLEAN_RESPONSE',
                                source: 'tabmangment-extension',
                                success: false,
                                error: chrome.runtime.lastError.message
                            }, '*');
                            return;
                        }

                        window.postMessage({
                            type: 'EXTENSION_AUTO_CLEAN_RESPONSE',
                            source: 'tabmangment-extension',
                            success: response.success
                        }, '*');
                    });
                } catch (error) {
                    window.postMessage({
                        type: 'EXTENSION_AUTO_CLEAN_RESPONSE',
                        source: 'tabmangment-extension',
                        success: false,
                        error: 'Extension context invalidated. Please refresh the page.'
                    }, '*');
                }
                break;
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(syncInterval);
    });
})();
