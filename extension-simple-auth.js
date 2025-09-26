// Simple authentication sync for extension
// This replaces the complex authentication system with a simple flow

class SimpleAuth {
    constructor() {
        this.userEmail = null;
        this.isLoggedIn = false;
        this.isPro = false;
        this.apiUrl = 'https://tabmangment-extension-bz4chus0i-kavon-hicks-projects.vercel.app';

        this.init();
    }

    async init() {
        console.log('🔐 Simple auth starting...');

        // Check if we have stored user email
        await this.loadStoredAuth();

        // Set up message listeners
        this.setupMessageListeners();

        // Check user plan if we have an email
        if (this.userEmail) {
            await this.checkUserPlan();
        }
    }

    async loadStoredAuth() {
        try {
            if (chrome && chrome.storage) {
                const result = await chrome.storage.local.get(['userEmail', 'authToken']);

                if (result.userEmail) {
                    this.userEmail = result.userEmail;
                    this.isLoggedIn = true;
                    console.log('📧 Found stored email:', this.userEmail);
                }
            }
        } catch (error) {
            console.error('❌ Failed to load stored auth:', error);
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
        console.log('📨 Extension message:', message.type);

        switch (message.type) {
            case 'USER_LOGGED_IN':
                await this.handleUserLogin(message.user, message.token);
                sendResponse({ success: true });
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

            case 'LOGOUT_USER':
                await this.logout();
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, message: 'Unknown message type' });
        }
    }

    async handleUserLogin(user, token) {
        console.log('🎉 User logged in:', user.email);

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

        console.log('✅ Login processed, isPro:', this.isPro);
    }

    async checkUserPlan() {
        if (!this.userEmail) {
            console.log('⚠️ No email to check plan for');
            return;
        }

        try {
            console.log('🔍 Checking plan for:', this.userEmail);

            const response = await fetch(`${this.apiUrl}/api/me?email=${encodeURIComponent(this.userEmail)}`);
            const userData = await response.json();

            console.log('📊 Plan check response:', userData);

            if (userData.plan === 'pro') {
                this.isPro = true;
                await this.activateProFeatures();
            } else {
                this.isPro = false;
                await this.deactivateProFeatures();
            }

        } catch (error) {
            console.error('❌ Failed to check user plan:', error);
            this.isPro = false;
        }
    }

    async activateProFeatures() {
        console.log('🎉 Activating Pro features');

        if (chrome && chrome.storage) {
            await chrome.storage.local.set({
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro'
            });
        }

        // Show notification
        if (chrome && chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon-48.png',
                title: 'Pro Features Activated!',
                message: '🎉 Welcome to Tabmangment Pro! All features unlocked.'
            });
        }

        console.log('✅ Pro features activated');
    }

    async deactivateProFeatures() {
        console.log('📱 Setting free plan features');

        if (chrome && chrome.storage) {
            await chrome.storage.local.set({
                isPremium: false,
                subscriptionActive: false,
                planType: 'free'
            });
        }

        console.log('✅ Free plan set');
    }

    async logout() {
        console.log('👋 Logging out...');

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

        console.log('✅ Logout complete');
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
        const loginUrl = `${this.apiUrl}/login.html`;
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

console.log('✅ Simple auth system loaded');