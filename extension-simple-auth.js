
class SimpleAuth {
    constructor() {
        this.userEmail = null;
        this.isLoggedIn = false;
        this.isPro = false;
        this.apiUrl = 'https://tabmangment.netlify.app';

        this.init();
    }

    async init() {

        await this.loadStoredAuth();

        this.setupMessageListeners();

        if (this.userEmail) {
            await this.checkUserPlan();
        }

        this.startPeriodicPlanCheck();
    }

    startPeriodicPlanCheck() {
    }

    async loadStoredAuth() {
        try {
            if (chrome && chrome.storage) {
                const result = await chrome.storage.local.get(['userEmail', 'authToken', 'isPremium', 'isPro', 'subscriptionActive']);

                if (result.userEmail) {
                    this.userEmail = result.userEmail;
                    this.isLoggedIn = true;

                    this.isPro = result.isPremium || result.isPro || result.subscriptionActive || false;
                }
            }
        } catch (error) {
        }
    }

    setupMessageListeners() {
        if (chrome && chrome.runtime) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
                return true;
            });
        }
    }

    async handleMessage(message, sender, sendResponse) {
        if (!message || !message.type) {
            return;
        }

        if (message.type === 'RESPONSE' || message.type === 'TABMANGMENT_RESPONSE') {
            return;
        }


        switch (message.type) {
            case 'USER_LOGGED_IN':
                if (message.user && message.user.email) {
                    await this.handleUserLogin(message.user, message.token);
                    sendResponse({ success: true });
                } else {
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
                if (message.email) {
                    await this.handleUserLogin({
                        email: message.email,
                        name: message.name || 'User'
                    }, null);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Missing email' });
                }
                break;

            case 'LOGOUT_USER':
                await this.logout();
                sendResponse({ success: true });
                break;

            default:
                if (!message.type || !message.type.startsWith('_')) {
                }
                sendResponse({ success: false, message: 'Unknown message type' });
        }
    }

    async handleUserLogin(user, token) {
        if (!user || typeof user !== 'object') {
            return;
        }

        this.userEmail = user.email;
        this.isLoggedIn = true;

        if (chrome && chrome.storage) {
            await chrome.storage.local.set({
                userEmail: user.email,
                authToken: token,
                userName: user.name,
                userPhoto: user.photoURL || user.picture || user.photo || user.image || user.avatar || null
            });
        }

        await this.checkUserPlan();

    }

    async checkUserPlan() {
        if (!this.userEmail) {
            return;
        }

        try {
            if (this.userEmail.startsWith('fallback_')) {
                this.isPro = false;
                await this.deactivateProFeatures();
                return;
            }

            let isPro = false;

            try {
                const storedUserData = localStorage.getItem('tabmangment_user');
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    isPro = userData.isPro === true || userData.plan === 'pro';
                }
            } catch (e) {
            }

            if (!isPro && chrome && chrome.storage) {
                const cachedStatus = await chrome.storage.local.get(['isPremium', 'isPro', 'subscriptionActive', 'planType']);
                isPro = cachedStatus && (cachedStatus.isPremium || cachedStatus.isPro || cachedStatus.subscriptionActive);
            }

            if (isPro) {
                this.isPro = true;
                await this.activateProFeatures();
            } else {
                this.isPro = false;
                await this.deactivateProFeatures();
            }

        } catch (error) {
            if (chrome && chrome.storage) {
                const cachedStatus = await chrome.storage.local.get(['isPremium', 'isPro', 'subscriptionActive', 'planType']);
                if (cachedStatus && (cachedStatus.isPremium || cachedStatus.isPro || cachedStatus.subscriptionActive)) {
                    this.isPro = true;
                } else {
                    this.isPro = false;
                }
            } else {
                this.isPro = false;
            }
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

let simpleAuth = null;

if (typeof chrome !== 'undefined' && chrome.runtime) {
    simpleAuth = new SimpleAuth();

    window.openLoginPage = () => simpleAuth?.openLoginPage();
    window.getUserEmail = () => simpleAuth?.getUserEmail();
    window.isLoggedIn = () => simpleAuth?.isUserLoggedIn();
    window.isUserPro = () => simpleAuth?.isUserPro();
    window.checkUserPlan = () => simpleAuth?.checkUserPlan();
    window.logoutUser = () => simpleAuth?.logout();
}

