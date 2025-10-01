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
        console.log('🔐 Simple auth starting...');

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
        console.log('✅ Periodic plan checks disabled - using storage as source of truth');
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
        // Ignore messages without a type
        if (!message || !message.type) {
            return; // Silently ignore empty messages
        }

        // Ignore RESPONSE messages - they're for the dashboard
        if (message.type === 'RESPONSE' || message.type === 'TABMANGMENT_RESPONSE') {
            return;
        }

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

            case 'USER_LOGIN':
                // Dashboard is syncing real user email to replace fallback
                console.log('📧 Received USER_LOGIN from dashboard:', message.email);
                await this.handleUserLogin({
                    email: message.email,
                    name: message.name
                }, null);
                sendResponse({ success: true });
                break;

            case 'LOGOUT_USER':
                await this.logout();
                sendResponse({ success: true });
                break;

            default:
                // Only log unknown messages that aren't internal Chrome messages
                if (!message.type || !message.type.startsWith('_')) {
                    console.log('⚠️ Unknown message type:', message.type);
                }
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
            // FIRST: ALWAYS Check chrome.storage before anything else
            if (chrome && chrome.storage) {
                const stored = await chrome.storage.local.get([
                    'isPremium',
                    'subscriptionActive',
                    'planType',
                    'activatedAt',
                    'paymentConfirmed'
                ]);
                console.log('💾 Stored plan data:', stored);

                // If storage says Pro, ALWAYS trust it - storage is the source of truth
                // This takes precedence over EVERYTHING including fallback emails
                if (stored.isPremium === true || stored.planType === 'pro' || stored.subscriptionActive === true) {
                    console.log('✅ Pro plan found in storage - trusting it permanently');
                    this.isPro = true;

                    // Make sure Pro features are active (don't overwrite existing storage)
                    if (!this.isPro) {
                        await this.activateProFeatures();
                    }

                    // Skip all other checks - storage is absolute source of truth
                    return;
                }
            }

            // SECOND: If using fallback email and storage doesn't have Pro, set to free
            if (this.userEmail.startsWith('fallback_')) {
                console.log('📧 Fallback email detected - setting to free plan');
                this.isPro = false;
                await this.deactivateProFeatures();
                return;
            }

            console.log('🔍 Checking plan via API for:', this.userEmail);

            const response = await fetch(`${this.apiUrl}/api/me?email=${encodeURIComponent(this.userEmail)}`);

            if (!response.ok) {
                console.warn('⚠️ API returned status:', response.status);
                // If storage doesn't say Pro and API fails, default to free
                this.isPro = false;
                await this.deactivateProFeatures();
                return;
            }

            const userData = await response.json();

            console.log('📊 Plan check response:', userData);

            // API can only UPGRADE to Pro, never downgrade
            if (userData.plan === 'pro' || userData.isPro === true) {
                this.isPro = true;
                await this.activateProFeatures();
            } else if (!this.isPro) {
                // Only set to free if we're not already Pro
                this.isPro = false;
                await this.deactivateProFeatures();
            }

        } catch (error) {
            console.error('❌ Failed to check user plan:', error);
            // On error, keep current Pro status if we have it
            if (!this.isPro) {
                this.isPro = false;
                await this.deactivateProFeatures();
            }
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