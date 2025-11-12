const CONFIG = {
    API: {
        BASE: 'https://tabmangment.netlify.app/api',
        CREATE_CHECKOUT: 'https://tabmangment.netlify.app/api/create-checkout',
        CHECK_STATUS: 'https://tabmangment.netlify.app/api/status',
        BILLING_PORTAL: 'https://tabmangment.netlify.app/api/billing-portal'
    },
    EXTENSION: {
        DEFAULT_TAB_LIMIT: 10,
        TIMER_CHECK_INTERVAL: 5000,
        STATUS_CHECK_INTERVAL: 300000,
        CACHE_TIMEOUT: 2000
    }
};

class TabManager {
    constructor() {
        this.tabData = new Map();
        this.initialized = false;
        this.performanceMonitor = null;
        this.optimizationSettings = {
            memoryThreshold: 500,
            cpuThreshold: 80,
            checkInterval: 30000,
            maxInactiveTabs: 15,
            autoFreezeEnabled: false,
            autoRemoveEnabled: false,
            notificationsEnabled: false
        };

        this.emptyTabSettings = {
            enabled: true,
            cleanupInterval: 24 * 60 * 60 * 1000,
            checkInterval: 60 * 60 * 1000
        };
        this.notificationSettings = {
            enabled: true,
            lastMinuteWarning: true,
            checkInterval: 30000,
            notifiedTabs: new Set(),
            cooldowns: new Map(),
            dailyLimits: {
                timer_warnings: 5,
                performance_alerts: 2,
                general_notifications: 3
            },
            dailyCounts: {
                timer_warnings: 0,
                performance_alerts: 0,
                general_notifications: 0,
                lastReset: new Date().toDateString()
            },
            minIntervalBetweenSameType: 60000
        };
        this.lastClosingSoonCount = -1;
        this.init();
    }

    async init() {
        if (this.initialized) return;

        try {
            this.setupEventListeners();
            await this.loadExistingTabs();
            this.startEmptyTabMonitoring();
            this.startTimerNotificationMonitoring();
            this.startAutoCloseMonitoring();

            setTimeout(async () => {
                try {
                    await chrome.action.setPopup({ popup: 'popup.html' });
                } catch (error) {
                }
            }, 500);

            this.initialized = true;
        } catch (error) {
        }
    }

    setupEventListeners() {
        chrome.tabs.onCreated.addListener((tab) => this.handleTabCreated(tab));
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.handleTabUpdated(tabId, changeInfo, tab));
        chrome.tabs.onRemoved.addListener((tabId) => this.handleTabRemoved(tabId));
        chrome.tabs.onActivated.addListener((activeInfo) => this.handleTabActivated(activeInfo));
        chrome.windows.onFocusChanged.addListener((windowId) => this.handleWindowFocusChanged(windowId));

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

