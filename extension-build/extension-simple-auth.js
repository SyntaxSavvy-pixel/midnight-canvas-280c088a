// Simple authentication sync for extension
// This replaces the complex authentication system with a simple flow

class SimpleAuth {
    constructor() {
        this.userEmail = null;
        this.isLoggedIn = false;
        this.isPro = false;
        this.apiUrl = 'https://tabmangment.netlify.app';

        this.init();
    }

    async init() {

        // Check if we have stored user email
        await this.loadStoredAuth();

        // Set up message listeners
        this.setupMessageListeners();

        // Check user plan if we have an email
        if (this.userEmail) {
            await this.checkUserPlan();
        }

        // Set up periodic plan checks (every 5 minutes)
        this.startPeriodicPlanCheck();
    }

    startPeriodicPlanCheck() {
        // Disabled periodic plan checks - storage is now the source of truth
        // Only Stripe webhooks should update subscription status
        // This prevents flickering and race conditions with payment processing
    }

    async loadStoredAuth() {
        try {
            if (chrome && chrome.storage) {
                const result = await chrome.storage.local.get(['userEmail', 'authToken']);

                if (result.userEmail) {
                    this.userEmail = result.userEmail;
                    this.isLoggedIn = true;
                }
            }
        } catch (error) {
        }
    }

    setupMessageListeners() {
        if (chrome && chrome.runtime) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
                return true; // Keep channel open for async response
            });
        }
    }

    async handleMessage(message, sender, sendResponse) {
        // Ignore messages without a type
        if (!message || !message.type) {
            return; // Silently ignore empty messages
        }

        // Ignore RESPONSE messages - they're for the dashboard
        if (message.type === 'RESPONSE' || message.type === 'TABMANGMENT_RESPONSE') {
            return;
        }


        switch (message.type) {
            case 'USER_LOGGED_IN':
                if (message.user && message.user.email) {
                    await this.handleUserLogin(message.user, message.token);
                    sendResponse({ success: true });
                } else {
                    console.error('USER_LOGGED_IN message missing user data');
                    sendResponse({ success: false, error: 'Missing user data' });
                }
                break;

            case 'GET_USER_STATUS':
                sendResponse({
                    success: true,
                    isLoggedIn: this.isLoggedIn,
                    userEmail: this.userEmail,
                    isPro: this.isPro
                });
                break;

            case 'CHECK_USER_PLAN':
                await this.checkUserPlan();
                sendResponse({
                    success: true,
                    isPro: this.isPro
                });
                break;

            case 'USER_LOGIN':
                // Dashboard is syncing real user email to replace fallback
                if (message.email) {
                    await this.handleUserLogin({
                        email: message.email,
                        name: message.name || 'User'
                    }, null);
                    sendResponse({ success: true });
                } else {
                    console.error('USER_LOGIN message missing email');
                    sendResponse({ success: false, error: 'Missing email' });
                }
                break;

            case 'LOGOUT_USER':
                await this.logout();
                sendResponse({ success: true });
                break;

            default:
                // Only log unknown messages that aren't internal Chrome messages
                if (!message.type || !message.type.startsWith('_')) {
                }
                sendResponse({ success: false, message: 'Unknown message type' });
        }
    }

    async handleUserLogin(user, token) {
        // Validate user object exists
        if (!user || typeof user !== 'object') {
            console.error('Invalid user object in handleUserLogin');
            return;
        }

        this.userEmail = user.email;
        this.isLoggedIn = true;

        // Store in extension storage
        if (chrome && chrome.storage) {
            await chrome.storage.local.set({
                userEmail: user.email,
                authToken: token,
                userName: user.name
            });
        }

        // Check their plan status
        await this.checkUserPlan();

    }

    async checkUserPlan() {
        if (!this.userEmail) {
            return;
        }

        try {
            // FIRST: If using fallback email, set to free
            if (this.userEmail.startsWith('fallback_')) {
                this.isPro = false;
                await this.deactivateProFeatures();
                return;
            }


            const response = await fetch(`${this.apiUrl}/api/me?email=${encodeURIComponent(this.userEmail)}`);

            if (!response.ok) {
                // If API fails, default to free
                this.isPro = false;
                await this.deactivateProFeatures();
                return;
            }

            const userData = await response.json();


            // CRITICAL: API is now the source of truth - sync plan status
            // This allows both upgrading AND downgrading based on actual subscription status
            if (userData.plan === 'pro' || userData.isPro === true) {
                this.isPro = true;
                await this.activateProFeatures();
            } else {
                this.isPro = false;
                await this.deactivateProFeatures();
            }

        } catch (error) {
            // On error, default to free to be safe
            this.isPro = false;
            await this.deactivateProFeatures();
        }
    }

    async activateProFeatures() {

        if (chrome && chrome.storage) {
            await chrome.storage.local.set({
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro'
            });
        }


    }

    async deactivateProFeatures() {

        if (chrome && chrome.storage) {
            await chrome.storage.local.set({
                isPremium: false,
                subscriptionActive: false,
                planType: 'free'
            });
        }

    }

    async logout() {

        this.userEmail = null;
        this.isLoggedIn = false;
        this.isPro = false;

        if (chrome && chrome.storage) {
            await chrome.storage.local.remove([
                'userEmail',
                'authToken',
                'userName',
                'isPremium',
                'subscriptionActive',
                'planType'
            ]);
        }

    }

    // Public methods
    getUserEmail() {
        return this.userEmail;
    }

    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    isUserPro() {
        return this.isPro;
    }

    async openLoginPage() {
        const loginUrl = `${this.apiUrl}/new-authentication`;
        chrome.tabs.create({ url: loginUrl });
    }
}

// Initialize when script loads
let simpleAuth = null;

if (typeof chrome !== 'undefined' && chrome.runtime) {
    simpleAuth = new SimpleAuth();

    // Global functions for extension to use
    window.openLoginPage = () => simpleAuth?.openLoginPage();
    window.getUserEmail = () => simpleAuth?.getUserEmail();
    window.isLoggedIn = () => simpleAuth?.isUserLoggedIn();
    window.isUserPro = () => simpleAuth?.isUserPro();
    window.checkUserPlan = () => simpleAuth?.checkUserPlan();
    window.logoutUser = () => simpleAuth?.logout();
}

