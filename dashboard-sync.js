
(async function() {
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    await new Promise(resolve => setTimeout(resolve, 100));


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
                    userPhoto: user.photoURL || user.picture || user.photo || user.image || user.avatar || null,
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
        }
    }

    syncUserDataToExtension();

    const syncInterval = setInterval(syncUserDataToExtension, 10000);

    window.addEventListener('storage', (e) => {
        if (e.key === 'tabmangment_user' || e.key === 'tabmangment_token') {
            syncUserDataToExtension();
        }
    });


    window.addEventListener('message', async (event) => {
        if (event.source !== window) return;

        const message = event.data;

        if (message.source !== 'tabmangment-dashboard') return;

        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            window.postMessage({
                type: 'EXTENSION_TABS_DATA_RESPONSE',
                source: 'tabmangment-extension',
                success: false,
                error: 'Extension not available'
            }, '*');
            return;
        }

        switch (message.type) {
            case 'DASHBOARD_REQUEST_TABS_DATA':
                try {
                    chrome.runtime.sendMessage({
                        type: 'GET_TABS_DATA'
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            window.postMessage({
                                type: 'EXTENSION_TABS_DATA_RESPONSE',
                                source: 'tabmangment-extension',
                                success: false,
                                error: chrome.runtime.lastError.message
                            }, '*');
                            return;
                        }

                        window.postMessage({
                            type: 'EXTENSION_TABS_DATA_RESPONSE',
                            source: 'tabmangment-extension',
                            success: response.success,
                            data: response.data
                        }, '*');
                    });
                } catch (error) {
                    window.postMessage({
                        type: 'EXTENSION_TABS_DATA_RESPONSE',
                        source: 'tabmangment-extension',
                        success: false,
                        error: 'Extension context invalidated. Please refresh the page.'
                    }, '*');
                }
                break;

            case 'DASHBOARD_CLEAN_TABS':
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

            case 'DASHBOARD_SET_AUTO_CLOSE_TIME':
                try {
                    chrome.runtime.sendMessage({
                        type: 'SET_AUTO_CLOSE_TIME',
                        time: message.time
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            window.postMessage({
                                type: 'EXTENSION_AUTO_CLOSE_TIME_RESPONSE',
                                source: 'tabmangment-extension',
                                success: false,
                                error: chrome.runtime.lastError.message
                            }, '*');
                            return;
                        }

                        window.postMessage({
                            type: 'EXTENSION_AUTO_CLOSE_TIME_RESPONSE',
                            source: 'tabmangment-extension',
                            success: response.success
                        }, '*');
                    });
                } catch (error) {
                    window.postMessage({
                        type: 'EXTENSION_AUTO_CLOSE_TIME_RESPONSE',
                        source: 'tabmangment-extension',
                        success: false,
                        error: 'Extension context invalidated. Please refresh the page.'
                    }, '*');
                }
                break;

            case 'DASHBOARD_SYNC_USER_NAME':
                try {
                    chrome.runtime.sendMessage({
                        type: 'UPDATE_USER_NAME',
                        name: message.name
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            return;
                        }
                    });
                } catch (error) {
                }
                break;

            case 'DASHBOARD_APPLY_THEME':
                try {
                    if (chrome.storage && chrome.storage.local) {
                        chrome.storage.local.set({
                            activeTheme: message.themeName,
                            themeConfig: message.themeConfig
                        }, () => {
                            if (chrome.runtime.lastError) {
                                window.postMessage({
                                    type: 'THEME_APPLY_RESPONSE',
                                    source: 'tabmangment-extension',
                                    success: false,
                                    error: chrome.runtime.lastError.message
                                }, '*');
                            } else {
                                chrome.runtime.sendMessage({
                                    type: 'THEME_UPDATE',
                                    themeName: message.themeName,
                                    themeConfig: message.themeConfig
                                }, () => {
                                });

                                window.postMessage({
                                    type: 'THEME_APPLY_RESPONSE',
                                    source: 'tabmangment-extension',
                                    success: true
                                }, '*');
                            }
                        });
                    }
                } catch (error) {
                    window.postMessage({
                        type: 'THEME_APPLY_RESPONSE',
                        source: 'tabmangment-extension',
                        success: false,
                        error: error.message
                    }, '*');
                }
                break;
        }
    });

    window.addEventListener('beforeunload', () => {
        clearInterval(syncInterval);
    });
})();