        chrome.runtime.onStartup.addListener(() => this.loadExistingTabs());
        chrome.runtime.onInstalled.addListener((details) => this.handleInstalled(details));

    }

    async loadExistingTabs() {
        try {
            const tabs = await chrome.tabs.query({});

            for (const tab of tabs) {
                if (this.isValidTab(tab)) {
                    this.trackTab(tab);
                }
            }

            const activeTabs = await chrome.tabs.query({ active: true });
            for (const activeTab of activeTabs) {
                if (this.tabData.has(activeTab.id)) {
                    const tabInfo = this.tabData.get(activeTab.id);
                    tabInfo.active = true;
                    tabInfo.activeStartTime = Date.now();
                    this.tabData.set(activeTab.id, tabInfo);
                }
            }
        } catch (error) {
        }
    }

    isValidTab(tab) {
        if (!tab.id || !tab.url) return false;

        if (tab.url.startsWith('chrome-extension:') ||
            tab.url.startsWith('moz-extension:') ||
            tab.url.startsWith('chrome://extensions/') ||
            tab.url.startsWith('chrome://settings/') ||
            tab.url.startsWith('chrome://flags/') ||
            tab.url.startsWith('chrome://history/') ||
            tab.url.startsWith('chrome://downloads/')) {
            return false;
        }

        if (tab.url.startsWith('chrome://newtab/') ||
            tab.url.startsWith('chrome://new-tab-page/') ||
            tab.url.startsWith('chrome-search://local-ntp/local-ntp.html')) {
            return true;
        }

        if (!tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('about:') &&
            !tab.url.startsWith('edge://')) {
            return true;
        }

        if (tab.url === 'about:blank' || tab.url === 'about:newtab') {
            return true;
        }

        return false;
    }

    isEmptyTab(tab) {
        if (!tab || !tab.url) return false;

        const chromeNewTabUrls = [
            'chrome://newtab/',
            'chrome://new-tab-page/',
            'chrome-search://local-ntp/local-ntp.html',
            'chrome://startpageshared/',
            'chrome://vivaldi-webui/'
        ];

        const otherBrowserNewTabs = [
            'about:newtab',
            'about:blank',
            'about:home',
            'edge://newtab/',
            'moz-extension://',
            'chrome-extension://'
        ];

        if (chromeNewTabUrls.some(url => tab.url === url || tab.url.startsWith(url))) {
            return true;
        }

        if (otherBrowserNewTabs.some(url => tab.url === url || tab.url.startsWith(url))) {
            return true;
        }

        if (tab.url === 'about:blank' || tab.url === '' || tab.url === 'data:text/html,') {
            return true;
        }

        const searchEngineHomepages = [
            'https://www.google.com',
            'https://www.bing.com',
            'https://www.yahoo.com',
            'https://duckduckgo.com',
            'https://www.startpage.com',
            'https://www.ecosia.org'
        ];

        if (searchEngineHomepages.includes(tab.url)) {
            return true;
        }

        if (tab.url.match(/^https?:\/\/(www\.)?(google|bing|yahoo|duckduckgo)\.com\/?(\?.*)?$/)) {
            return true;
        }

        return false;
    }

    trackTab(tab) {
        if (!this.isValidTab(tab)) return;

        const isEmpty = this.isEmptyTab(tab);
        const now = Date.now();

        const tabInfo = {
            id: tab.id,
            url: tab.url,
            title: tab.title || 'Untitled',
            favIconUrl: tab.favIconUrl,
            windowId: tab.windowId,
            index: tab.index,
            pinned: tab.pinned,
            active: tab.active,
            createdAt: now,
            lastActivated: tab.active ? now : 0,
            protected: false,
            timer: null,
            autoCloseTime: null,
            timerActive: false,
            isEmpty: isEmpty,
            emptyTabCreatedAt: isEmpty ? now : null,
            emptyTabTimer: null,
            totalTimeSpent: 0,
            activeStartTime: tab.active ? now : null,
            activationCount: tab.active ? 1 : 0,
            domain: this.extractDomain(tab.url)
        };

        if (isEmpty && this.emptyTabSettings.enabled) {
            tabInfo.emptyTabTimer = setTimeout(async () => {
                await this.cleanupEmptyTab(tab.id);
            }, this.emptyTabSettings.cleanupInterval);

        }

        this.tabData.set(tab.id, tabInfo);

        if (isEmpty && this.emptyTabSettings.enabled) {
            setTimeout(async () => {
                await this.setTabTimer(tab.id, 0, this.emptyTabSettings.cleanupInterval, true);
            }, 100);
        }
    }

    updateTabData(tabId, tab) {
        if (!this.tabData.has(tabId)) {
            this.trackTab(tab);
            return;
        }

        const existing = this.tabData.get(tabId);
        const updated = {
            ...existing,
            url: tab.url,
            title: tab.title || existing.title,
            favIconUrl: tab.favIconUrl,
            pinned: tab.pinned,
            active: tab.active
        };

        if (tab.active && !existing.active) {
            updated.lastActivated = Date.now();
            updated.frozen = false;
        }

        const wasEmpty = existing.isEmpty;
        const isNowEmpty = this.isEmptyTab(tab);

        if (wasEmpty && !isNowEmpty) {
            if (existing.emptyTabTimer) {
                clearTimeout(existing.emptyTabTimer);
                updated.emptyTabTimer = null;
            }
            if (existing.timerActive) {
                this.clearTabTimer(tabId);
            }
            updated.isEmpty = false;
            updated.emptyTabCreatedAt = null;
        } else if (!wasEmpty && isNowEmpty) {
            if (this.emptyTabSettings.enabled) {
                updated.isEmpty = true;
                updated.emptyTabCreatedAt = Date.now();
                updated.emptyTabTimer = setTimeout(async () => {
                    await this.cleanupEmptyTab(tabId);
                }, this.emptyTabSettings.cleanupInterval);

                setTimeout(async () => {
                    await this.setTabTimer(tabId, 0, this.emptyTabSettings.cleanupInterval, true);
                }, 100);
            }
        }

        if (existing.isEmpty && tab.active && !existing.active) {
            if (existing.emptyTabTimer) {
                clearTimeout(existing.emptyTabTimer);
                updated.emptyTabTimer = setTimeout(async () => {
                    await this.cleanupEmptyTab(tabId);
                }, this.emptyTabSettings.cleanupInterval);
            }
        }

        if (tab.url !== existing.url) {
            updated.urlChangeCount = (existing.urlChangeCount || 0) + 1;
        }

        if (tab.status === 'loading' && existing.status === 'complete') {
            updated.reloadCount = (existing.reloadCount || 0) + 1;
        }

        updated.status = tab.status;
        this.tabData.set(tabId, updated);
    }

    handleTabCreated(tab) {
        this.trackTab(tab);
        this.trackTabOpenAnalytics(tab);

        this.broadcastStatsUpdate();
    }

    handleTabUpdated(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' || changeInfo.url) {
            this.updateTabData(tabId, tab);

            if (changeInfo.url) {
                this.trackTabOpenAnalytics(tab);
            }
        }
    }

    handleTabRemoved(tabId) {
        const tabInfo = this.tabData.get(tabId);
        if (tabInfo && tabInfo.emptyTabTimer) {
            clearTimeout(tabInfo.emptyTabTimer);
        }

        if (tabInfo) {
            this.saveTabAnalyticsData(tabInfo);
        }

        this.tabData.delete(tabId);

        this.broadcastStatsUpdate();
    }

    async cleanupEmptyTab(tabId) {
        try {
            const tabInfo = this.tabData.get(tabId);
            if (!tabInfo) {
                return;
            }

            const tab = await chrome.tabs.get(tabId).catch(() => null);
            if (!tab) {
                this.tabData.delete(tabId);
                return;
            }

            const isCurrentlyEmpty = this.isEmptyTab(tab);
            const timeSinceCreation = Date.now() - (tabInfo.emptyTabCreatedAt || tabInfo.createdAt);
            const hoursSinceCreation = Math.round(timeSinceCreation / (1000 * 60 * 60));

            if (isCurrentlyEmpty &&
                tabInfo.isEmpty &&
                timeSinceCreation >= (23 * 60 * 60 * 1000) &&
                !tab.active &&
                !tab.pinned) {

                await chrome.tabs.remove(tabId);
                this.tabData.delete(tabId);
            } else {
                tabInfo.isEmpty = false;
                tabInfo.emptyTabCreatedAt = null;
                tabInfo.emptyTabTimer = null;
                this.tabData.set(tabId, tabInfo);

                const reason = !isCurrentlyEmpty ? 'no longer empty' :
                              tab.active ? 'currently active' :
                              tab.pinned ? 'is pinned' :
                              'not old enough';

            }
        } catch (error) {
            const tabInfo = this.tabData.get(tabId);
            if (tabInfo) {
                tabInfo.isEmpty = false;
                tabInfo.emptyTabTimer = null;
                this.tabData.set(tabId, tabInfo);
            }
        }
    }

    handleTabActivated(activeInfo) {
        const now = Date.now();

        for (const [tabId, info] of this.tabData.entries()) {
            if (info.active && info.activeStartTime && tabId !== activeInfo.tabId) {
                info.totalTimeSpent += now - info.activeStartTime;
                info.active = false;
                info.activeStartTime = null;
                this.tabData.set(tabId, info);
            }
        }

        const tabInfo = this.tabData.get(activeInfo.tabId);
        if (tabInfo) {
            tabInfo.lastActivated = now;
            tabInfo.active = true;
            tabInfo.activeStartTime = now;
            tabInfo.activationCount = (tabInfo.activationCount || 0) + 1;
            this.tabData.set(activeInfo.tabId, tabInfo);
        }
    }

    handleWindowFocusChanged(windowId) {
        const now = Date.now();

        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            for (const [tabId, info] of this.tabData.entries()) {
                if (info.active && info.activeStartTime) {
                    info.totalTimeSpent += now - info.activeStartTime;
                    info.activeStartTime = null;
                    this.tabData.set(tabId, info);
                }
            }
        } else {
            chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
                if (tabs.length > 0) {
                    const activeTab = tabs[0];
                    const tabInfo = this.tabData.get(activeTab.id);
                    if (tabInfo && tabInfo.active) {
                        tabInfo.activeStartTime = now;
                        this.tabData.set(activeTab.id, tabInfo);
                    }
                }
            });
        }
    }

    async handlePaymentSuccess(message) {
        try {

            const { sessionId, email, timestamp } = message;

            if (!email) {

                return;
            }

            const currentStatus = await chrome.storage.local.get(['isPremium', 'proWelcomeShown']);

            const shouldShowNotification = !currentStatus.isPremium && !currentStatus.proWelcomeShown;

            await chrome.storage.local.set({
                payment_success: {
                    sessionId: sessionId,
                    email: email,
                    timestamp: timestamp || new Date().toISOString(),
                    processed: false
                },
                userEmail: email,
                paymentInitiated: Date.now(),
                proWelcomeShown: true  
            });

            await this.checkAndActivateSubscription(email);

        } catch (error) {

        }
    }

    async checkAndActivateSubscription(email) {
        try {
            if (email && email.startsWith('fallback_')) {
                return false;
            }

            let isPro = false;
            let userData = null;

            try {
                const storedUserData = localStorage.getItem('tabmangment_user');
                if (storedUserData) {
                    userData = JSON.parse(storedUserData);
                    isPro = userData.isPro === true || userData.plan === 'pro';
                }
            } catch (e) {
                const stored = await chrome.storage.local.get(['isPremium', 'isPro', 'planType']);
                isPro = stored && (stored.isPremium || stored.isPro || stored.planType === 'pro');
            }

            if (isPro && userData) {
                await chrome.storage.local.set({
                    isPremium: true,
                    subscriptionActive: true,
                    planType: 'pro',
                    subscriptionId: userData.stripeSubscriptionId,
                    stripeCustomerId: userData.stripeCustomerId,
                    currentPeriodEnd: userData.currentPeriodEnd,
                    activatedAt: Date.now(),
                    userEmail: email
                });

                return true;
            }

            return false;

        } catch (error) {
            return false;
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            const { action, type } = message;
            const messageType = action || type;

            switch (messageType) {
                case 'PAYMENT_SUCCESS_BROADCAST':
                case 'PAYMENT_SUCCESS_STORAGE':
                    await this.handlePaymentSuccess(message);
                    sendResponse({ success: true });
                    break;

                case 'getTabData':
                    const tabs = await this.getAllTabData();
                    sendResponse({ success: true, data: tabs });
                    break;

                case 'getStats':
                case 'GET_STATS':
                    const stats = await this.getTabStats();
                    const realTimeStats = await this.getRealTimeStats();
                    sendResponse({ success: true, data: realTimeStats });
                    break;

                case 'PING':
                    sendResponse({ success: true, message: 'pong', timestamp: Date.now() });
                    break;

                case 'SUBSCRIPTION_UPDATE':
                    await this.handleSubscriptionUpdate(message);
                    sendResponse({ success: true });
                    break;

                case 'USER_DATA_SYNC':
                case 'USER_LOGGED_IN':
                    const userData = message.data || message.userData;

                    if (!userData?.userEmail && !userData?.email) {
                        sendResponse({ success: false, error: 'No email provided' });
                        break;
                    }

                    const loginData = {
                        userEmail: userData.userEmail || userData.email,
                        userName: userData.userName || userData.name || (userData.userEmail || userData.email).split('@')[0],
                        authToken: userData.authToken || message.token,
                        isPremium: userData.isPremium || userData.isPro || false,
                        isPro: userData.isPro || userData.isPremium || false,
                        planType: userData.planType || userData.plan || 'free',
                        subscriptionActive: userData.subscriptionActive || userData.isPro || false,
                        userId: userData.userId || userData.id || userData.userEmail || userData.email,
                        provider: userData.provider || 'email',
                        userPhoto: userData.userPhoto || userData.avatar || userData.photoURL || userData.picture || userData.photo || null,
                        proActivatedAt: userData.proActivatedAt || null,
                        deletionScheduledAt: userData.deletionScheduledAt || null,
                        loginTimestamp: Date.now(),
                        lastSyncTimestamp: userData.syncTimestamp || Date.now()
                    };

                    try {
                        await chrome.storage.local.set(loginData);

                        const verification = await chrome.storage.local.get(null);

                        if (verification.userEmail !== loginData.userEmail) {
                        }

                        sendResponse({ success: true, saved: verification });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                    break;

                case 'GET_TABS_DATA':
                    const tabsData = await this.getSmartTabsData();
                    sendResponse({ success: true, data: tabsData });
                    break;

                case 'CLEAN_INACTIVE_TABS':
                    const cleanResult = await this.cleanInactiveTabs();
                    sendResponse({ success: true, ...cleanResult });
                    break;

                case 'ENABLE_AUTO_CLEAN':
                    await chrome.storage.local.set({ autoCleanEnabled: true });
                    sendResponse({ success: true });
                    break;

                case 'SET_AUTO_CLOSE_TIME':
                    await chrome.storage.local.set({ autoCloseTime: message.time });
                    sendResponse({ success: true });
                    break;

                case 'THEME_UPDATE':
                case 'DASHBOARD_APPLY_THEME':
                    try {
                        const themeData = {
                            activeTheme: message.themeName || 'custom',
                            themeConfig: message.themeConfig
                        };
                        await chrome.storage.local.set(themeData);
                        sendResponse({ success: true });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                    break;

                case 'UPDATE_USER_NAME':
                    const currentData = await chrome.storage.local.get(['userName', 'userEmail']);
                    await chrome.storage.local.set({
                        userName: message.name,
                        lastNameUpdate: Date.now()
                    });
                    sendResponse({ success: true });
                    break;

                case 'USER_LOGGED_OUT':

                    if (message.confirmed !== true) {
                        sendResponse({ success: false, reason: 'not_confirmed' });
                        break;
                    }

                    const currentStorage = await chrome.storage.local.get(['userEmail']);

                    await chrome.storage.local.clear();

                    sendResponse({ success: true });
                    break;

                case 'protectTab':
                    await this.toggleProtection(message.tabId);
                    sendResponse({ success: true });
                    break;

                case 'closeTab':
                    await this.closeTab(message.tabId);
                    sendResponse({ success: true });
                    break;

                case 'switchToTab':
                    await this.switchToTab(message.tabId);
                    sendResponse({ success: true });
                    break;

                case 'setTimer':
                    await this.setTabTimer(message.tabId, message.minutes, message.milliseconds, message.usePolling);
                    sendResponse({ success: true });
                    break;

                case 'clearTimer':
                    await this.clearTabTimer(message.tabId);
                    sendResponse({ success: true });
                    break;

                case 'getTabData':
                    const tabData = this.tabData.get(message.tabId);
                    sendResponse({ success: true, tabData: tabData });
                    break;

                case 'getEmptyTabSettings':
                    sendResponse({ success: true, settings: this.emptyTabSettings });
                    break;

                case 'setEmptyTabSettings':
                    this.emptyTabSettings = { ...this.emptyTabSettings, ...message.settings };
                    sendResponse({ success: true, settings: this.emptyTabSettings });
                    break;

                case 'getEmptyTabCount':
                    const emptyTabCount = Array.from(this.tabData.values()).filter(tab => tab.isEmpty).length;
                    sendResponse({ success: true, count: emptyTabCount });
                    break;

                case 'ping':
                    sendResponse({ success: true, message: 'Service worker is alive' });
                    break;

                case 'getTabDurations':
                    const durations = this.getTabDurations();
                    sendResponse({ success: true, durations: durations });
                    break;

                case 'stripe-webhook':
                    await this.handleStripeWebhook(message);
                    sendResponse({ success: true });
                    break;

                case 'forceEnablePopup':
                    await chrome.action.setPopup({ popup: 'popup.html' });
                    sendResponse({ success: true });
                    break;

                case 'updateVisibility':
                    await this.updateExtensionVisibility();
                    sendResponse({ success: true });
                    break;

                case 'GET_ANALYTICS':
                    const storage = await chrome.storage.local.get(['tabAnalytics']);
                    const analytics = storage.tabAnalytics || {};
                    sendResponse({ success: true, data: analytics });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action: ' + messageType });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async getAllTabData() {
        try {
            const currentTabs = await chrome.tabs.query({});
            const tabDataArray = [];

            for (const tab of currentTabs) {
                if (!this.isValidTab(tab)) continue;

                let tabInfo = this.tabData.get(tab.id);
                if (!tabInfo) {
                    this.trackTab(tab);
                    tabInfo = this.tabData.get(tab.id);
                }

                tabDataArray.push({
                    ...tabInfo,
                    url: tab.url,
                    title: tab.title || 'Untitled',
                    favIconUrl: tab.favIconUrl,
                    active: tab.active
                });
            }

            return tabDataArray.sort((a, b) => {
                if (a.active && !b.active) return -1;
                if (!a.active && b.active) return 1;
                return a.index - b.index;
            });
        } catch (error) {
            return [];
        }
    }

    async getTabStats() {
        const tabs = await this.getAllTabData();

        return {
            scheduled: tabs.filter(tab => tab.timerActive && tab.autoCloseTime).length,
            active: tabs.filter(tab => tab.active).length,
            protected: tabs.filter(tab => tab.protected).length,
            scheduled: tabs.filter(tab => tab.timerActive && tab.autoCloseTime).length
        };
    }

    isValidTab(tab) {
        if (!tab.id || !tab.url) return false;
        if (tab.url.startsWith('chrome-extension:') ||
            tab.url.startsWith('moz-extension:') ||
            tab.url.startsWith('chrome://extensions/') ||
            tab.url.startsWith('chrome://settings/') ||
            tab.url.startsWith('chrome://flags/') ||
            tab.url.startsWith('chrome://history/') ||
            tab.url.startsWith('chrome://downloads/')) {
            return false;
        }
        if (tab.url.startsWith('chrome://newtab/') ||
            tab.url.startsWith('chrome://new-tab-page/') ||
            tab.url.startsWith('chrome-search://local-ntp/local-ntp.html')) {
            return true;
        }
        if (!tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('about:') &&
            !tab.url.startsWith('edge://')) {
            return true;
        }
        if (tab.url === 'about:blank' || tab.url === 'about:newtab') {
            return true;
        }
        return false;
    }

    async getRealTimeStats() {
        try {
            const allBrowserTabs = await chrome.tabs.query({});

            const validTabs = allBrowserTabs.filter(tab => this.isValidTab(tab));

            const trackedTabs = await this.getAllTabData();
            const storage = await chrome.storage.local.get(['tabsClosedAuto', 'totalTabsOpened', 'tabsClosedToday']);

            const today = new Date().toDateString();
            const tabsClosedToday = storage.tabsClosedToday || {};
            const autoClosedToday = tabsClosedToday[today] || 0;

            const totalClosed = storage.tabsClosedAuto || 0;
            const memorySaved = Math.round(totalClosed * 75); 

            return {
                totalTabs: validTabs.length, 
                autoClosed: autoClosedToday, 
                memorySaved: memorySaved,
                activeTabs: validTabs.filter(tab => tab.active).length,
                scheduledTabs: trackedTabs.filter(tab => tab.timerActive && tab.autoCloseTime).length,
                protectedTabs: trackedTabs.filter(tab => tab.protected).length,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                totalTabs: 0,
                autoClosed: 0,
                memorySaved: 0,
                activeTabs: 0,
                scheduledTabs: 0,
                protectedTabs: 0,
                timestamp: Date.now()
            };
        }
    }

    async handleSubscriptionUpdate(message) {
        try {
            const now = Date.now();
            const updateData = {
                isPremium: message.isPro || false,
                isPro: message.isPro || false,
                subscriptionActive: message.status === 'active',
                subscriptionStatus: message.status,
                planType: message.plan || (message.isPro ? 'pro' : 'free'),
                lastSyncTime: now,
                currentPeriodEnd: message.currentPeriodEnd, 
                subscriptionExpiry: message.currentPeriodEnd || (now + (365 * 24 * 60 * 60 * 1000)), 
                nextBillingDate: message.currentPeriodEnd || (now + (30 * 24 * 60 * 60 * 1000)), 
                subscriptionDate: now,
                subscriptionType: 'monthly',
                paymentConfirmed: true
            };

            if (message.user) {
                updateData.userData = message.user;
                updateData.userEmail = message.user.email;
            }

            await chrome.storage.local.set(updateData);

            await this.updateExtensionVisibility();

            this.broadcastStatsUpdate();

        } catch (error) {
        }
    }

    async broadcastStatsUpdate() {
        try {
            const stats = await this.getRealTimeStats();

            chrome.runtime.sendMessage({
                type: 'STATS_UPDATE',
                data: stats
            }).catch(() => {
            });
        } catch (error) {
        }
    }

    async toggleProtection(tabId) {
        const tabInfo = this.tabData.get(tabId);
        if (tabInfo) {
            const wasProtected = tabInfo.protected;
            tabInfo.protected = !tabInfo.protected;

            this.tabData.set(tabId, tabInfo);
        } else {
        }
    }

    async closeTab(tabId, isAutoClose = false) {
        try {
            const tabInfo = this.tabData.get(tabId);

            if (tabInfo && tabInfo.protected) {
                throw new Error('Cannot close protected tab');
            }

            await chrome.tabs.remove(tabId);
            this.tabData.delete(tabId);

            if (isAutoClose) {
                await this.trackAutoClosedTab();
            }
        } catch (error) {
            throw error;
        }
    }

    async trackAutoClosedTab() {
        try {
            const today = new Date().toDateString();
            const storage = await chrome.storage.local.get(['tabsClosedAuto', 'tabsClosedToday']);

            const totalClosed = (storage.tabsClosedAuto || 0) + 1;

            const tabsClosedToday = storage.tabsClosedToday || {};
            tabsClosedToday[today] = (tabsClosedToday[today] || 0) + 1;

            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toDateString();
            for (const day in tabsClosedToday) {
                if (new Date(day) < new Date(sevenDaysAgo)) {
                    delete tabsClosedToday[day];
                }
            }

            await chrome.storage.local.set({
                tabsClosedAuto: totalClosed,
                tabsClosedToday: tabsClosedToday
            });

            this.broadcastStatsUpdate();
        } catch (error) {
        }
    }

    async switchToTab(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab) {
                await chrome.tabs.update(tabId, { active: true });
                await chrome.windows.update(tab.windowId, { focused: true });
            }
        } catch (error) {
            throw error;
        }
    }

    async setTabTimer(tabId, minutes, milliseconds, usePolling = false) {
        try {
            let tabInfo = this.tabData.get(tabId);
            if (!tabInfo) {
                try {
                    const tab = await chrome.tabs.get(tabId);
                    if (this.isValidTab(tab)) {
                        this.trackTab(tab);
                        tabInfo = this.tabData.get(tabId);
                    }
                } catch (e) {
                }

                if (!tabInfo) {
                    throw new Error('Tab not found and could not be tracked');
                }
            }

            if (tabInfo.timer) {
                clearTimeout(tabInfo.timer);
            }

            const timeoutMs = milliseconds > 0 ? milliseconds : (minutes * 60 * 1000);
            const autoCloseTime = Date.now() + timeoutMs;

            const JS_TIMEOUT_LIMIT = 2147483647;

            if (usePolling || timeoutMs > JS_TIMEOUT_LIMIT) {
                const checkTimer = async () => {
                    const currentTime = Date.now();
                    if (currentTime >= autoCloseTime) {
                        try {
                            if (!tabInfo.protected) {
                                await this.closeTab(tabId, true); 
                            }
                        } catch (error) {
                        }
                    } else {
                        const timeRemaining = autoCloseTime - currentTime;
                        const nextCheckIn = Math.min(timeRemaining, 60 * 60 * 1000);
                        tabInfo.timer = setTimeout(checkTimer, nextCheckIn);
                    }
                };

                const timeRemaining = autoCloseTime - Date.now();
                const initialCheckIn = Math.min(timeRemaining, 60 * 60 * 1000);
                tabInfo.timer = setTimeout(checkTimer, initialCheckIn);

            } else {
                tabInfo.timer = setTimeout(async () => {
                    try {
                        if (!tabInfo.protected) {
                            await this.closeTab(tabId, true); 
                        }
                    } catch (error) {
                    }
                }, timeoutMs);
            }

            tabInfo.autoCloseTime = autoCloseTime;
            tabInfo.timerActive = true;
            this.tabData.set(tabId, tabInfo);

            const totalMinutes = Math.ceil(timeoutMs / (60 * 1000));
            const displayHours = Math.floor(totalMinutes / 60);
            const displayMinutes = totalMinutes % 60;

            let timeDisplay;
            if (displayHours > 0) {
                timeDisplay = `${displayHours}h ${displayMinutes}m`;
            } else {
                timeDisplay = `${totalMinutes} minutes`;
            }

        } catch (error) {
            throw error;
        }
    }

    async clearTabTimer(tabId) {
        try {
            const tabInfo = this.tabData.get(tabId);
            if (tabInfo && tabInfo.timer) {
                clearTimeout(tabInfo.timer);
                tabInfo.timer = null;
                tabInfo.autoCloseTime = null;
                tabInfo.timerActive = false;
                this.tabData.set(tabId, tabInfo);
            }
        } catch (error) {
            throw error;
        }
    }

    startAutoCloseMonitoring() {
        setInterval(async () => {
            await this.checkAndCloseInactiveTabs();
        }, 5 * 60 * 1000); 
    }

    async checkAndCloseInactiveTabs() {
        try {
            const storage = await chrome.storage.local.get(['isPro', 'isPremium', 'autoCloseTime']);
            const isPro = storage.isPro || storage.isPremium || false;
            const autoCloseTime = storage.autoCloseTime || 60; 

            if (!isPro) {
                return;
            }

            const allTabs = await chrome.tabs.query({});
            const now = Date.now();
            const autoCloseThreshold = autoCloseTime * 60 * 1000; 
            const tabsToClose = [];

            for (const tab of allTabs) {
                if (tab.active || tab.pinned || !this.isValidTab(tab)) {
                    continue;
                }

                if (this.tabData.has(tab.id)) {
                    const tabInfo = this.tabData.get(tab.id);
                    const lastActive = tabInfo.lastActivated || tabInfo.createdAt;
                    const inactiveTime = now - lastActive;

                    if (inactiveTime > autoCloseThreshold) {
                        tabsToClose.push(tab.id);
                    }
                }
            }

            if (tabsToClose.length > 0) {
                for (const tabId of tabsToClose) {
                    await this.closeTab(tabId, true); 
                }

                const newStorage = await chrome.storage.local.get(['totalTabsClosed']);
                const newTotal = (newStorage.totalTabsClosed || 0) + tabsToClose.length;

                await chrome.storage.local.set({
                    lastCleanupTime: Date.now(),
                    totalTabsClosed: newTotal
                });

                this.broadcastStatsUpdate();
            }

        } catch (error) {
        }
    }

    startEmptyTabMonitoring() {
        if (!this.emptyTabSettings.enabled) return;

        this.checkForEmptyTabs();

        setInterval(() => {
            this.checkForEmptyTabs();
        }, this.emptyTabSettings.checkInterval);

    }

    async checkForEmptyTabs() {
        try {
            const allTabs = await chrome.tabs.query({});
            let emptyTabCount = 0;

            for (const tab of allTabs) {
                if (this.isValidTab(tab) && this.isEmptyTab(tab)) {
                    const tabInfo = this.tabData.get(tab.id);

                    if (!tabInfo || !tabInfo.isEmpty) {
                        this.trackTab(tab);
                        emptyTabCount++;
                    }
                }
            }

            if (emptyTabCount > 0) {
            }
        } catch (error) {
        }
    }

    shouldShowNotification(type) {
        const settings = this.notificationSettings;
        const now = Date.now();
        const today = new Date().toDateString();

        if (!settings.enabled) return false;

        if (settings.dailyCounts.lastReset !== today) {
            settings.dailyCounts = {
                timer_warnings: 0,
                performance_alerts: 0,
                general_notifications: 0,
                lastReset: today
            };
        }

        if (settings.dailyCounts[type] >= settings.dailyLimits[type]) {
            return false;
        }

        const lastNotificationTime = settings.cooldowns.get(type);
        if (lastNotificationTime && (now - lastNotificationTime) < settings.minIntervalBetweenSameType) {
            return false;
        }

        return true;
    }

    recordNotification(type) {
        const settings = this.notificationSettings;
        const now = Date.now();

        settings.cooldowns.set(type, now);
        settings.dailyCounts[type]++;
    }

    startTimerNotificationMonitoring() {
        if (!this.notificationSettings.enabled) return;

        setInterval(() => {
            this.checkTimersForNotifications();
        }, this.notificationSettings.checkInterval);

    }

    async checkTimersForNotifications() {
        try {
            const now = Date.now();
            const warningThreshold = 65 * 1000;
            let closingSoonCount = 0;

            for (const [tabId, tabInfo] of this.tabData.entries()) {
                if (tabInfo.timerActive && tabInfo.autoCloseTime) {
                    const timeRemaining = tabInfo.autoCloseTime - now;

                    if (timeRemaining > 0 && timeRemaining <= 5 * 60 * 1000) {
                        closingSoonCount++;
                    }

                    if (this.notificationSettings.lastMinuteWarning &&
                        timeRemaining > 0 &&
                        timeRemaining <= warningThreshold &&
                        !this.notificationSettings.notifiedTabs.has(tabId) &&
                        this.shouldShowNotification('timer_warnings')) {

                        await this.showLastMinuteNotification(tabId, tabInfo, timeRemaining);
                        this.notificationSettings.notifiedTabs.add(tabId);
                        this.recordNotification('timer_warnings');
                    }

                    if (timeRemaining <= 0) {
                        this.notificationSettings.notifiedTabs.delete(tabId);
                    }
                }
            }

            this.broadcastClosingSoonCount(closingSoonCount);

        } catch (error) {
        }
    }

    async showLastMinuteNotification(tabId, tabInfo, timeRemaining) {
        try {
            const tab = await chrome.tabs.get(tabId).catch(() => null);
            if (!tab) return;

            const seconds = Math.ceil(timeRemaining / 1000);
            const title = tab.title || 'Unknown Tab';
            const domain = this.extractDomain(tab.url);

        } catch (error) {
        }
    }

    broadcastClosingSoonCount(count) {
        if (this.lastClosingSoonCount === count) return;
        this.lastClosingSoonCount = count;

        chrome.runtime.sendMessage({
            action: 'updateClosingSoonCount',
            count: count
        }).catch(() => {
        });
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return 'Unknown';
        }
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    handleInstalled(details) {
        if (details.reason === 'install') {
            chrome.tabs.create({
                url: 'https://tabmangment.com',
                active: true
            });
        }
    }

    async trackTabOpenAnalytics(tab) {
        try {
            if (!tab.url || tab.url.startsWith('chrome://')) {
                return;
            }

            const domain = new URL(tab.url).hostname;
            const data = await chrome.storage.local.get(['siteVisitCounts', 'totalTabsOpened']);

            const siteVisits = data.siteVisitCounts || {};
            const totalOpened = (data.totalTabsOpened || 0) + 1;

            siteVisits[domain] = (siteVisits[domain] || 0) + 1;

            await chrome.storage.local.set({
                siteVisitCounts: siteVisits,
                totalTabsOpened: totalOpened
            });

            this.sendAnalyticsNotification();
        } catch (error) {
        }
    }

    async trackTabAutoCloseAnalytics() {
        try {
            const data = await chrome.storage.local.get(['tabsClosedAuto']);
            const autosClosed = (data.tabsClosedAuto || 0) + 1;

            await chrome.storage.local.set({
                tabsClosedAuto: autosClosed
            });
        } catch (error) {
        }
    }

    sendAnalyticsNotification() {
        chrome.runtime.sendMessage({
            action: 'analyticsUpdated',
            timestamp: Date.now()
        }).catch(() => {
        });
    }

    async saveTabAnalyticsData(tabInfo) {
        try {
            if (!tabInfo.domain || tabInfo.domain === 'unknown') return;

            const now = Date.now();

            let finalTimeSpent = tabInfo.totalTimeSpent || 0;
            if (tabInfo.active && tabInfo.activeStartTime) {
                finalTimeSpent += now - tabInfo.activeStartTime;
            }

            if (finalTimeSpent < 5000) return;

            const data = await chrome.storage.local.get(['tabAnalytics', 'domainUsageTime']);
            const analytics = data.tabAnalytics || {};
            const domainTime = data.domainUsageTime || {};

            domainTime[tabInfo.domain] = (domainTime[tabInfo.domain] || 0) + finalTimeSpent;

            if (!analytics[tabInfo.domain]) {
                analytics[tabInfo.domain] = {
                    totalTime: 0,
                    totalTabs: 0,
                    avgTimePerTab: 0,
                    lastVisited: now,
                    activations: 0
                };
            }

            const domainAnalytics = analytics[tabInfo.domain];
            domainAnalytics.totalTime += finalTimeSpent;
            domainAnalytics.totalTabs += 1;
            domainAnalytics.avgTimePerTab = Math.round(domainAnalytics.totalTime / domainAnalytics.totalTabs);
            domainAnalytics.lastVisited = now;
            domainAnalytics.activations += tabInfo.activationCount || 1;

            await chrome.storage.local.set({
                tabAnalytics: analytics,
                domainUsageTime: domainTime
            });

        } catch (error) {
        }
    }

    getTabDurations() {
        const durations = {};
        const now = Date.now();

        for (const [tabId, tabInfo] of this.tabData.entries()) {
            let totalTime = tabInfo.totalTimeSpent || 0;

            if (tabInfo.active && tabInfo.activeStartTime) {
                totalTime += now - tabInfo.activeStartTime;
            }

            durations[tabId] = totalTime;
        }

        return durations;
    }

    getAllTabDurations() {
        return this.getTabDurations();
    }

    getTabDuration(tabId) {
        const durations = this.getTabDurations();
        return durations[tabId] || 0;
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    async updateExtensionVisibility() {
        try {
            const subscriptionData = await chrome.storage.local.get(['isPremium', 'subscriptionActive']);
            const isPremium = subscriptionData.isPremium || false;

            const allTabs = await chrome.tabs.query({});
            const validTabCount = allTabs.filter(tab => this.isValidTab(tab)).length;

            if (!isPremium) {
                if (validTabCount > 10) {
                    await chrome.action.setPopup({ popup: '' });
                } else {
                    await chrome.action.setPopup({ popup: 'popup.html' });
                }
            } else {
                await chrome.action.setPopup({ popup: 'popup.html' });
            }

        } catch (error) {
            try {
                await chrome.action.setPopup({ popup: 'popup.html' });
            } catch (fallbackError) {
            }
        }
    }

    async handleStripeWebhook(message) {
        try {

            chrome.runtime.sendMessage({
                type: 'stripe-webhook',
                ...message
            }).catch(() => {
            });

            await chrome.storage.local.set({
                lastWebhookEvent: {
                    ...message,
                    timestamp: Date.now()
                }
            });

            setTimeout(() => {
                this.updateExtensionVisibility();
            }, 1000);

        } catch (error) {
        }
    }
}

class SmartTabAnalytics {
    constructor() {
        this.isRunning = false;
        this.analyticsPaused = false;
        this.behaviorPatterns = new Map();
        this.userPreferences = new Map();
        this.activityThresholds = {
            inactive: 5 * 60 * 1000,
            abandoned: 30 * 60 * 1000,
            zombie: 2 * 60 * 60 * 1000
        };
        this.notificationCooldown = new Map();
        this.performanceMonitor = {
            memoryThreshold: 200,
            tabCountThreshold: 5,
            inactiveTimeThreshold: 2 * 60 * 1000,
            lastPerformanceBoost: 0,
            boostCooldown: 15 * 60 * 1000
        };
        this.init();
    }

    async init() {
        if (this.isRunning) return;

        await this.loadUserPatterns();
        this.startRealTimeAnalysis();
        this.isRunning = true;
    }

    async loadUserPatterns() {
        try {
            const stored = await chrome.storage.local.get(['userBehaviorPatterns', 'userPreferences']);

            if (stored.userBehaviorPatterns) {
                this.behaviorPatterns = new Map(Object.entries(stored.userBehaviorPatterns));
            }

            if (stored.userPreferences) {
                this.userPreferences = new Map(Object.entries(stored.userPreferences));
            }

        } catch (error) {
        }
    }

    startRealTimeAnalysis() {
        setInterval(() => {
            if (!this.analyticsPaused) {
                this.analyzeCurrentSession();
            }
        }, 30000);

        setInterval(() => {
            if (!this.analyticsPaused) {
                this.monitorPerformance();
            }
        }, 2 * 60 * 1000);

        setInterval(() => {
            if (!this.analyticsPaused) {
                this.performDeepAnalysis();
            }
        }, 5 * 60 * 1000);
    }

    async analyzeCurrentSession() {
        try {
            const tabs = await chrome.tabs.query({});
            const now = Date.now();

            const durations = tabManager.getAllTabDurations();

            const analysis = {
                totalTabs: tabs.length,
                activeTabs: tabs.filter(t => t.active).length,
                inactiveTabs: [],
                abandonedTabs: [],
                zombieTabs: [],
                recommendations: []
            };

            for (const tab of tabs) {
                if (!tab.url || tab.url.startsWith('chrome://')) {
                    continue;
                }

                const duration = durations[tab.id] || 0;
                const lastAccessed = now - duration;

                if (duration > this.activityThresholds.zombie) {
                    analysis.zombieTabs.push({
                        id: tab.id,
                        title: tab.title,
                        url: tab.url,
                        duration,
                        reason: 'zombie'
                    });
                } else if (duration > this.activityThresholds.abandoned) {
                    analysis.abandonedTabs.push({
                        id: tab.id,
                        title: tab.title,
                        url: tab.url,
                        duration,
                        reason: 'abandoned'
                    });
                } else if (duration > this.activityThresholds.inactive) {
                    analysis.inactiveTabs.push({
                        id: tab.id,
                        title: tab.title,
                        url: tab.url,
                        duration,
                        reason: 'inactive'
                    });
                }
            }

            await this.generateSmartRecommendations(analysis);

        } catch (error) {
        }
    }

    async generateSmartRecommendations(analysis) {
        const recommendations = [];

        if (analysis.zombieTabs.length > 0) {
            recommendations.push({
                type: 'optimize',
                priority: 'high',
                message: `🧟 ${analysis.zombieTabs.length} zombie tabs detected - unused for 2+ hours`,
                action: 'close_zombie_tabs',
                tabs: analysis.zombieTabs
            });
        }

        if (analysis.totalTabs > 20) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: `📊 ${analysis.totalTabs} tabs open - consider closing ${analysis.abandonedTabs.length} abandoned tabs`,
                action: 'close_abandoned_tabs',
                tabs: analysis.abandonedTabs
            });
        }

        if (analysis.inactiveTabs.length > 5) {
            recommendations.push({
                type: 'focus',
                priority: 'low',
                message: `🎯 ${analysis.inactiveTabs.length} inactive tabs may be distracting`,
                action: 'bookmark_inactive_tabs',
                tabs: analysis.inactiveTabs.slice(0, 5)
            });
        }

        for (const rec of recommendations) {
            if (rec.priority === 'high') {
                await this.sendSmartNotification(rec);
            }
        }

        await this.updateBehaviorPatterns(analysis);
    }

    async performDeepAnalysis() {
        try {

            const patterns = await this.analyzeDomainPatterns();

            const predictions = await this.predictTabBehavior(patterns);

            const insights = await this.generatePersonalizedInsights(patterns, predictions);

        } catch (error) {
        }
    }

    async analyzeDomainPatterns() {
        const tabs = await chrome.tabs.query({});
        const patterns = new Map();

        for (const tab of tabs) {
            if (!tab.url || tab.url.startsWith('chrome://')) {
                continue;
            }

            try {
                const domain = new URL(tab.url).hostname;
                const duration = tabManager.getTabDuration(tab.id) || 0;

                if (!patterns.has(domain)) {
                    patterns.set(domain, {
                        totalTime: 0,
                        visits: 0,
                        averageSession: 0,
                        lastVisit: Date.now(),
                        userValue: 'unknown'
                    });
                }

                const pattern = patterns.get(domain);
                pattern.totalTime += duration;
                pattern.visits += 1;
                pattern.averageSession = pattern.totalTime / pattern.visits;
                pattern.lastVisit = Date.now();

                if (pattern.averageSession > 10 * 60 * 1000) {
                    pattern.userValue = 'high';
                } else if (pattern.averageSession > 2 * 60 * 1000) {
                    pattern.userValue = 'medium';
                } else {
                    pattern.userValue = 'low';
                }

            } catch (e) {
                continue;
            }
        }

        return patterns;
    }

    async predictTabBehavior(patterns) {
        const predictions = [];

        for (const [domain, pattern] of patterns) {
            if (pattern.userValue === 'low' && pattern.averageSession < 30000) {
                predictions.push({
                    domain,
                    prediction: 'likely_close',
                    confidence: 0.8,
                    reason: 'Short average session time'
                });
            }

            if (pattern.userValue === 'high' && pattern.visits > 3) {
                predictions.push({
                    domain,
                    prediction: 'high_value',
                    confidence: 0.9,
                    reason: 'Frequent use with long sessions'
                });
            }
        }

        return predictions;
    }

    async generatePersonalizedInsights(patterns, predictions) {
        const insights = [];

        const highValueSites = predictions.filter(p => p.prediction === 'high_value');
        const likelyCloseSites = predictions.filter(p => p.prediction === 'likely_close');

        if (likelyCloseSites.length > 0) {
            insights.push({
                type: 'optimization',
                message: `AI suggests closing ${likelyCloseSites.length} low-engagement tabs`,
                domains: likelyCloseSites.map(p => p.domain)
            });
        }

        if (highValueSites.length > 0) {
            insights.push({
                type: 'productivity',
                message: `Focus mode: Keep ${highValueSites.length} high-value tabs active`,
                domains: highValueSites.map(p => p.domain)
            });
        }

        return insights;
    }

    async sendSmartNotification(recommendation) {
        if (!this.shouldShowNotification('general_notifications')) {
            return;
        }

        const notificationId = `smart_${recommendation.type}_${Date.now()}`;

        const lastNotification = this.notificationCooldown.get(recommendation.type);
        if (lastNotification && Date.now() - lastNotification < 15 * 60 * 1000) {
            return;
        }

        try {

            this.notificationCooldown.set(recommendation.type, Date.now());
            this.recordNotification('general_notifications');

            await chrome.storage.local.set({
                [`pending_recommendation_${notificationId}`]: recommendation
            });

        } catch (error) {
        }
    }

    async updateBehaviorPatterns(analysis) {
        try {
            const patternsObj = Object.fromEntries(this.behaviorPatterns);

            await chrome.storage.local.set({
                userBehaviorPatterns: patternsObj,
                lastAnalysis: {
                    timestamp: Date.now(),
                    totalTabs: analysis.totalTabs,
                    zombieTabs: analysis.zombieTabs.length,
                    abandonedTabs: analysis.abandonedTabs.length
                }
            });

        } catch (error) {
        }
    }

    async monitorPerformance() {
        try {
            const tabs = await chrome.tabs.query({});
            const now = Date.now();

            if (now - this.performanceMonitor.lastPerformanceBoost < this.performanceMonitor.boostCooldown) {
                return;
            }

            const performanceIssues = {
                highTabCount: false,
                inactiveTabs: [],
                memoryPressure: false,
                duplicatedTabs: []
            };

            if (tabs.length > this.performanceMonitor.tabCountThreshold) {
                performanceIssues.highTabCount = true;
            }

            for (const tab of tabs) {
                if (!tab.url || tab.url.startsWith('chrome://')) {
                    continue;
                }

                if (!tab.active) {
                    performanceIssues.inactiveTabs.push({
                        id: tab.id,
                        title: tab.title,
                        url: tab.url,
                        inactiveTime: 'Not currently active'
                    });
                }
            }

            const domainMap = new Map();
            for (const tab of tabs) {
                if (!tab.url || tab.url.startsWith('chrome://')) {
                    continue;
                }

                try {
                    const domain = new URL(tab.url).hostname;
                    if (!domainMap.has(domain)) {
                        domainMap.set(domain, []);
                    }
                    domainMap.get(domain).push(tab);
                } catch (e) {
                    continue;
                }
            }

            for (const [domain, domainTabs] of domainMap) {
                if (domainTabs.length > 1) {
                    performanceIssues.duplicatedTabs.push({
                        domain,
                        count: domainTabs.length,
                        tabs: domainTabs
                    });
                }
            }

            const estimatedMemoryUsage = this.estimateMemoryUsage(tabs);
            if (estimatedMemoryUsage > this.performanceMonitor.memoryThreshold) {
                performanceIssues.memoryPressure = true;
            }

            await this.generatePerformanceBoostRecommendations(performanceIssues, tabs, estimatedMemoryUsage);

        } catch (error) {
        }
    }

    estimateMemoryUsage(tabs) {
        let estimatedMemory = 0;

        for (const tab of tabs) {
            let tabMemory = 50;

            if (tab.url && (
                tab.url.includes('youtube.com') ||
                tab.url.includes('netflix.com') ||
                tab.url.includes('twitch.tv') ||
                tab.url.includes('spotify.com')
            )) {
                tabMemory += 100;
            }

            if (tab.active) {
                tabMemory += 50;
            }

            estimatedMemory += tabMemory;
        }

        return estimatedMemory;
    }

    async generatePerformanceBoostRecommendations(issues, tabs, memoryUsage) {
        if (issues.inactiveTabs.length === 0 && issues.duplicatedTabs.length === 0 && !issues.memoryPressure && !issues.highTabCount) {
            return;
        }

        let recommendation = {
            type: 'performance_boost',
            priority: 'medium',
            action: 'optimize_performance',
            issues: issues,
            estimatedMemorySaved: 0,
            message: ''
        };

        let memorySaved = 0;
        if (issues.inactiveTabs.length > 0) {
            memorySaved += issues.inactiveTabs.length * 50;
        }

        if (issues.duplicatedTabs.length > 0) {
            for (const duplicate of issues.duplicatedTabs) {
                memorySaved += (duplicate.count - 1) * 50;
            }
        }

        recommendation.estimatedMemorySaved = memorySaved;

        const totalTabsToOptimize = issues.inactiveTabs.length + issues.duplicatedTabs.reduce((sum, dup) => sum + (dup.count - 1), 0);

        if (issues.memoryPressure && issues.highTabCount) {
            recommendation.priority = 'high';
            recommendation.message = `🚀 Performance Boost: ${tabs.length} tabs using ~${Math.round(memoryUsage)}MB. Optimize ${totalTabsToOptimize} tabs to save ~${memorySaved}MB and improve browser speed.`;
        } else if (issues.duplicatedTabs.length > 0) {
            const totalDuplicates = issues.duplicatedTabs.reduce((sum, dup) => sum + (dup.count - 1), 0);
            recommendation.message = `🚀 Performance Boost: Found ${totalDuplicates} duplicate tabs from ${issues.duplicatedTabs.length} sites. Optimize now to save ~${memorySaved}MB memory and enjoy faster browsing.`;
        } else if (issues.inactiveTabs.length > 0) {
            recommendation.message = `🚀 Performance Boost: ${issues.inactiveTabs.length} inactive background tabs detected. Optimize now to save ~${memorySaved}MB memory and improve system performance.`;
        } else {
            recommendation.message = `🚀 Performance Boost: Browser optimization available. Free up memory and improve performance by managing background tabs.`;
        }

        await this.sendPerformanceBoostNotification(recommendation);
    }

    async sendPerformanceBoostNotification(recommendation) {
        if (!this.shouldShowNotification('performance_alerts')) {
            return;
        }

        const notificationId = `performance_boost_${Date.now()}`;

        try {

            this.performanceMonitor.lastPerformanceBoost = Date.now();
            this.recordNotification('performance_alerts');

            await chrome.storage.local.set({
                [`pending_performance_${notificationId}`]: recommendation
            });

        } catch (error) {
        }
    }
}

