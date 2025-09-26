import { CONFIG } from './config.js';

class PaymentSuccessListener {
    constructor() {
        this.init();
    }

    init() {

        this.setupTabListeners();
        this.setupStorageListener();
    }

    setupTabListeners() {
        if (chrome.tabs && chrome.tabs.onUpdated) {
            chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
                if (changeInfo.url || (tab.url && changeInfo.status === 'complete')) {
                    await this.checkForPaymentSuccess(tab.url, tabId);
                }
            });
        }
    }

    setupStorageListener() {
        if (chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener(async (changes, areaName) => {
                if (areaName === 'local') {

                    if (changes.paymentCompleted || changes.checkoutCompleted) {

                        await this.handlePaymentCompletion();
                    }
                }
            });
        }
    }

    async checkForPaymentSuccess(url, tabId) {
        if (!url) return;

        const successPatterns = [
            /stripe\.com.*success/i,
            /tabmangment.*success/i,
            /vercel\.app.*success/i,
            /checkout\.stripe\.com.*success/i,
            /buy\.stripe\.com.*success/i
        ];

        const isSuccessPage = successPatterns.some(pattern => pattern.test(url));

        if (isSuccessPage) {

            const sessionMatch = url.match(/session_id=([^&]+)/);
            const sessionId = sessionMatch ? sessionMatch[1] : null;

            await this.activateProFeatures(sessionId, tabId);
        }
    }

    async activateProFeatures(sessionId, tabId) {
        try {

            const stored = await chrome.storage.local.get(['userEmail']);
            let userEmail = stored.userEmail;

            if (!userEmail) {
                userEmail = await this.getUserEmail();
            }

            if (!userEmail) {

                return;
            }

            const status = await this.checkSubscriptionStatus(userEmail);

            if (status.isActive && status.plan === 'pro') {

                await chrome.storage.local.set({
                    isPremium: true,
                    subscriptionActive: true,
                    planType: 'pro',
                    subscriptionType: 'monthly',
                    subscriptionId: status.subscriptionId,
                    currentPeriodEnd: new Date(status.currentPeriodEnd).getTime(),
                    nextBillingDate: new Date(status.currentPeriodEnd).getTime(),
                    proActivatedAt: Date.now(),
                    userEmail: userEmail,
                    lastStatusCheck: Date.now()
                });

                await chrome.storage.local.set({
                    proActivationSignal: Date.now()
                });

                if (chrome.notifications) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon-48.png',
                        title: 'Welcome to Tabmangment Pro! 🎉',
                        message: 'Your Pro features are now active!'
                    });
                }

                setTimeout(() => {
                    if (chrome.tabs) {
                        chrome.tabs.remove(tabId).catch(() => {

                        });
                    }
                }, 3000);

            } else {

                setTimeout(() => {
                    this.activateProFeatures(sessionId, tabId);
                }, 10000);
            }

        } catch (error) {

        }
    }

    async getUserEmail() {
        try {

            if (chrome.identity && chrome.identity.getAuthToken) {
                const token = await chrome.identity.getAuthToken({ interactive: false });
                if (token) {
                    const response = await fetch('https:
                    const data = await response.json();
                    if (data.email) {
                        await chrome.storage.local.set({ userEmail: data.email });
                        return data.email;
                    }
                }
            }
        } catch (error) {

        }
        return null;
    }

    async checkSubscriptionStatus(userEmail) {
        try {
            const response = await fetch(`${CONFIG.API.CHECK_STATUS}?email=${encodeURIComponent(userEmail)}`);

            if (response.ok) {
                const data = await response.json();
                return {
                    isActive: data.isPro && data.status === 'active',
                    plan: data.plan,
                    subscriptionId: data.subscriptionId,
                    currentPeriodEnd: data.currentPeriodEnd
                };
            }
        } catch (error) {

        }

        return { isActive: false, plan: 'free' };
    }

    async handlePaymentCompletion() {

        const stored = await chrome.storage.local.get(['userEmail']);
        if (stored.userEmail) {
            await this.activateProFeatures(null, null);
        }
    }
}

if (typeof window !== 'undefined') {

    new PaymentSuccessListener();
} else if (typeof chrome !== 'undefined' && chrome.runtime) {

    new PaymentSuccessListener();
}