SmartTabAnalytics.prototype.executeRecommendation = async function(recommendation) {
    switch (recommendation.action) {
        case 'close_zombie_tabs':
            for (const tab of recommendation.tabs) {
                try {
                    await chrome.tabs.remove(tab.id);
                } catch (e) {
                }
            }
            if (tabManager.shouldShowNotification('general_notifications')) {
                tabManager.recordNotification('general_notifications');
            }
            break;

        case 'close_abandoned_tabs':
            for (const tab of recommendation.tabs) {
                try {
                    await chrome.tabs.remove(tab.id);
                } catch (e) {
                }
            }
            break;

        case 'bookmark_inactive_tabs':
            for (const tab of recommendation.tabs) {
                try {
                    await chrome.bookmarks.create({
                        title: tab.title,
                        url: tab.url
                    });
                    await chrome.tabs.remove(tab.id);
                } catch (e) {
                }
            }
            break;
    }
};

SmartTabAnalytics.prototype.executePerformanceBoost = async function(recommendation) {
    try {
        let tabsClosed = 0;
        let memorySaved = 0;

        const issues = recommendation.issues;

        if (issues.inactiveTabs && issues.inactiveTabs.length > 0) {
            const maxToClose = Math.max(1, Math.floor(issues.inactiveTabs.length * 0.7));

            for (let i = 0; i < maxToClose && i < issues.inactiveTabs.length; i++) {
                const tab = issues.inactiveTabs[i];
                try {
                    await chrome.tabs.remove(tab.id);
                    tabsClosed++;
                    memorySaved += 50;
                } catch (e) {
                }
            }
        }

        if (issues.duplicatedTabs && issues.duplicatedTabs.length > 0) {
            for (const duplicate of issues.duplicatedTabs) {
                if (duplicate.count >= 3) {
                    const sortedTabs = duplicate.tabs.sort((a, b) => b.id - a.id);

                    for (let i = 2; i < sortedTabs.length; i++) {
                        try {
                            await chrome.tabs.remove(sortedTabs[i].id);
                            tabsClosed++;
                            memorySaved += 50;
                        } catch (e) {
                        }
                    }
                }
            }
        }

        try {
            await chrome.browsingData.removeCache({
                "since": Date.now() - (60 * 60 * 1000)
            });

            await chrome.browsingData.removeDownloads({
                "since": Date.now() - (24 * 60 * 60 * 1000)
            });

            memorySaved += 50;
        } catch (e) {
        }

        if (tabsClosed === 0 && this.shouldShowNotification('performance_alerts')) {
            this.recordNotification('performance_alerts');
        } else if (tabsClosed > 0 && this.shouldShowNotification('performance_alerts')) {
            this.recordNotification('performance_alerts');
        }

    } catch (error) {

        if (this.shouldShowNotification('general_notifications')) {
            this.recordNotification('general_notifications');
        }
    }
};

TabManager.prototype.getSmartTabsData = async function() {
    try {
        const allTabs = await chrome.tabs.query({});
        const now = Date.now();
        const inactiveThreshold = 30 * 60 * 1000; 

        let inactiveTabs = 0;
        let estimatedMemory = 0;
        let heavyTabs = 0;

        const tabsWithAccess = [];
        const inactiveTabsList = [];

        for (const tab of allTabs) {
            if (this.tabData.has(tab.id)) {
                const tabInfo = this.tabData.get(tab.id);
                const inactiveTime = now - (tabInfo.lastActiveTime || tabInfo.createdAt);

                if (inactiveTime > inactiveThreshold && !tab.active) {
                    inactiveTabs++;
                    estimatedMemory += 15;

                    inactiveTabsList.push({
                        id: tab.id,
                        title: tab.title,
                        inactiveTime: inactiveTime
                    });
                }

                tabsWithAccess.push({
                    title: tab.title,
                    url: tab.url,
                    favIconUrl: tab.favIconUrl,
                    lastAccessed: tabInfo.lastActiveTime || tabInfo.createdAt
                });
            }
        }

        const isDeviceLagging = allTabs.length > 20 || inactiveTabs > 10;
        heavyTabs = inactiveTabs > 10 ? inactiveTabs : 0;

        tabsWithAccess.sort((a, b) => b.lastAccessed - a.lastAccessed);
        const recentTabs = tabsWithAccess.slice(0, 10);

        const storage = await chrome.storage.local.get([
            'autoCleanEnabled',
            'lastCleanupTime',
            'totalTabsClosed',
            'autoCloseTime',
            'isPro'
        ]);

        return {
            inactive: inactiveTabs,
            total: allTabs.length,
            memorySaved: estimatedMemory,
            autoCleanEnabled: storage.autoCleanEnabled || false,
            lastCleanup: storage.lastCleanupTime ? new Date(storage.lastCleanupTime) : null,
            totalManagedThisWeek: storage.totalTabsClosed || 0,
            recentTabs: recentTabs,
            isDeviceLagging: isDeviceLagging,
            heavyTabs: heavyTabs,
            inactiveTabsList: inactiveTabsList,
            autoCloseTime: storage.autoCloseTime || 60,
            isPro: storage.isPro || false
        };
    } catch (error) {
        return {
            inactive: 0,
            total: 0,
            memorySaved: 0,
            autoCleanEnabled: false,
            lastCleanup: null,
            totalManagedThisWeek: 0,
            recentTabs: [],
            isDeviceLagging: false,
            heavyTabs: 0,
            inactiveTabsList: [],
            autoCloseTime: 60,
            isPro: false
        };
    }
};

TabManager.prototype.cleanInactiveTabs = async function() {
    try {
        const allTabs = await chrome.tabs.query({});
        const now = Date.now();
        const inactiveThreshold = 30 * 60 * 1000; 
        const tabsToClose = [];

        for (const tab of allTabs) {
            if (this.tabData.has(tab.id) && !tab.active && !tab.pinned) {
                const tabInfo = this.tabData.get(tab.id);
                const inactiveTime = now - (tabInfo.lastActiveTime || tabInfo.createdAt);

                if (inactiveTime > inactiveThreshold) {
                    tabsToClose.push(tab.id);
                }
            }
        }

        if (tabsToClose.length > 0) {
            await chrome.tabs.remove(tabsToClose);
        }

        const storage = await chrome.storage.local.get(['totalTabsClosed']);
        const newTotal = (storage.totalTabsClosed || 0) + tabsToClose.length;

        await chrome.storage.local.set({
            lastCleanupTime: Date.now(),
            totalTabsClosed: newTotal
        });

        return {
            count: tabsToClose.length,
            memorySaved: tabsToClose.length * 15 
        };
    } catch (error) {
        return { count: 0, memorySaved: 0 };
    }
};

const tabManager = new TabManager();
const smartAnalytics = new SmartTabAnalytics();

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        if (changes.userEmail) {
        }

        if (changes.authToken) {
        }

        if (changes.userEmail && !changes.userEmail.newValue) {
            chrome.storage.local.get(null).then(allData => {
            });
        }
    }
});