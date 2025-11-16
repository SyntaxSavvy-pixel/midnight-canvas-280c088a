const CONFIG = {
    API: {
        BASE: 'https://tabmangment.com/api',
        CREATE_CHECKOUT: 'https://tabmangment.com/api/create-checkout',
        CHECK_STATUS: 'https://tabmangment.com/api/status',
        BILLING_PORTAL: 'https://tabmangment.com/api/billing-portal',
        CHECK_SEARCH_USAGE: 'https://tabmangment.com/api/check-search-usage',
        INCREMENT_SEARCH: 'https://tabmangment.com/api/increment-search'
    },
    PERPLEXITY: {
        SEARCH_URL: 'https://tabmangment.com/api/perplexity-search',
        MAX_RESULTS: 10,
        MAX_TOKENS: 25000,
        MAX_TOKENS_PER_PAGE: 2048,
        COUNTRY: 'US'
    },
    WEB: {
        AUTH_URL: 'https://tabmangment.com/new-authentication',
        DASHBOARD_URL: 'https://tabmangment.com/user-dashboard.html'
    },
    EXTENSION: {
        DEFAULT_TAB_LIMIT: 10,
        TIMER_CHECK_INTERVAL: 5000,
        STATUS_CHECK_INTERVAL: 300000,
        CACHE_TIMEOUT: 2000,
        SYNC_INTERVAL: 30000
    },
    SUPABASE: {
        URL: 'https://voislxlhfepnllamagxm.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvaXNseGxoZmVwbmxsYW1hZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTI4MDcsImV4cCI6MjA3NDU4ODgwN30.mDdMdGg4JAInS7kXNL6-edvRaQ_mVuMGRjU7rX-hMCM'
    },
    CLAUDE: {
        CHAT_URL: 'https://claude-chat-api.selfshios.workers.dev',
        MODEL: 'claude-3-5-sonnet-20241022',
        MAX_TOKENS: 1024,
        SYSTEM_PROMPT: 'You are a helpful AI assistant for Tabmangment, a tab management Chrome extension. Help users with their questions concisely and friendly. Keep responses short and to the point.'
    }
};

const API_BASE = CONFIG.API.BASE;
class TabmangmentPopup {
    constructor() {
        try {
            this.tabs = [];
            this.stats = { active: 0, scheduled: 0 };
            this.selectedTabId = null;
            this.updateInterval = null;
            this.tabLimit = 10;
            this.isPremium = false;
            this.totalTabCount = 0;
            this.hiddenTabCount = 0;
            this.realTimeTabCount = 0;
            this.favorites = [];
            this.isRendering = false;
            this.pendingUpdates = new Set();
            this.lastUpdateTime = 0;
            this.lastNotificationTime = 0;
            this.notificationCooldown = 3000;
            this.currentView = 'tabs';
            this.paymentStatusCache = null;
            this.paymentStatusCacheTime = 0;
            this.cacheTimeout = 2000;

            this.tabTimers = {};
            this.timerIntervals = {};

            this.init();

        } catch (error) {
            throw error;
        }
    }
    async init() {
        setTimeout(() => {
            this.hideLoader();
        }, 5000);

        try {
            this.setupEventListeners();


            const isAuthenticated = await this.checkAuthentication();

            if (!isAuthenticated) {

                const webLogin = await this.checkWebLoginStatus();

                if (webLogin) {
                    const syncedData = await chrome.storage.local.get(['userEmail', 'userName', 'isPremium', 'isPro']);

                    if (syncedData.userEmail) {
                        this.userEmail = syncedData.userEmail;
                        this.userName = syncedData.userName;
                        this.isPremium = syncedData.isPremium || syncedData.isPro || false;

                        this.updatePremiumUI();

                    } else {
                        this.hideLoader();
                        this.showLoginScreen();
                        return;
                    }
                } else {
                    this.hideLoader();
                    this.showLoginScreen();
                    return;
                }
            } else {
            }

            this.initializeEmailJS();
            this.setupPaymentListener();

            loadAndApplyTheme().catch(err => {
            });

            this.loadData().then(() => {
                this.render();
                this.hideLoader();
            }).catch(err => {
                this.hideLoader();
            });

            this.checkServiceWorkerHealth().catch(e => {});
            this.checkPendingActivation().catch(e => {});
            this.checkSubscription().catch(e => {});

            this.checkSubscriptionStatusBackground();

            this.initializeTimerSystem().catch(e => {});

            this.startRealTimeUpdates();
            this.startSubscriptionStatusRefresh();
        } catch (error) {
            this.showError('Failed to initialize extension: ' + error.message);
            this.hideLoader();
        }
    }
    hideLoader() {
        document.body.classList.add('loaded');
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 300);
        }
    }

    async initializeTimerSystem() {
        try {

            const stored = await chrome.storage.local.get(['tabTimers']);
            if (stored.tabTimers) {
                this.tabTimers = stored.tabTimers;

                this.cleanupExpiredTimers();

                this.startAllTimerCountdowns();
            }
        } catch (error) {
        }
    }
    async saveTimers() {
        try {
            await chrome.storage.local.set({ tabTimers: this.tabTimers });
        } catch (error) {
        }
    }
    cleanupExpiredTimers() {
        const now = Date.now();
        let hasChanges = false;
        for (const [tabId, timer] of Object.entries(this.tabTimers)) {
            if (timer.endTime <= now) {
                delete this.tabTimers[tabId];
                this.clearTimerInterval(tabId);
                hasChanges = true;
            }
        }
        if (hasChanges) {
            this.saveTimers();
        }
    }
    startAllTimerCountdowns() {
        for (const tabId of Object.keys(this.tabTimers)) {
            if (this.tabTimers[tabId].active) {
                this.startTimerCountdown(tabId);
            }
        }
    }
    startTimerCountdown(tabId) {

        this.clearTimerInterval(tabId);

        this.timerIntervals[tabId] = setInterval(() => {
            this.updateTimerDisplay(tabId);
        }, 1000);

        this.updateTimerDisplay(tabId);
    }
    clearTimerInterval(tabId) {
        if (this.timerIntervals[tabId]) {
            clearInterval(this.timerIntervals[tabId]);
            delete this.timerIntervals[tabId];
        }
    }
    updateTimerDisplay(tabId) {
        const timer = this.tabTimers[tabId];
        if (!timer || !timer.active) return;
        const now = Date.now();
        const remaining = timer.endTime - now;
        const displayElement = document.getElementById(`timer-display-${tabId}`);
        if (!displayElement) return;
        if (remaining <= 0) {

            this.handleTimerExpired(tabId);
            return;
        }

        const timeString = this.formatTimeRemaining(remaining);
        displayElement.innerHTML = `⏰ <strong>${timeString}</strong>`;

        if (remaining < 60000) {
            displayElement.classList.add('urgent');
            displayElement.style.color = '#dc2626';
        } else {
            displayElement.classList.remove('urgent');
            displayElement.style.color = '#ff6b6b';
        }
    }
    formatTimeRemaining(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    async handleTimerExpired(tabId) {
        try {

            delete this.tabTimers[tabId];
            this.clearTimerInterval(tabId);
            await this.saveTimers();

            await chrome.tabs.remove(parseInt(tabId));

            this.showMessage(`⏰ Timer expired - Tab closed automatically`, 'info');

            await this.refreshTabList();
        } catch (error) {
        }
    }
    async setTabTimer(tabId, duration, unit) {
        try {

            let durationMs;
            switch (unit) {
                case 'seconds':
                    durationMs = duration * 1000;
                    break;
                case 'minutes':
                    durationMs = duration * 60 * 1000;
                    break;
                case 'hours':
                    durationMs = duration * 60 * 60 * 1000;
                    break;
                case 'days':
                    durationMs = duration * 24 * 60 * 60 * 1000;
                    break;
                default:
                    durationMs = duration * 60 * 1000;
            }
            const endTime = Date.now() + durationMs;

            this.tabTimers[tabId] = {
                active: true,
                duration: durationMs,
                unit: unit,
                endTime: endTime,
                startTime: Date.now()
            };
            await this.saveTimers();
            this.startTimerCountdown(tabId);

            await this.refreshTabList();
            this.showMessage(`⏰ Timer set for ${duration} ${unit}`, 'success');
        } catch (error) {
            this.showMessage('Failed to set timer', 'error');
        }
    }
    async removeTabTimer(tabId) {
        try {
            delete this.tabTimers[tabId];
            this.clearTimerInterval(tabId);
            await this.saveTimers();

            await this.refreshTabList();
            this.showMessage('⏰ Timer removed', 'success');
        } catch (error) {
        }
    }
    async refreshTabList() {
        try {

            await this.loadData();
        } catch (error) {
        }
    }
    async showTimerModal(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        const hasExistingTimer = this.tabTimers[tabId] && this.tabTimers[tabId].active;
        const modal = document.createElement('div');
        modal.id = 'custom-timer-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        modal.innerHTML = `
            <div class="timer-modal-content" style="
                background: #ffffff;
                border-radius: 16px;
                padding: 0;
                width: 90%;
                max-width: 380px;
                max-height: 80vh;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                border: 1px solid #e5e7eb;
                transform: scale(0.9);
                transition: all 0.3s ease;
                overflow: hidden;
                position: relative;
                display: flex;
                flex-direction: column;
            ">
                <!-- Clean Header -->
                <div style="
                    background: #3b82f6;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    position: relative;
                    flex-shrink: 0;
                ">
                    <button id="timer-close-btn" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        width: 32px;
                        height: 32px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    ">×</button>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${hasExistingTimer ? 'Edit Timer' : 'Set Timer'}</div>
                    <div style="
                        font-size: 13px;
                        opacity: 0.9;
                        max-width: 250px;
                        margin: 0 auto;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${this.truncate(tab.title, 30)}</div>
                </div>
                <!-- Content -->
                <div style="
                    padding: 28px 24px 24px 24px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                ">
                    <!-- Custom Timer Input with Text Box and Dropdown -->
                    <div style="margin-bottom: 25px;">
                        <div style="font-size: 14px; font-weight: 500; margin-bottom: 15px; color: #374151;">Set Custom Timer</div>
                        <div style="
                            display: flex;
                            gap: 8px;
                            align-items: center;
                            padding: 12px;
                            background: #f9fafb;
                            border-radius: 12px;
                            border: 2px solid #e5e7eb;
                        ">
                            <input type="number" id="timer-value" min="0" max="999999" value="0" style="
                                flex: 1;
                                padding: 8px 12px;
                                border: 2px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 16px;
                                text-align: center;
                                background: white;
                                font-weight: 500;
                                max-width: 100px;
                            ">
                            <select id="timer-unit" style="
                                padding: 8px 12px;
                                border: 2px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 14px;
                                background: white;
                                font-weight: 500;
                                color: #374151;
                                cursor: pointer;
                            ">
                                <option value="seconds">seconds</option>
                                <option value="minutes" selected>minutes</option>
                                <option value="hours">hours</option>
                                <option value="days">days</option>
                            </select>
                        </div>
                        <div id="timer-preview" style="
                            font-size: 12px;
                            color: #6b7280;
                            margin-top: 8px;
                            text-align: center;
                            min-height: 16px;
                        "></div>
                    </div>
                    <!-- Enhanced Action Buttons -->
                    <div style="
                        display: flex;
                        gap: 12px;
                        margin-top: auto;
                        padding-top: 20px;
                        border-top: 1px solid rgba(226, 232, 240, 0.8);
                        flex-shrink: 0;
                    ">
                        <button id="timer-cancel-btn" style="
                            flex: 1;
                            padding: 12px 14px;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
                            color: #64748b;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                        ">Cancel</button>
                        ${hasExistingTimer ? `
                            <button id="timer-remove-btn" style="
                                flex: 1;
                                padding: 12px 14px;
                                border: 2px solid #fecaca;
                                border-radius: 10px;
                                background: linear-gradient(135deg, #fef2f2, #fef2f2);
                                color: #dc2626;
                                font-size: 13px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                            ">Remove Timer</button>
                        ` : ''}
                        <button id="timer-confirm-btn" style="
                            flex: 1.5;
                            padding: 12px 16px;
                            border: none;
                            border-radius: 10px;
                            background: linear-gradient(135deg, #4f46e5, #3b82f6);
                            color: white;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                        ">${hasExistingTimer ? 'Update Timer' : 'Set Timer'}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.initializeTimerModal(modal, tabId, tab);
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.timer-modal-content');
            if (content) {
                content.style.transform = 'scale(1)';
            }
        }, 10);
    }
    initializeTimerModal(modal, tabId, tab) {
        let currentUnit = 'minutes';
        let selectedValue = 15;
        const timerValueInput = modal.querySelector('#timer-value');
        const timerUnitSelect = modal.querySelector('#timer-unit');
        selectedValue = 15;
        currentUnit = 'minutes';
        timerValueInput.value = 15;
        timerUnitSelect.value = 'minutes';
        this.updateConfirmButton(modal, selectedValue, currentUnit);
        this.updateTimerPreview(modal, selectedValue, currentUnit);
        const updateFromCustomInput = () => {
            const customValue = parseInt(timerValueInput.value) || 0;
            const customUnit = timerUnitSelect.value;
            let isValid = true;
            let errorMsg = '';
            if (customUnit === 'days' && customValue > 100) {
                isValid = false;
                errorMsg = 'Maximum 100 days allowed';
            } else if (customUnit === 'hours' && customValue > 2400) {
                isValid = false;
                errorMsg = 'Maximum 2400 hours (100 days) allowed';
            } else if (customUnit === 'minutes' && customValue > 144000) {
                isValid = false;
                errorMsg = 'Maximum 144000 minutes (100 days) allowed';
            } else if (customUnit === 'seconds' && customValue > 8640000) {
                isValid = false;
                errorMsg = 'Maximum 8640000 seconds (100 days) allowed';
            }
            if (!isValid) {
                timerValueInput.style.borderColor = '#ef4444';
                timerValueInput.title = errorMsg;
                timerUnitSelect.style.borderColor = '#ef4444';
            } else {
                timerValueInput.style.borderColor = '#d1d5db';
                timerValueInput.title = '';
                timerUnitSelect.style.borderColor = '#d1d5db';
            }
            selectedValue = customValue;
            currentUnit = customUnit;
            this.updateConfirmButton(modal, selectedValue, currentUnit);
            this.updateTimerPreview(modal, selectedValue, currentUnit);
            if (selectedValue === 0) {
            } else {
            }
        };
        timerValueInput.addEventListener('input', updateFromCustomInput);
        timerUnitSelect.addEventListener('change', (e) => {
            const newUnit = e.target.value;
            const currentValue = parseInt(timerValueInput.value) || 0;
            if (currentValue > 0 && currentUnit !== newUnit) {
                const convertedValue = this.convertTimeUnits(currentValue, currentUnit, newUnit);
                if (convertedValue !== null) {
                    timerValueInput.value = convertedValue;
                }
            }
            updateFromCustomInput();
        });
        const closeBtn = modal.querySelector('#timer-close-btn');
        const cancelBtn = modal.querySelector('#timer-cancel-btn');
        const removeBtn = modal.querySelector('#timer-remove-btn');
        const confirmBtn = modal.querySelector('#timer-confirm-btn');
        const closeModal = () => {
            modal.style.opacity = '0';
            const content = modal.querySelector('.timer-modal-content');
            if (content) {
                content.style.transform = 'scale(0.9)';
            }
            setTimeout(() => modal.remove(), 300);
        };
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                await this.removeTabTimer(tabId);
                closeModal();
            });
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        confirmBtn.addEventListener('click', async () => {
            const finalValue = parseInt(timerValueInput.value) || 0;
            const finalUnit = timerUnitSelect.value;
            if (finalValue > 0) {
                await this.setTabTimer(tabId, finalValue, finalUnit);
                closeModal();
            } else {
                await this.removeTabTimer(tabId);
                closeModal();
            }
        });

        const existingTimer = this.tabTimers[tabId];
        if (existingTimer && existingTimer.active) {
            const remaining = Math.max(0, existingTimer.endTime - Date.now());
            if (remaining > 0) {
                let displayValue, displayUnit;
                const totalSeconds = Math.ceil(remaining / 1000);
                const totalMinutes = Math.ceil(remaining / (1000 * 60));
                const totalHours = Math.ceil(remaining / (1000 * 60 * 60));
                const totalDays = Math.ceil(remaining / (1000 * 60 * 60 * 24));
                if (totalDays >= 1 && totalHours % 24 === 0) {
                    displayValue = totalDays;
                    displayUnit = 'days';
                } else if (totalHours >= 1) {
                    displayValue = totalHours;
                    displayUnit = 'hours';
                } else if (totalMinutes >= 1) {
                    displayValue = totalMinutes;
                    displayUnit = 'minutes';
                } else {
                    displayValue = totalSeconds;
                    displayUnit = 'seconds';
                }
                timerValueInput.value = displayValue;
                timerUnitSelect.value = displayUnit;
                selectedValue = displayValue;
                currentUnit = displayUnit;
                this.updateConfirmButton(modal, selectedValue, currentUnit);
            }
        }
    }
    initializeEmailJS() {
        this.emailJSConfig = {
            serviceId: 'service_t3qaoaf',
            templateId: 'template_drtaxld',
            publicKey: 'LMg-8FsdXe2umT-av'
        };
        this.emailJSReady = true;
    }
    setupEventListeners() {
        const contactBtn = document.getElementById('contact-btn');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => this.showContactModal());
        }

        this.setupProfileMenu();

        this.setupSearchPanel();

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateClosingSoonCount') {
                this.updateClosingSoonCounter(message.count);
            }
            if (message.type === 'USER_LOGGED_IN' || message.type === 'USER_LOGIN') {
                window.location.reload();
            }
        });

        chrome.storage.onChanged.addListener(async (changes, areaName) => {

            if (areaName === 'local' && (changes.themeConfig || changes.activeTheme)) {
                const { themeConfig } = await chrome.storage.local.get(['themeConfig']);
                if (themeConfig) {
                    applyThemeToPopup(themeConfig);
                }
            }

            if (areaName === 'local' && changes.userEmail) {
                const newEmail = changes.userEmail.newValue;
                const oldEmail = changes.userEmail.oldValue;


                if (oldEmail && !newEmail) {
                    this.userEmail = null;
                    this.isPremium = false;
                    this.showLoginScreen();
                    return;
                }

                if (newEmail && !newEmail.startsWith('fallback_') && !newEmail.startsWith('user_')) {

                    const userData = await chrome.storage.local.get(['userEmail', 'userName', 'authToken', 'isPremium', 'isPro', 'planType']);

                    this.userEmail = userData.userEmail;
                    this.userName = userData.userName || userData.userEmail.split('@')[0];
                    this.isPremium = userData.isPremium || userData.isPro || false;

                    const loginScreen = document.getElementById('login-screen');
                    if (loginScreen) {
                        this.hideLoginScreen();
                    }

                    const header = document.querySelector('.header');
                    const tabsContainer = document.getElementById('tabs-container');
                    if (header) header.style.display = '';
                    if (tabsContainer) tabsContainer.style.display = '';

                    await this.loadData();
                    await this.render();

                    this.hideLoader();

                }
            }
        });
        this.setupControlButtons();
        this.setupContactModal();
        this.setupPremiumModal();
    }

    setupProfileMenu() {
        const profileBtn = document.getElementById('profile-btn');
        const profileMenu = document.getElementById('profile-menu');
        const viewDashboardBtn = document.getElementById('view-dashboard-btn');
        const menuLogoutBtn = document.getElementById('menu-logout-btn');

        this.loadProfileInfo();

        if (profileBtn && profileMenu) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = profileMenu.style.display === 'block';
                profileMenu.style.display = isVisible ? 'none' : 'block';
            });

            document.addEventListener('click', (e) => {
                if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
                    profileMenu.style.display = 'none';
                }
            });
        }

        if (viewDashboardBtn) {
            viewDashboardBtn.addEventListener('click', () => {
                chrome.tabs.create({ url: CONFIG.WEB.DASHBOARD_URL });
                if (profileMenu) profileMenu.style.display = 'none';
            });
        }

        if (menuLogoutBtn) {
            menuLogoutBtn.addEventListener('click', async () => {
                await this.handleLogout();
                if (profileMenu) profileMenu.style.display = 'none';
            });
        }
    }

    async getUserBookmarkKey() {
        try {
            const result = await chrome.storage.local.get(['userEmail']);
            if (result.userEmail) {
                return `bookmarks_${result.userEmail}`;
            }
            return 'bookmarks_guest';
        } catch (error) {
            return 'bookmarks_guest';
        }
    }

    async loadProfileInfo() {
        try {
            const result = await chrome.storage.local.get(['userEmail', 'userName', 'userPhoto']);
            const profileMenuName = document.getElementById('profile-menu-name');
            const profileMenuEmail = document.getElementById('profile-menu-email');
            const profileImage = document.getElementById('profile-image');
            const profileMenuImage = document.getElementById('profile-menu-image');

            if (result.userEmail) {
                const displayName = result.userName || result.userEmail.split('@')[0];

                if (profileMenuName) profileMenuName.textContent = displayName;
                if (profileMenuEmail) profileMenuEmail.textContent = result.userEmail;

                if (result.userPhoto) {
                    if (profileImage) profileImage.src = result.userPhoto;
                    if (profileMenuImage) profileMenuImage.src = result.userPhoto;
                }
            }
        } catch (error) {
            console.error('Error loading profile info:', error);
        }
    }

    async handleLogout() {
        try {
            await chrome.storage.local.remove([
                'userEmail',
                'userName',
                'userPhoto',
                'authToken',
                'isPremium',
                'isPro',
                'planType',
                'subscriptionStatus',
                'subscriptionActive'
            ]);

            this.userEmail = null;
            this.userName = null;
            this.isPremium = false;

            chrome.runtime.sendMessage({ type: 'USER_LOGGED_OUT' });

            this.showLoginScreen();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    setupSearchPanel() {
        if (this._searchPanelInitialized) {
            return;
        }
        this._searchPanelInitialized = true;

        const chatBtn = document.getElementById('chat-btn');
        const chatSection = document.getElementById('ai-chat-section');
        const tabsContainer = document.getElementById('tabs-container');
        const chatInput = document.getElementById('chat-input');
        const collapseBtn = document.getElementById('collapse-btn');
        const bookmarkBtn = document.getElementById('bookmark-all-btn');

        const showTabsView = () => {
            // Reset to tabs view if in bookmarks
            if (this.currentView === 'bookmarks') {
                this.currentView = 'tabs';
                // Re-render tabs content
                setTimeout(() => this.render(), 10);
            }

            // Fade out chat
            if (chatSection) {
                chatSection.classList.remove('active');
                setTimeout(() => {
                    chatSection.style.display = 'none';
                }, 300);
            }

            // Fade in tabs
            if (tabsContainer) {
                tabsContainer.style.display = 'block';
                setTimeout(() => tabsContainer.classList.add('active'), 10);
            }

            if (chatBtn) chatBtn.classList.remove('active');
        };

        const showChatView = async () => {
            // If in bookmarks view, switch back to tabs first
            if (this.currentView === 'bookmarks') {
                this.currentView = 'tabs';
            }

            // Fade out tabs
            if (tabsContainer) {
                tabsContainer.classList.remove('active');
                setTimeout(() => {
                    tabsContainer.style.display = 'none';
                }, 300);
            }

            // Fade in chat
            if (chatSection) {
                chatSection.style.display = 'flex';
                setTimeout(() => chatSection.classList.add('active'), 10);
            }

            if (chatBtn) chatBtn.classList.add('active');
            await this.updateChatUsageDisplay();
            setTimeout(() => {
                if (chatInput) chatInput.focus();
            }, 350);
        };

        // Initialize tabs as active on load
        if (tabsContainer) {
            tabsContainer.classList.add('active');
        }

        if (chatBtn) {
            chatBtn.addEventListener('click', async () => {
                const isChatActive = chatSection && chatSection.classList.contains('active');

                if (isChatActive) {
                    showTabsView();
                } else {
                    await showChatView();
                }
            });
        }

        this.showTabsView = showTabsView;
        this.showChatView = showChatView;

        // Chat functionality - will be implemented with Claude/Perplexity API
        const chatSendBtn = document.getElementById('chat-send-btn');
        const clearChatBtn = document.getElementById('clear-chat-btn');

        // Enable/disable send button based on input
        if (chatInput && chatSendBtn) {
            chatInput.addEventListener('input', () => {
                const hasText = chatInput.value.trim().length > 0;
                chatSendBtn.disabled = !hasText;
            });

            // Send on Enter (Shift+Enter for new line)
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.value.trim() && !chatSendBtn.disabled) {
                        this.sendChatMessage(chatInput.value.trim());
                        chatInput.value = '';
                        chatSendBtn.disabled = true;
                        // Auto-resize textarea back to 1 row
                        chatInput.rows = 1;
                    }
                }
            });

            // Auto-resize textarea
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = chatInput.scrollHeight + 'px';
            });
        }

        // Send button click
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => {
                if (chatInput && chatInput.value.trim()) {
                    this.sendChatMessage(chatInput.value.trim());
                    chatInput.value = '';
                    chatSendBtn.disabled = true;
                    chatInput.rows = 1;
                    chatInput.style.height = 'auto';
                }
            });
        }

        // Clear chat button
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.clearChat();
            });
        }
    }

    clearSearchResults() {
        const emptyState = document.getElementById('search-empty-state');
        const loading = document.getElementById('search-loading');
        const resultsList = document.getElementById('search-results-list');
        const resultsInfo = document.getElementById('search-results-info');
        const resultsCount = document.getElementById('search-results-count');

        document.body.classList.remove('has-search-results');

        if (emptyState) emptyState.style.display = 'flex';
        if (loading) loading.style.display = 'none';
        if (resultsList) resultsList.innerHTML = '';
        if (resultsCount) resultsCount.textContent = '0 results';
        if (resultsInfo) resultsInfo.style.display = 'none';
    }

    async checkSearchUsage() {
        try {
            const storage = await chrome.storage.local.get(['userEmail', 'isAdmin', 'planType']);
            const userEmail = storage.userEmail;
            const isAdmin = storage.isAdmin || storage.planType === 'admin';

            if (!userEmail) {
                return { count: 5, canSearch: false, isAdmin: false };
            }

            if (isAdmin) {
                return { count: 0, canSearch: true, isPro: true, isAdmin: true };
            }

            if (this.isPremium) {
                return { count: 0, canSearch: true, isPro: true, isAdmin: false };
            }

            const response = await fetch(CONFIG.API.CHECK_SEARCH_USAGE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userEmail })
            });

            if (!response.ok) {
                return { count: 5, canSearch: false, isAdmin: false };
            }

            const data = await response.json();

            const count = data.searchCount || 0;
            const canSearch = data.canSearch !== undefined ? data.canSearch : false;
            const isPro = data.isPro || false;

            return { count, canSearch, isPro, isAdmin: false };

        } catch (error) {
            return { count: 5, canSearch: false, isAdmin: false };
        }
    }

    async checkSearchUsageLocal() {
        const stored = await chrome.storage.local.get(['searchTimestamps']);
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

        let timestamps = stored.searchTimestamps || [];
        const originalLength = timestamps.length;
        timestamps = timestamps.filter(timestamp => timestamp > twentyFourHoursAgo);

        if (timestamps.length !== originalLength) {
            await chrome.storage.local.set({ searchTimestamps: timestamps });
        }

        const count = timestamps.length;
        const canSearch = count < 5;

        return { count, canSearch };
    }

    async incrementSearchUsage() {
        try {
            const storage = await chrome.storage.local.get(['userEmail']);
            const userEmail = storage.userEmail;

            if (!userEmail) {

                return;
            }

            const response = await fetch(CONFIG.API.INCREMENT_SEARCH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userEmail })
            });

            if (!response.ok) {

                throw new Error('Backend sync failed');
            }

            const data = await response.json();


        } catch (error) {

            throw error;
        }
    }

    async incrementSearchUsageLocal() {
        const stored = await chrome.storage.local.get(['searchTimestamps']);
        const now = Date.now();

        let timestamps = stored.searchTimestamps || [];
        timestamps.push(now);

        await chrome.storage.local.set({ searchTimestamps: timestamps });
    }

    async updateSearchUsageDisplay() {
        const usageInfo = document.getElementById('search-usage-info');
        if (!usageInfo) return;

        const { count, canSearch, isAdmin } = await this.checkSearchUsage();

        if (isAdmin) {
            usageInfo.innerHTML = '👑 Admin: Unlimited searches';
            usageInfo.className = 'search-usage-info admin';
            usageInfo.style.display = 'none';
        } else if (this.isPremium) {
            usageInfo.innerHTML = '✨ Pro Plan: Unlimited searches';
            usageInfo.className = 'search-usage-info';
            usageInfo.style.display = 'none';
        } else {
            const remaining = 5 - count;
            if (remaining > 0) {
                usageInfo.innerHTML = `${remaining} of 5 free searches remaining (24h)`;
                usageInfo.className = remaining <= 2 ? 'search-usage-info limited' : 'search-usage-info';
            } else {
                usageInfo.innerHTML = '🔒 Search limit reached. Upgrade to Pro for unlimited searches.';
                usageInfo.className = 'search-usage-info locked';
            }
            usageInfo.style.display = 'block';
        }
    }

    showSearchLimitModal() {
        const existingModal = document.getElementById('search-limit-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'search-limit-modal';
        modal.className = 'search-limit-modal';

        modal.innerHTML = `
            <div class="search-limit-content">
                <div class="search-limit-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 class="search-limit-title">Search Limit Reached</h3>
                <p class="search-limit-message">
                    You've used all 5 free searches in the last 24 hours. Upgrade to Pro for unlimited AI searches!
                </p>
                <div class="search-limit-actions">
                    <button class="search-limit-btn search-limit-close" id="search-limit-close">
                        Close
                    </button>
                    <button class="search-limit-btn search-limit-upgrade" id="search-limit-upgrade">
                        Upgrade to Pro
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = document.getElementById('search-limit-close');
        const upgradeBtn = document.getElementById('search-limit-upgrade');

        const closeModal = () => {
            modal.remove();
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                closeModal();
                chrome.tabs.create({
                    url: `${CONFIG.WEB.DASHBOARD_URL}#subscription`,
                    active: true
                });
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    async performAISearch(query, isRefresh = false) {
        if (this._searchInProgress) {
            return;
        }

        this._searchInProgress = true;

        const { canSearch } = await this.checkSearchUsage();

        if (!canSearch) {
            this._searchInProgress = false;
            this.showSearchLimitModal();
            await this.updateSearchUsageDisplay();
            return;
        }

        const emptyState = document.getElementById('search-empty-state');
        const loading = document.getElementById('search-loading');
        const resultsList = document.getElementById('search-results-list');
        const resultsInfo = document.getElementById('search-results-info');
        const resultsCount = document.getElementById('search-results-count');

        if (emptyState) emptyState.style.display = 'none';
        if (loading) loading.style.display = 'flex';
        if (resultsList) resultsList.innerHTML = '';
        if (resultsInfo) resultsInfo.style.display = 'none';

        try {
            const searchParams = {
                query: query,
                max_results: CONFIG.PERPLEXITY.MAX_RESULTS,
                max_tokens: CONFIG.PERPLEXITY.MAX_TOKENS,
                max_tokens_per_page: CONFIG.PERPLEXITY.MAX_TOKENS_PER_PAGE,
                country: CONFIG.PERPLEXITY.COUNTRY
            };

            if (isRefresh) {
                const recencyOptions = ['day', 'week', 'month'];
                searchParams.search_recency_filter = recencyOptions[Math.floor(Math.random() * recencyOptions.length)];

                searchParams._t = Date.now();
            }

            const { userEmail } = await chrome.storage.local.get(['userEmail']);

            const response = await fetch('https://tabmangment.com/api/perplexity-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    userEmail: userEmail || 'anonymous'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.limitReached) {
                    this.showSearchLimitModal();
                    await this.updateSearchUsageDisplay();
                    if (loading) loading.style.display = 'none';
                    return;
                }

                if (response.status === 500) {
                    if (loading) loading.style.display = 'none';
                    this.showMessage('Search service is temporarily unavailable. Please try again later.', 'error');
                    return;
                }

                throw new Error(errorData.error || `Search failed: ${response.statusText}`);
            }

            const responseData = await response.json();
            const data = responseData.data;

            await this.updateSearchUsageDisplay();

            if (loading) loading.style.display = 'none';

            if (data.results && data.results.length > 0) {
                this.displaySearchResults(data.results);

                if (resultsInfo) resultsInfo.style.display = 'block';
                if (resultsCount) {
                    resultsCount.textContent = `${data.results.length} results`;
                }
            } else {
                if (resultsList) {
                    resultsList.innerHTML = `
                        <div class="search-empty-state">
                            <p>No results found</p>
                            <span>Try a different search term</span>
                        </div>
                    `;
                }
            }
        } catch (error) {


            if (loading) loading.style.display = 'none';

            if (resultsList) {
                resultsList.innerHTML = `
                    <div class="search-empty-state">
                        <p>Search failed</p>
                        <span>${error.message}</span>
                    </div>
                `;
            }
        } finally {
            this._searchInProgress = false;
        }
    }

    displaySearchResults(results) {
        const resultsList = document.getElementById('search-results-list');
        const emptyState = document.getElementById('search-empty-state');
        if (!resultsList) return;

        resultsList.innerHTML = '';

        if (emptyState) {
            emptyState.style.display = 'none';
        }

        document.body.classList.add('has-search-results');

        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            const isAIAnswer = result.type === 'ai-answer';

            resultItem.className = isAIAnswer ? 'search-result-item ai-answer-result' : 'search-result-item';
            resultItem.dataset.url = result.url;

            if (isAIAnswer) {
                // AI Answer - show full content prominently
                resultItem.innerHTML = `
                    <div class="search-result-title">${this.escapeHtml(result.title)}</div>
                    <div class="ai-answer-content">${this.escapeHtml(result.snippet)}</div>
                    <div class="ai-answer-footer">
                        <span>Powered by Perplexity AI</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                `;
            } else {
                // Source link - traditional result
                let displayText = '';
                try {
                    const urlObj = new URL(result.url);
                    displayText = urlObj.hostname.replace('www.', '');
                } catch (e) {
                    displayText = result.url;
                }

                const description = result.snippet || result.description || displayText;

                resultItem.innerHTML = `
                    <div class="search-result-title">${this.escapeHtml(result.title)}</div>
                    <div class="search-result-url">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        ${this.escapeHtml(description)}
                    </div>
                `;
            }

            resultItem.addEventListener('click', () => {
                chrome.tabs.create({ url: result.url });
            });

            resultsList.appendChild(resultItem);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async sendChatMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const emptyState = document.getElementById('chat-empty-state');
        const typingIndicator = document.getElementById('typing-indicator');

        if (!chatMessages) return;

        // Hide empty state
        if (emptyState) emptyState.style.display = 'none';

        // Add user message
        this.addChatMessage('user', message);

        // Show typing indicator
        if (typingIndicator) typingIndicator.style.display = 'flex';

        try {
            // Build conversation history
            if (!this.chatHistory) {
                this.chatHistory = [];
            }

            this.chatHistory.push({
                role: 'user',
                content: message
            });

            // Call Claude API through backend proxy
            const response = await fetch(CONFIG.CLAUDE.CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: this.chatHistory,
                    model: CONFIG.CLAUDE.MODEL,
                    max_tokens: CONFIG.CLAUDE.MAX_TOKENS,
                    system: CONFIG.CLAUDE.SYSTEM_PROMPT,
                    userEmail: this.userEmail || 'anonymous'
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Hide typing indicator
            if (typingIndicator) typingIndicator.style.display = 'none';

            // Extract Claude's response
            const aiResponse = data.content?.[0]?.text || data.message || 'Sorry, I could not generate a response.';

            // Add to chat history
            this.chatHistory.push({
                role: 'assistant',
                content: aiResponse
            });

            // Keep only last 10 messages to avoid token limits
            if (this.chatHistory.length > 20) {
                this.chatHistory = this.chatHistory.slice(-20);
            }

            // Display AI response
            this.addChatMessage('ai', aiResponse);

        } catch (error) {
            // Hide typing indicator
            if (typingIndicator) typingIndicator.style.display = 'none';

            // Show error message
            this.addChatMessage('ai', 'Sorry, I encountered an error. Please try again later.');
        }
    }

    addChatMessage(type, text) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;

        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        if (type === 'user') {
            // Get user's profile image from header
            const profileImage = document.getElementById('profile-image');
            const userAvatarSrc = profileImage ? profileImage.src : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23cbd5e1"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/%3E%3C/svg%3E';

            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHtml(text)}</div>
                    <div class="message-time">${timeString}</div>
                </div>
                <div class="message-avatar user-avatar">
                    <img src="${userAvatarSrc}" alt="You" class="avatar-image">
                </div>
            `;
        } else {
            // Use extension icon for AI
            const extensionIcon = chrome.runtime.getURL('icons/icon-128.png');

            messageDiv.innerHTML = `
                <div class="message-avatar ai-avatar">
                    <img src="${extensionIcon}" alt="AI" class="avatar-image">
                </div>
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHtml(text)}</div>
                    <div class="message-time">${timeString}</div>
                </div>
            `;
        }

        chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        const emptyState = document.getElementById('chat-empty-state');

        if (!chatMessages) return;

        // Remove all message elements
        const messages = chatMessages.querySelectorAll('.chat-message');
        messages.forEach(msg => msg.remove());

        // Clear conversation history
        this.chatHistory = [];

        // Show empty state
        if (emptyState) emptyState.style.display = 'flex';
    }

    async updateChatUsageDisplay() {
        const usageBadge = document.getElementById('chat-usage-badge');
        const usageCount = usageBadge?.querySelector('.usage-count');
        if (!usageBadge || !usageCount) return;

        const { count, canSearch, isAdmin } = await this.checkSearchUsage();

        if (isAdmin) {
            usageCount.innerHTML = '👑 Unlimited messages';
            usageBadge.style.background = 'rgba(251, 191, 36, 0.1)';
            usageBadge.style.borderColor = 'rgba(251, 191, 36, 0.3)';
            usageBadge.style.color = '#FCD34D';
        } else if (this.isPremium) {
            usageCount.innerHTML = '✨ Unlimited messages';
            usageBadge.style.background = 'rgba(59, 130, 246, 0.1)';
            usageBadge.style.borderColor = 'rgba(59, 130, 246, 0.2)';
            usageBadge.style.color = '#60A5FA';
        } else {
            const remaining = 5 - count;
            if (remaining > 0) {
                usageCount.innerHTML = `${remaining} ${remaining === 1 ? 'message' : 'messages'} remaining`;
                if (remaining <= 2) {
                    usageBadge.style.background = 'rgba(251, 146, 60, 0.1)';
                    usageBadge.style.borderColor = 'rgba(251, 146, 60, 0.2)';
                    usageBadge.style.color = '#FB923C';
                } else {
                    usageBadge.style.background = 'rgba(59, 130, 246, 0.1)';
                    usageBadge.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                    usageBadge.style.color = '#60A5FA';
                }
            } else {
                usageCount.innerHTML = '🔒 Limit reached - Upgrade to Pro';
                usageBadge.style.background = 'rgba(239, 68, 68, 0.1)';
                usageBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                usageBadge.style.color = '#EF4444';
            }
        }
    }

    setupControlButtons() {
        const collapseBtn = document.getElementById('collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                if (this.isPremium) {
                    this.collapseAllTabs();
                } else {
                    this.showPremiumModal();
                }
            });
        }
        const bookmarkAllBtn = document.getElementById('bookmark-all-btn');
        if (bookmarkAllBtn) {
            bookmarkAllBtn.addEventListener('click', () => {
                if (!this.isPremium) {
                    this.showPremiumModal();
                    return;
                }

                // Toggle behavior
                if (this.currentView === 'bookmarks') {
                    // Currently in bookmarks, switch back to tabs
                    this.currentView = 'tabs';
                    const tabsContainer = document.getElementById('tabs-container');
                    const chatSection = document.getElementById('ai-chat-section');

                    // Ensure chat is closed
                    if (chatSection && chatSection.classList.contains('active')) {
                        chatSection.classList.remove('active');
                        setTimeout(() => {
                            chatSection.style.display = 'none';
                        }, 300);
                    }

                    // Fade out and re-render tabs
                    if (tabsContainer) {
                        tabsContainer.classList.remove('active');
                        setTimeout(() => {
                            this.render();
                            setTimeout(() => tabsContainer.classList.add('active'), 10);
                        }, 300);
                    }
                } else {
                    // Switch to bookmarks view
                    this.showBookmarkMenu();
                }
            });
        }
    }
    setupPremiumModal() {
    }
    setupContactModal() {
        const modal = document.getElementById('contact-modal');
        const closeBtn = document.getElementById('contact-close-btn');
        const cancelBtn = document.getElementById('contact-cancel');
        const form = document.getElementById('contact-form');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideContactModal());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideContactModal());
        }
        if (form) {
            form.addEventListener('submit', (e) => this.handleContactSubmit(e));
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideContactModal();
                }
            });
        }
    }
    setupPaymentListener() {

        window.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'PAYMENT_SUCCESS') {
                try {

                    await chrome.storage.local.set({
                        payment_success: {
                            timestamp: event.data.timestamp || new Date().toISOString(),
                            email: event.data.email,
                            sessionId: event.data.sessionId,
                            processed: false
                        },
                        userEmail: event.data.email
                    });

                    await this.checkAndActivateSubscription(event.data.email);

                    await this.render();
                    this.showMessage('🎉 Payment successful! Pro features activated!', 'success');
                } catch (error) {
                    this.showMessage('⚠️ Payment received but activation failed. Please refresh.', 'warning');
                }
            }
        });

        this.checkForUnprocessedPayments();
    }
    async checkPendingActivation() {
        try {

            const data = await chrome.storage.local.get(['userEmail', 'paymentInitiated', 'isPremium']);

            if (data.isPremium) {
                return;
            }

            if (!data.userEmail) {
                return;
            }

            if (data.paymentInitiated) {
                const timeSincePayment = Date.now() - data.paymentInitiated;
                const maxWaitTime = 60 * 60 * 1000;
                if (timeSincePayment < maxWaitTime) {
                    const status = await this.checkSubscriptionStatus(data.userEmail);
                    if (status.isActive) {
                        await chrome.storage.local.set({
                            isPremium: true,
                            subscriptionActive: true,
                            planType: 'pro',
                            subscriptionId: status.subscriptionId,
                            activatedAt: Date.now()
                        });
                        this.isPremium = true;
                        await this.render();
                        this.updateUIForProUser();
                        this.showMessage('🎉 Pro features activated!', 'success');

                        await chrome.storage.local.remove(['paymentInitiated']);
                    } else {
                    }
                }
            }
        } catch (error) {
        }
    }
    async checkForUnprocessedPayments() {
        try {
            const paymentData = await chrome.storage.local.get(['payment_success', 'userEmail']);
            if (paymentData.payment_success && !paymentData.payment_success.processed) {
                const paymentTime = new Date(paymentData.payment_success.timestamp);
                const now = new Date();
                const timeDiff = now - paymentTime;

                if (timeDiff < 30 * 60 * 1000) {
                    await this.checkAndActivateSubscription(paymentData.payment_success.email || paymentData.userEmail);
                }
            }
        } catch (error) {
        }
    }
    async checkAndActivateSubscription(email) {
        if (!email) return;
        try {
            const status = await this.checkSubscriptionStatus(email);
            if (status.isActive) {
                await this.upgradeToProPlan();

                const paymentData = await chrome.storage.local.get(['payment_success']);
                if (paymentData.payment_success) {
                    await chrome.storage.local.set({
                        payment_success: {
                            ...paymentData.payment_success,
                            processed: true
                        }
                    });
                }
            }
        } catch (error) {
        }
    }
    async showContactModal() {
        const modal = document.getElementById('contact-modal');
        if (modal) {
            modal.style.display = 'flex';
            const form = document.getElementById('contact-form');
            if (form) {
                form.reset();
            }

            const emailInput = document.getElementById('contact-email');
            if (emailInput) {
                try {
                    const storage = await chrome.storage.local.get(['userEmail']);
                    if (storage.userEmail) {
                        emailInput.value = storage.userEmail;
                        emailInput.readOnly = true;
                        emailInput.style.backgroundColor = '#f3f4f6';
                        emailInput.style.cursor = 'not-allowed';
                    }
                } catch (error) {
                    console.error('Error loading user email:', error);
                }
            }

            const nameInput = document.getElementById('contact-name');
            if (nameInput) {
                setTimeout(() => nameInput.focus(), 300);
            }
        }
    }
    hideContactModal() {
        const modal = document.getElementById('contact-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    async handleContactSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('contact-submit');
        const submitText = submitBtn.querySelector('.contact-submit-text');

        const formData = {
            name: document.getElementById('contact-name').value.trim(),
            email: document.getElementById('contact-email').value.trim(),
            subject: document.getElementById('contact-subject').value.trim(),
            message: document.getElementById('contact-message').value.trim()
        };

        try {
            if (!formData.name || !formData.email || !formData.subject || !formData.message) {
                throw new Error('Please fill in all required fields.');
            }

            submitBtn.disabled = true;
            submitText.innerHTML = '<div class="contact-loading"><div class="contact-spinner"></div><span>Sending...</span></div>';

            // Save to Supabase database using direct HTTP request
            const response = await fetch(`${CONFIG.SUPABASE.URL}/rest/v1/contact_messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE.ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    subject: formData.subject,
                    message: formData.message,
                    user_agent: navigator.userAgent,
                    created_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Supabase error:', response.status, errorText);
                throw new Error('Failed to send message. Please try again or email selfshios@gmail.com directly.');
            }

            this.showMessage('Message sent successfully! I will get back to you soon.', 'success');
            this.hideContactModal();
        } catch (error) {
            console.error('Contact form error:', error);
            this.showError(error.message || 'Failed to send message. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitText.textContent = 'Send Message';
        }
    }
    async sendEmailViaAPI(formData) {
        const emailData = {
            service_id: this.emailJSConfig.serviceId,
            template_id: this.emailJSConfig.templateId,
            user_id: this.emailJSConfig.publicKey,
            template_params: {
                user_name: formData.user_name,
                user_email: formData.user_email,
                subject: formData.subject,
                message: formData.message,
                timestamp: formData.timestamp,
                extension_version: formData.extension_version
            }
        };
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`EmailJS API error: ${response.status} ${errorText}`);
        }
        return response.text();
    }
    openEmailFallback(formData) {
        try {
            const subject = encodeURIComponent(`Tabmangment Extension: ${formData.subject}`);
            const body = encodeURIComponent(`Name: ${formData.user_name}\nEmail: ${formData.user_email}\nSubject: ${formData.subject}\nTime: ${formData.timestamp}\nExtension Version: ${formData.extension_version}\n\nMessage:\n${formData.message}\n\n---\nSent via Tabmangment Chrome Extension`);
            const mailtoUrl = `mailto:selfshios@gmail.com?subject=${subject}&body=${body}`;
            chrome.tabs.create({ url: mailtoUrl, active: true });
            this.showMessage('Opening your email client... Please send the pre-filled email.', 'warning');
            this.hideContactModal();
        } catch (fallbackError) {
            this.showError('Unable to send email. Please email selfshios@gmail.com directly with your message.');
        }
    }
    async checkServiceWorkerHealth() {
        if (!chrome.runtime) {
            return false;
        }
        try {
            const response = await this.sendMessageWithTimeout('ping', 1500);
            if (response && response.success) {
                return true;
            } else {
                throw new Error('Service worker ping failed - no valid response');
            }
        } catch (error) {
            if (error.message.includes('Receiving end does not exist')) {
            } else if (error.message.includes('Extension context invalidated')) {
            } else {
            }
            return false;
        }
    }
    showServiceWorkerWarning() {
        const existingWarning = document.querySelector('.sw-warning');
        if (existingWarning) return;
        const warningDiv = document.createElement('div');
        warningDiv.className = 'sw-warning';
        warningDiv.innerHTML = `
            <div style="
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 6px;
                padding: 12px;
                margin: 8px 0;
                font-size: 13px;
                color: #856404;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <div style="margin-bottom: 8px;">
                    ⚠️ <strong>Service Worker Unavailable</strong>
                </div>
                <div style="margin-bottom: 8px; font-size: 12px;">
                    Timer pause/resume features are disabled. Basic tab management is available.
                </div>
                <button id="reload-ext-btn" style="
                    padding: 6px 12px;
                    font-size: 12px;
                    border: 1px solid #ffeaa7;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 8px;
                ">🔄 Reload Extension</button>
                <button id="dismiss-warning" style="
                    padding: 6px 12px;
                    font-size: 12px;
                    border: 1px solid #ffeaa7;
                    background: transparent;
                    border-radius: 4px;
                    cursor: pointer;
                    color: #856404;
                ">Dismiss</button>
            </div>
        `;
        document.querySelector('.main-content')?.prepend(warningDiv);
    }
    showServiceWorkerError(errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                padding: 8px;
                margin: 8px 0;
                font-size: 12px;
                color: #721c24;
            ">
                🚨 Service Worker Error: ${errorMessage}
                <br><small>Timer and protection features may not work properly.</small>
                <button onclick="location.reload()" style="
                    margin-left: 8px;
                    padding: 2px 8px;
                    font-size: 11px;
                    border: 1px solid #f5c6cb;
                    background: white;
                    border-radius: 3px;
                    cursor: pointer;
                ">Reload Extension</button>
            </div>
        `;
        document.querySelector('.main-content')?.prepend(errorDiv);
    }
    async forceRestartServiceWorker() {
        try {
            await chrome.runtime.reload();
        } catch (error) {
            location.reload();
        }
    }
    async loadData() {
        try {
            const realTabs = await chrome.tabs.query({});
            const realTabIds = new Set(realTabs.map(tab => tab.id));
            let tabsResponse, statsResponse, subscriptionData;
            try {
                const promises = [
                    this.sendMessageWithTimeout('getTabData', 1500),
                    this.sendMessageWithTimeout('getStats', 1500),
                    chrome.storage.local.get([
                        'isPremium',
                        'subscriptionActive',
                        'subscriptionExpiry',
                        'planType',
                        'subscriptionDate'
                    ])
                ];
                [tabsResponse, statsResponse, subscriptionData] = await Promise.all(promises);
            } catch (messageError) {
                if (messageError.message.includes('No SW') ||
                    messageError.message.includes('Receiving end does not exist') ||
                    messageError.message.includes('Extension context invalidated')) {
                    this.showServiceWorkerWarning();
                } else {
                    try {
                        [tabsResponse, statsResponse] = await Promise.all([
                            this.sendMessageWithTimeout('getTabData', 5000),
                            this.sendMessageWithTimeout('getStats', 5000)
                        ]);
                    } catch (retryError) {
                        this.showServiceWorkerWarning();
                    }
                }
                subscriptionData = await chrome.storage.local.get([
                    'isPremium',
                    'subscriptionActive',
                    'subscriptionExpiry',
                    'planType',
                    'subscriptionDate'
                ]);
                await this.checkSubscriptionExpiry(subscriptionData);
                const updatedSubscriptionData = await chrome.storage.local.get(['isPremium', 'subscriptionActive']);
                this.isPremium = updatedSubscriptionData.isPremium || false;
                let validTabs = realTabs.filter(tab => this.isValidTab(tab));
                if (!this.isPremium) {
                    validTabs = this.prioritizeTabsForFreeUser(validTabs).slice(0, this.tabLimit);
                } else {
                }
                this.tabs = validTabs.map(tab => ({
                    id: tab.id,
                    title: tab.title || 'Untitled',
                    url: tab.url,
                    favIconUrl: tab.favIconUrl,
                    active: tab.active,
                    timerActive: false,
                    autoCloseTime: null,
                    remainingTime: null
                }));
                this.stats = {
                    active: this.tabs.filter(tab => tab.active).length,
                    paused: 0
                };
                await this.updateTabCount();
                return;
            }
            await this.checkSubscriptionExpiry(subscriptionData);
            const updatedSubscriptionData = await chrome.storage.local.get(['isPremium', 'subscriptionActive']);
            this.isPremium = updatedSubscriptionData.isPremium || false;
            if (tabsResponse && tabsResponse.success) {
                const extensionTabs = tabsResponse.data || [];
                let filteredTabs = extensionTabs.filter(tab => {
                    const exists = realTabIds.has(tab.id);
                    if (!exists) {
                    }
                    return exists;
                });
                if (!this.isPremium && filteredTabs.length > this.tabLimit) {
                    filteredTabs = this.prioritizeTabsForFreeUser(filteredTabs).slice(0, this.tabLimit);
                } else if (this.isPremium) {
                }
                this.tabs = filteredTabs.map(backendTab => {
                    const browserTab = realTabs.find(t => t.id === backendTab.id);
                    const mappedTab = {
                        ...backendTab,
                        title: browserTab?.title || backendTab.title,
                        active: browserTab?.active || backendTab.active,
                        timerActive: backendTab.timerActive || false,
                        autoCloseTime: backendTab.autoCloseTime || null,
                        timerDuration: backendTab.timerDuration || null,
                        timerStartTime: backendTab.timerStartTime || null,
                        remainingTime: backendTab.remainingTime || null
                    };
                    return mappedTab;
                });
                await this.syncWithBrowserTabs(realTabs);
            } else {
                let validTabs = realTabs.filter(tab => this.isValidTab(tab));
                if (!this.isPremium) {
                    validTabs = this.prioritizeTabsForFreeUser(validTabs).slice(0, this.tabLimit);
                } else {
                }
                this.tabs = validTabs.map(tab => ({
                    id: tab.id,
                    title: tab.title || 'Untitled',
                    url: tab.url,
                    favIconUrl: tab.favIconUrl,
                    active: tab.active,
                    timerActive: false,
                    autoCloseTime: null,
                    remainingTime: null
                }));
            }
            if (statsResponse && statsResponse.success) {
                this.stats = statsResponse.data || { active: 0, scheduled: 0 };
                if (!this.isPremium) {
                    this.stats = {
                        active: this.tabs.filter(tab => tab.active).length,
                        scheduled: this.tabs.filter(tab => tab.timerActive && tab.autoCloseTime).length,
                        paused: this.tabs.filter(tab => tab.paused).length
                    };
                }
            } else {
                this.stats = {
                    active: this.tabs.filter(tab => tab.active).length,
                    total: this.tabs.length,
                    paused: this.tabs.filter(tab => tab.paused).length
                };
            }
            await this.updateTabCount();
        } catch (error) {
            try {
                const fallbackTabs = await chrome.tabs.query({});
                let validTabs = fallbackTabs.filter(tab => this.isValidTab(tab));
                if (!this.isPremium) {
                    validTabs = this.prioritizeTabsForFreeUser(validTabs).slice(0, this.tabLimit);
                }
                this.tabs = validTabs.map(tab => ({
                    id: tab.id,
                    title: tab.title || 'Untitled',
                    url: tab.url,
                    favIconUrl: tab.favIconUrl,
                    active: tab.active,
                    timerActive: false,
                    autoCloseTime: null,
                    remainingTime: null
                }));
                this.stats = {
                    active: this.tabs.filter(tab => tab.active).length,
                    paused: 0
                };
                this.totalTabCount = fallbackTabs.length;
            } catch (fallbackError) {
                this.tabs = [];
                this.stats = { active: 0, scheduled: 0 };
                this.totalTabCount = 0;
            }
        }
    }
    async render() {
        this.renderStats();
        if (this.currentView === 'bookmarks') {
            await this.renderBookmarksView();
        } else {
            await this.renderTabs();
            this.renderTabLimitWarning();
        }

        this.removeAllProBadges();
        await this.updateSubscriptionHeader();
        await this.loadProfileInfo();
    }
    async checkSubscriptionExpiry(subscriptionData) {
        try {
            const subscriptionExpiry = subscriptionData.subscriptionExpiry;
            const now = Date.now();

            const refundStatus = await this.checkForRefunds(subscriptionData);
            if (refundStatus.wasRefunded) {
                await this.handleRefundDetected(refundStatus);
                return;
            }
            if (subscriptionData.isPremium && subscriptionExpiry && now > subscriptionExpiry) {
                const realTimeStatus = await this.validateSubscriptionWithStripe(subscriptionData.stripeCustomerId);
                if (!realTimeStatus.isActive) {
                    await this.handleSubscriptionDeactivation('expired');
                    subscriptionData.isPremium = false;
                    subscriptionData.subscriptionActive = false;
                    subscriptionData.planType = 'free';
                } else {

                    await chrome.storage.local.set({
                        subscriptionExpiry: realTimeStatus.nextBillingDate,
                        nextBillingDate: realTimeStatus.nextBillingDate,
                        subscriptionType: realTimeStatus.subscriptionType
                    });
                }
            }
            if (subscriptionData.isPremium && subscriptionData.subscriptionCancelled) {
                const cancelledAt = subscriptionData.cancellationDate || 0;
                const gracePeriod = subscriptionExpiry || (cancelledAt + (30 * 24 * 60 * 60 * 1000));
                if (now > gracePeriod) {
                    await this.handleSubscriptionDeactivation('cancelled');
                    subscriptionData.isPremium = false;
                    subscriptionData.subscriptionActive = false;
                }
            }
        } catch (error) {
        }
    }
    async checkForRefunds(subscriptionData) {
        try {
            const customerId = subscriptionData.stripeCustomerId;
            const installationId = subscriptionData.installationId;
            if (!customerId && !installationId) {
                return { wasRefunded: false };
            }
            try {
                const backendUrl = await this.getBackendUrl();
                if (!backendUrl) {
                    throw new Error('Backend disabled for offline mode');
                }
                const response = await fetch(`${backendUrl}/api/stripe/check-refunds`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    },
                    body: JSON.stringify({
                        customer_id: customerId,
                        installation_id: installationId,
                        extension_version: chrome.runtime.getManifest().version
                    }),
                    timeout: 10000
                });
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const refundData = await response.json();
                        if (refundData.success) {
                            return {
                                wasRefunded: refundData.has_refunds || false,
                                refundAmount: refundData.refund_amount || 0,
                                refundDate: refundData.refund_date || null,
                                reason: refundData.reason || 'stripe_refund'
                            };
                        }
                    }
                }
            } catch (apiError) {
            }
            const localRefundCheck = await chrome.storage.local.get(['refundProcessed', 'subscriptionRefunded']);
            if (localRefundCheck.refundProcessed || localRefundCheck.subscriptionRefunded) {
                return {
                    wasRefunded: true,
                    refundAmount: 0,
                    refundDate: Date.now(),
                    reason: 'local_refund_flag'
                };
            }
            return { wasRefunded: false };
        } catch (error) {
            return { wasRefunded: false };
        }
    }
    async handleRefundDetected(refundStatus) {
        try {
            await chrome.storage.local.set({
                isPremium: false,
                subscriptionActive: false,
                planType: 'free',
                refundProcessed: true,
                refundDate: refundStatus.refundDate || Date.now(),
                refundReason: refundStatus.reason || 'refund_detected',
                subscriptionExpiry: null,
                nextBillingDate: null,
                stripeCustomerId: null,
                subscriptionId: null,
                subscriptionCancelled: false
            });
            this.isPremium = false;
            await this.render();
            await this.renderSubscriptionPlan();
        } catch (error) {
        }
    }
    async handleSubscriptionDeactivation(reason = 'expired') {
        try {
            const messages = {
                expired: '📅 Subscription expired - reverted to Free Plan',
                cancelled: '🚫 Subscription cancelled - reverted to Free Plan',
                refunded: '💸 Subscription refunded - reverted to Free Plan'
            };
            await chrome.storage.local.set({
                isPremium: false,
                subscriptionActive: false,
                planType: 'free',
                deactivationReason: reason,
                deactivationDate: Date.now()
            });
            this.isPremium = false;
            await this.render();
            await this.renderSubscriptionPlan();
        } catch (error) {
        }
    }
    async validateSubscriptionWithStripe(customerId) {
        try {
            if (!customerId) {
                return { isActive: false, nextBillingDate: null, subscriptionType: 'monthly' };
            }
            try {
                const backendUrl = await this.getBackendUrl();
                if (!backendUrl) {
                    throw new Error('Backend disabled for offline mode');
                }
                const response = await fetch(`${backendUrl}/api/stripe/validate-subscription`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    },
                    body: JSON.stringify({
                        customer_id: customerId,
                        extension_version: chrome.runtime.getManifest().version
                    }),
                    timeout: 8000
                });
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        if (data.success) {
                            return {
                                isActive: data.subscription_active || false,
                                nextBillingDate: data.next_billing_date,
                                subscriptionType: data.subscription_type || 'monthly',
                                subscriptionStatus: data.subscription_status
                            };
                        }
                    }
                }
            } catch (apiError) {
            }
            const localCheck = await chrome.storage.local.get([
                'isPremium',
                'subscriptionActive',
                'nextBillingDate',
                'subscriptionType'
            ]);
            if (localCheck.isPremium || localCheck.subscriptionActive) {
                return {
                    isActive: true,
                    nextBillingDate: localCheck.nextBillingDate || this.calculateNextBillingDate(localCheck.subscriptionType || 'monthly'),
                    subscriptionType: 'monthly'
                };
            }
        } catch (error) {
            return {
                isActive: false,
                nextBillingDate: null,
                subscriptionType: 'monthly'
            };
        }
    }
    async checkForSubscriptionUpdates() {
        try {
            const result = await chrome.storage.local.get(['installationId', 'isPremium', 'lastStatusCheck', 'manualSubscriptionActive']);
            const installationId = result.installationId;
            const currentlyPremium = result.isPremium || false;
            const lastCheck = result.lastStatusCheck || 0;
            const manuallyActivated = result.manualSubscriptionActive || false;
            const now = Date.now();
            if (manuallyActivated || (currentlyPremium && (now - lastCheck < 10 * 60 * 1000))) {
                return;
            }
            const shouldCheck = installationId && (!currentlyPremium || (now - lastCheck > 10 * 60 * 1000));
            if (shouldCheck) {
                const status = await this.checkPaymentStatus(installationId);
                if (status.isPaid && !currentlyPremium) {
                    await this.activateSubscription(status);
                } else if (!status.isPaid && currentlyPremium && !manuallyActivated) {
                    await chrome.storage.local.set({
                        isPremium: false,
                        subscriptionActive: false,
                        planType: 'free'
                    });
                    this.isPremium = false;
                }
                await chrome.storage.local.set({ lastStatusCheck: now });
            }
        } catch (error) {
        }
    }
    calculateNextBillingDate(subscriptionType = 'monthly', fromDate = Date.now()) {
        const date = new Date(fromDate);
        switch (subscriptionType) {
            case 'yearly':

                date.setFullYear(date.getFullYear() + 1);
                return date.getTime();
            case 'monthly':
            default:

                date.setMonth(date.getMonth() + 1);
                return date.getTime();
        }
    }
    async getNextBillingDateText() {
        try {
            const result = await chrome.storage.local.get([
                'nextBillingDate',
                'subscriptionType',
                'subscriptionExpiry',
                'stripeCustomerId',
                'currentPeriodEnd',
                'subscriptionCancelled',
                'isPremium',
                'subscriptionActive',
                'activatedAt',
                'subscriptionId',
                'planType',
                'activatedBy'
            ]);
            if (result.subscriptionCancelled || !result.isPremium || !result.subscriptionActive) {
                return 'Subscription inactive';
            }
            let nextBillingDate = result.nextBillingDate || result.subscriptionExpiry || result.currentPeriodEnd;
            const subscriptionType = result.subscriptionType || 'monthly';

            if (result.subscriptionId) {
                const activatedDate = result.activatedAt ? new Date(result.activatedAt) : new Date();
                const formattedDate = activatedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

                if (result.subscriptionId.startsWith('paid_') || result.subscriptionId.startsWith('stripe_')) {
                    const userType = result.isAnonymousUser ? 'Anonymous user' : 'Registered user';
                    return `${userType} • Activated ${formattedDate}`;
                } else if (result.subscriptionId.startsWith('manual_')) {
                    return `Manual activation ${formattedDate}`;
                } else if (result.subscriptionId.startsWith('universal_') || result.subscriptionId.startsWith('test_')) {
                    return `Pro member since ${formattedDate}`;
                }

                return `Pro member since ${formattedDate}`;
            }

            if (result.userIdentifier) {
                const activatedDate = result.activatedAt ? new Date(result.activatedAt) : new Date();
                const formattedDate = activatedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

                const userDisplay = result.isAnonymousUser ? 'Pro User' : 'Member';
                return `${userDisplay} since ${formattedDate}`;
            }

            if (result.stripeCustomerId && (!nextBillingDate || this.shouldRefreshBillingData(nextBillingDate))) {
                try {
                    const realTimeData = await this.validateSubscriptionWithStripe(result.stripeCustomerId);
                    if (realTimeData.isActive && realTimeData.nextBillingDate) {
                        nextBillingDate = realTimeData.nextBillingDate;
                        await chrome.storage.local.set({
                            nextBillingDate: nextBillingDate,
                            subscriptionExpiry: nextBillingDate,
                            subscriptionType: realTimeData.subscriptionType
                        });
                    } else if (!realTimeData.isActive) {
                        return 'Subscription inactive';
                    }
                } catch (apiError) {
                }
            }
            if (nextBillingDate && nextBillingDate > Date.now()) {
                return this.formatBillingDate(nextBillingDate);
            } else {
                return 'Subscription status unclear';
            }
        } catch (error) {
            return 'Subscription active';
        }
    }
    async clearCancelledSubscriptionData() {
        try {
            await chrome.storage.local.remove([
                'nextBillingDate',
                'subscriptionExpiry',
                'currentPeriodEnd',
                'stripeCustomerId',
                'subscriptionType',
                'subscriptionCancelled',
                'cancellationDate',
                'isPremium',
                'subscriptionActive',
                'planType'
            ]);
            await chrome.storage.local.set({
                isPremium: false,
                subscriptionActive: false,
                planType: 'free'
            });
        } catch (error) {
        }
    }
    shouldRefreshBillingData(nextBillingDate) {
        if (!nextBillingDate) return true;
        const billingTime = new Date(nextBillingDate).getTime();
        const nowTime = Date.now();
        return billingTime < nowTime || billingTime < (nowTime - (45 * 24 * 60 * 60 * 1000));
    }
    formatBillingDate(nextBillingDate) {
        try {
            const date = new Date(nextBillingDate);
            const now = new Date();
            if (isNaN(date.getTime())) {
                return 'Subscription active';
            }
            const daysUntil = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            if (daysUntil < 0) {
                return `Billing overdue - Please update payment`;
            } else if (daysUntil === 0) {
                return `Billing today - ${formattedDate}`;
            } else if (daysUntil === 1) {
                return `Billing tomorrow - ${formattedDate}`;
            } else if (daysUntil <= 7) {
                return `Next billing: ${formattedDate} (${daysUntil} days)`;
            } else {
                return `Next billing: ${formattedDate}`;
            }
        } catch (error) {
            return 'Subscription active';
        }
    }
    async renderSubscriptionPlan() {
        const planIndicator = document.getElementById('plan-indicator');
        if (!planIndicator) return;
        if (this.isPremium) {
            planIndicator.className = 'plan-indicator pro-plan';
            const nextBillingText = await this.getNextBillingDateText();
            if (nextBillingText.includes('inactive') || nextBillingText.includes('unclear')) {
                await this.clearCancelledSubscriptionData();
                this.isPremium = false;
                planIndicator.className = 'plan-indicator free-plan';
                planIndicator.innerHTML = '<div class="plan-badge">FREE PLAN</div><div class="plan-description">Limited to 10 tabs</div>';
            } else {
                planIndicator.innerHTML = `<div class="plan-badge">PRO PLAN</div><div class="plan-description">${nextBillingText}</div>`;
            }
        } else {
            planIndicator.className = 'plan-indicator free-plan';
            planIndicator.innerHTML = `
                <div class="plan-badge">FREE PLAN</div>
                <div class="plan-description">Limited to 10 tabs</div>
            `;

        }
        this.updatePremiumButtonText();
        this.updateProBadges();
        await this.updateSubscriptionHeader();
    }
    async updateSubscriptionHeader() {
        const subscriptionInfo = document.getElementById('subscription-info');
        const planName = document.getElementById('plan-name');
        const billingDate = document.getElementById('billing-date');

        if (!subscriptionInfo || !planName || !billingDate) return;

        if (this.isPremium) {
            const stored = await chrome.storage.local.get(['isAdmin', 'planType', 'nextBillingDate', 'currentPeriodEnd']);
            const isAdmin = stored.isAdmin || stored.planType === 'admin';

            if (isAdmin) {
                planName.textContent = 'Admin Plan';
                subscriptionInfo.classList.add('pro');
                subscriptionInfo.classList.remove('free');
                billingDate.textContent = 'Unlimited Pro Access';
                billingDate.style.display = 'block';
            } else {
                planName.textContent = 'Pro Plan';
                subscriptionInfo.classList.add('pro');
                subscriptionInfo.classList.remove('free');

                const nextBilling = stored.nextBillingDate || stored.currentPeriodEnd;

                if (nextBilling) {
                    const date = new Date(nextBilling);
                    const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    billingDate.textContent = `Next billing: ${formattedDate}`;
                    billingDate.style.display = 'block';
                } else {
                    billingDate.textContent = '';
                    billingDate.style.display = 'none';
                }
            }
        } else {
            planName.textContent = 'Free Plan';
            subscriptionInfo.classList.add('free');
            subscriptionInfo.classList.remove('pro');
            billingDate.textContent = '';
            billingDate.style.display = 'none';
        }
    }
    updatePremiumButtonText() {
        const premiumBtn = document.getElementById('premium-btn');
        if (!premiumBtn) return;
        const btnText = premiumBtn.querySelector('#premium-btn-text') || premiumBtn.querySelector('.btn-text');
        if (this.isPremium) {
            if (btnText) btnText.textContent = 'Manage Pro';
            premiumBtn.title = 'Manage your subscription and billing';
            premiumBtn.classList.add('pro-active');
        } else {
            if (btnText) btnText.textContent = 'Upgrade Pro';
            premiumBtn.title = 'Upgrade to Pro for unlimited tabs and features';
            premiumBtn.classList.remove('pro-active');
        }
    }
    updateProBadges() {

        const proFeatureButtons = ['collapse-btn', 'bookmark-all-btn'];
        proFeatureButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (!button) {
                return;
            }
            const badge = button.querySelector('.pro-badge');

            if (this.isPremium) {
                if (badge) {
                    badge.style.display = 'none';
                }
                button.classList.remove('disabled');
                button.title = button.textContent.trim();
            } else {
                if (badge) {
                    badge.style.display = 'block';
                } else {
                }
                button.classList.add('disabled');
                const buttonText = button.textContent.replace('PRO', '').trim();
                button.title = `${buttonText} - Pro Feature`;
            }
        });

        this.updateActionButtonBadges();
    }
    updateActionButtonBadges() {

        const actionButtons = document.querySelectorAll('.action-btn[data-action="timer"], .action-btn[data-action="bookmark"]');
        actionButtons.forEach(button => {
            const existingBadge = button.querySelector('.pro-badge-mini');
            if (existingBadge) {
                existingBadge.remove();
            }
            if (!this.isPremium) {

                const proBadge = document.createElement('div');
                proBadge.className = 'pro-badge-mini';
                proBadge.textContent = 'PRO';
                proBadge.style.cssText = `
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                    color: white;
                    font-size: 8px;
                    font-weight: 600;
                    padding: 1px 3px;
                    border-radius: 3px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    z-index: 10;
                    pointer-events: none;
                `;
                button.style.position = 'relative';
                button.appendChild(proBadge);
            }
        });
    }
    handlePremiumButtonClick() {
        chrome.tabs.create({
            url: `${CONFIG.WEB.DASHBOARD_URL}#subscription`,
            active: true
        });
    }
    async handleLogout() {
        try {
            const searchPanel = document.getElementById('search-panel');
            const searchBtn = document.getElementById('search-btn');
            if (searchPanel) {
                searchPanel.classList.remove('active');
            }
            if (searchBtn) {
                searchBtn.classList.remove('active');
            }
            document.body.classList.remove('search-active');

            const allKeys = await chrome.storage.local.get(null);
            const bookmarkKeys = Object.keys(allKeys).filter(key => key.startsWith('bookmarks_'));
            const dataToPreserve = {};

            for (const key of bookmarkKeys) {
                dataToPreserve[key] = allKeys[key];
            }

            if (allKeys.themeConfig) {
                dataToPreserve.themeConfig = allKeys.themeConfig;
            }
            if (allKeys.activeTheme) {
                dataToPreserve.activeTheme = allKeys.activeTheme;
            }

            await chrome.storage.local.clear();

            if (Object.keys(dataToPreserve).length > 0) {
                await chrome.storage.local.set(dataToPreserve);
            }

            this.isPremium = false;
            this.userEmail = null;
            this.userName = null;
            this.tabs = [];
            this.stats = { active: 0, scheduled: 0 };
            this.totalTabCount = 0;

            if (window.logoutUser) {
                await window.logoutUser();
            }

            try {
                await chrome.runtime.sendMessage({ type: 'LOGOUT_USER' });
            } catch (e) {
            }


            this.showLoginScreen();
        } catch (error) {
            alert('Failed to logout. Please try again.');
        }
    }
    async checkWebLoginStatus() {
        try {
            const stored = await chrome.storage.local.get(['authToken', 'userEmail']);


            if (stored.userEmail) {
                try {
                    const storedUserData = localStorage.getItem('tabmangment_user');
                    if (storedUserData) {
                        const userData = JSON.parse(storedUserData);

                        const isAdmin = userData.email && userData.email.toLowerCase() === 'selfshios@gmail.com';

                        await chrome.storage.local.set({
                            userEmail: userData.email || stored.userEmail,
                            userName: userData.name || userData.email?.split('@')[0] || stored.userEmail.split('@')[0],
                            userPhoto: userData.photoURL || userData.picture || userData.photo || null,
                            isPremium: userData.isPro || isAdmin || userData.plan === 'pro' || false,
                            isPro: userData.isPro || isAdmin || userData.plan === 'pro' || false,
                            planType: isAdmin ? 'admin' : (userData.plan || 'free'),
                            subscriptionActive: userData.isPro || isAdmin || userData.plan === 'pro' || false,
                            isAdmin: isAdmin
                        });
                    }
                } catch (e) {
                }
                return true;
            } else {
            }

            const tabs = await chrome.tabs.query({ url: ['*://tabmangment.com/*', '*://tabmangment.netlify.app/*'] });

            if (tabs.length === 0) {
                return false;
            }


            const results = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    const user = localStorage.getItem('tabmangment_user');
                    const token = localStorage.getItem('tabmangment_token');
                    if (user && token) {
                        return { user: JSON.parse(user), token };
                    }
                    return null;
                }
            });

            const webData = results[0]?.result;

            if (webData && webData.user && webData.token) {
                const isAdmin = webData.user.email && webData.user.email.toLowerCase() === 'selfshios@gmail.com';

                await chrome.storage.local.set({
                    userEmail: webData.user.email,
                    userName: webData.user.name || webData.user.email.split('@')[0],
                    userPhoto: webData.user.photoURL || webData.user.picture || webData.user.photo || null,
                    authToken: webData.token,
                    isPremium: webData.user.isPro || isAdmin || false,
                    isPro: webData.user.isPro || isAdmin || false,
                    planType: isAdmin ? 'admin' : (webData.user.plan || 'free'),
                    subscriptionActive: webData.user.isPro || isAdmin || false,
                    userId: webData.user.id || webData.user.email,
                    provider: webData.user.provider || 'email',
                    loginTimestamp: Date.now(),
                    isAdmin: isAdmin
                });

                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    async checkAuthentication() {
        try {

            const allData = await chrome.storage.local.get(null);

            if (allData.userEmail && (allData.userEmail.startsWith('fallback_') || allData.userEmail.startsWith('user_'))) {
                await chrome.storage.local.remove(['userEmail', 'authToken', 'fallbackGenerated', 'emailDetectionError']);
                const cleanData = await chrome.storage.local.get(null);
                return false;
            }

            const stored = await chrome.storage.local.get(['userEmail', 'authToken', 'userName', 'isPremium', 'isPro', 'planType', 'currentPeriodEnd', 'subscriptionStatus']);

            if (stored.userEmail &&
                !stored.userEmail.startsWith('fallback_') &&
                !stored.userEmail.startsWith('user_')) {
                this.userEmail = stored.userEmail;
                this.userName = stored.userName || stored.userEmail.split('@')[0];

                this.isPremium = stored.isPremium || stored.isPro || false;

                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }
    showLoginScreen() {
        const existingLoginScreen = document.getElementById('login-screen');
        if (existingLoginScreen) {
            return;
        }

        const header = document.querySelector('.header');
        const tabsContainer = document.getElementById('tabs-container');
        const tabLimitWarningContainer = document.getElementById('tab-limit-warning');
        const tabLimitWarning = document.querySelector('.tab-limit-warning-content');
        const statsActionsRow = document.querySelector('.stats-actions-row');
        const popupMainContent = document.querySelector('.popup-main-content');

        if (header) header.style.display = 'none';
        if (tabsContainer) tabsContainer.style.display = 'none';
        if (tabLimitWarningContainer) tabLimitWarningContainer.style.display = 'none';
        if (tabLimitWarning) tabLimitWarning.remove();
        if (statsActionsRow) statsActionsRow.style.display = 'none';
        if (popupMainContent) popupMainContent.style.display = 'none';

        let autoLogin = false;
        let userName = null;
        try {
            const webUserData = localStorage.getItem('tabmangment_user');
            const webToken = localStorage.getItem('tabmangment_token');
            if (webUserData && webToken) {
                const userData = JSON.parse(webUserData);
                userName = userData.name || userData.email?.split('@')[0] || 'User';
                autoLogin = true;
            }
        } catch (e) {
            autoLogin = false;
        }

        const loginScreen = document.createElement('div');
        loginScreen.id = 'login-screen';
        loginScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            background: #f8fafc;
            color: #1e293b;
            text-align: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        if (autoLogin) {
            loginScreen.innerHTML = `
                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    .login-logo-wrapper {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 24px;
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                        border-radius: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
                        animation: pulse 2s infinite;
                    }
                    .login-logo-wrapper img {
                        width: 48px;
                        height: 48px;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid #e2e8f0;
                        border-top-color: #6366f1;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                        margin: 24px auto;
                    }
                </style>
                <div class="login-logo-wrapper">
                    <img src="icons/icon-48.png" alt="Tabmangment">
                </div>
                <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1e293b;">
                    Automatically Logging In
                </h2>
                <p style="margin: 0 0 16px 0; font-size: 15px; color: #64748b; font-weight: 500;">
                    Welcome back, ${userName}!
                </p>
                <div class="spinner"></div>
                <p id="countdown-text" style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                    Signing you in...
                </p>
            `;

            document.body.appendChild(loginScreen);

            let countdown = 3;
            const countdownEl = document.getElementById('countdown-text');

            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0 && countdownEl) {
                    countdownEl.textContent = `Signing you in... ${countdown}`;
                }
            }, 1000);

            setTimeout(async () => {
                clearInterval(countdownInterval);
                const success = await this.checkWebLoginStatus();
                if (success) {
                    window.location.reload();
                }
            }, 3000);

        } else {
            loginScreen.innerHTML = `
                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .login-card {
                        max-width: 360px;
                        width: 100%;
                        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .login-logo-container {
                        width: 72px;
                        height: 72px;
                        margin: 0 auto 20px;
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                        border-radius: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 32px rgba(99, 102, 241, 0.25);
                    }
                    .login-logo-container img {
                        width: 44px;
                        height: 44px;
                    }
                    .login-button {
                        width: 100%;
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                        color: white;
                        border: none;
                        padding: 14px 24px;
                        border-radius: 12px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
                        transition: all 0.2s ease;
                    }
                    .login-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
                    }
                    .login-button:active {
                        transform: translateY(0);
                    }
                </style>
                <div class="login-card">
                    <div class="login-logo-container">
                        <img src="icons/icon-48.png" alt="Tabmangment">
                    </div>
                    <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1e293b;">
                        Welcome to Tabmangment
                    </h2>
                    <p style="margin: 0 0 32px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                        Manage your browser tabs efficiently
                    </p>
                    <button id="login-btn" class="login-button">
                        Sign In
                    </button>
                    <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8;">
                        Your tabs will sync across all devices
                    </p>
                </div>
            `;

            document.body.appendChild(loginScreen);

            setTimeout(() => {
                const loginBtn = document.getElementById('login-btn');
                if (loginBtn) {
                    loginBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        chrome.tabs.create({
                            url: CONFIG.WEB.AUTH_URL,
                            active: true
                        });
                    });
                }
            }, 100);
        }
    }

    hideLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.remove();
        }

        const header = document.querySelector('.header');
        const tabsContainer = document.getElementById('tabs-container');
        const tabLimitWarningContainer = document.getElementById('tab-limit-warning');
        const statsActionsRow = document.querySelector('.stats-actions-row');
        const popupMainContent = document.querySelector('.popup-main-content');

        if (header) header.style.display = '';
        if (tabsContainer) tabsContainer.style.display = '';
        if (tabLimitWarningContainer) tabLimitWarningContainer.style.display = '';
        if (statsActionsRow) statsActionsRow.style.display = '';
        if (popupMainContent) popupMainContent.style.display = '';
    }

    renderStats() {
        const activeEl = document.getElementById('active-tabs');
        const scheduledEl = document.getElementById('scheduled-tabs');

        if (activeEl) {
            const count = this.realTimeTabCount || 0;
            activeEl.textContent = count > 100 ? '99+' : count;

            const labelEl = activeEl.nextElementSibling;
            if (labelEl && labelEl.classList.contains('count-label')) {
                if (!this.isPremium && this.hiddenTabCount > 0) {
                    labelEl.innerHTML = `Open Tabs <span class="hidden-count">${this.hiddenTabCount} hidden</span>`;
                } else {
                    labelEl.textContent = 'Open Tabs';
                }
            }
        }

        if (scheduledEl) scheduledEl.textContent = this.stats.scheduled || 0;
    }

    updatePremiumUI() {
        if (this.isPremium) {
            document.body.classList.add('user-has-premium');
        } else {
            document.body.classList.remove('user-has-premium');
        }
    }
    updateClosingSoonCounter(count) {
        const scheduledEl = document.getElementById('scheduled-tabs');
        if (!scheduledEl) return;
        const currentCount = parseInt(scheduledEl.textContent) || 0;
        if (currentCount === count) return;
        scheduledEl.textContent = count;
        this.stats.scheduled = count;
        if (count > 0) {
            scheduledEl.style.color = '#ef4444';
            scheduledEl.style.fontWeight = '600';
        } else {
            scheduledEl.style.color = '';
            scheduledEl.style.fontWeight = '';
        }
    }
    async updateTabCount() {
        try {
            const allTabs = await chrome.tabs.query({});
            const validTabs = allTabs.filter(tab => this.isValidTab(tab));
            this.realTimeTabCount = validTabs.length;
            this.totalTabCount = validTabs.length;
            if (!this.isPremium) {
                this.hiddenTabCount = Math.max(0, this.totalTabCount - this.tabLimit);
            } else {
                this.hiddenTabCount = 0;
            }
        } catch (error) {
            this.totalTabCount = this.tabs.length;
            this.hiddenTabCount = 0;
        }
    }
    renderTabLimitWarning() {
        const container = document.getElementById('tab-limit-warning');
        if (!container) return;
        if (this.isPremium) {
            this.hideTabLimitWarning(container);
            return;
        }
        const currentExcessTabs = Math.max(0, this.realTimeTabCount - this.tabLimit);
        const remainingTabs = Math.max(0, this.tabLimit - this.realTimeTabCount);
        if (currentExcessTabs > 0) {
            this.showExcessTabsWarning(container, currentExcessTabs);
        } else if (this.realTimeTabCount <= this.tabLimit) {
            this.showWithinLimitsMessage(container, remainingTabs);
        }
    }
    showExcessTabsWarning(container, excessTabs) {
        const warningHtml = `
            <div class="tab-limit-warning-content" style="background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 16px; margin: 12px 16px; color: #92400e; font-size: 14px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2); transition: all 0.3s ease; opacity: 1; transform: translateY(0);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <div style="font-size: 20px;">📈</div>
                    <strong>Free Plan Limit (${this.tabLimit} tabs)</strong>
                </div>
                <p style="margin: 0 0 16px 0; line-height: 1.5;">
                    You have <strong><span id="excess-count">${excessTabs}</span> extra tab${excessTabs > 1 ? 's' : ''}</strong> beyond the free limit.
                    Basic tab management still works, but timers and advanced features require Pro.
                </p>
                <div style="display: flex; gap: 8px;">
                    <button id="tab-limit-close-some" style="background: rgba(255, 255, 255, 0.9); color: #92400e; border: 1px solid rgba(146, 64, 14, 0.3); padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; margin-right: 8px; transition: all 0.2s ease;">Close Extra Tabs</button>
                    <button id="tab-limit-upgrade-btn" style="background: linear-gradient(135deg, #d97706, #ea580c); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; box-shadow: 0 2px 8px rgba(217, 119, 6, 0.3); transition: all 0.2s ease;">Upgrade to Pro - $4.99/month</button>
                </div>
            </div>
        `;
        const existingContent = container.querySelector('.tab-limit-warning-content');
        if (existingContent) {
            const excessCountSpan = container.querySelector('#excess-count');
            if (excessCountSpan && excessCountSpan.textContent !== excessTabs.toString()) {
                excessCountSpan.textContent = excessTabs;
            }
        } else {
            container.innerHTML = warningHtml;
            const content = container.querySelector('.tab-limit-warning-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                }, 10);
            }
            this.attachWarningEventListeners();
        }
    }
    showWithinLimitsMessage(container, remainingTabs) {
        const successHtml = `
            <div class="tab-limit-warning-content" style="background: linear-gradient(135deg, #dcfdf4 0%, #a7f3d0 100%); border: 2px solid #34d399; border-radius: 12px; padding: 12px; margin: 12px 16px; color: #065f46; font-size: 13px; transition: all 0.3s ease; opacity: 1; transform: translateY(0);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div style="font-size: 16px;">✨</div>
                    <strong>Free Plan Active</strong>
                </div>
                <p style="margin: 0; line-height: 1.4;">
                    ${remainingTabs > 0
                        ? `You can open <strong><span id="remaining-count">${remainingTabs}</span> more tab${remainingTabs > 1 ? 's' : ''}</strong>. Upgrade for unlimited tabs + timers!`
                        : 'Perfect! You are using all free tabs efficiently. Need more? Upgrade to Pro!'
                    }
                </p>
                <div style="margin-top: 8px;">
                    <button id="tab-limit-upgrade-btn" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500; transition: all 0.2s ease;">Upgrade to Pro</button>
                </div>
            </div>
        `;
        const existingContent = container.querySelector('.tab-limit-warning-content');
        if (existingContent && existingContent.style.background.includes('#dcfdf4')) {
            const remainingCountSpan = container.querySelector('#remaining-count');
            if (remainingCountSpan && remainingCountSpan.textContent !== remainingTabs.toString()) {
                remainingCountSpan.textContent = remainingTabs;
            }
        } else {
            container.innerHTML = successHtml;
            const content = container.querySelector('.tab-limit-warning-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                }, 10);
            }
            this.attachWarningEventListeners();
        }
    }
    hideTabLimitWarning(container) {
        const existingContent = container.querySelector('.tab-limit-warning-content');
        if (existingContent) {
            existingContent.style.opacity = '0';
            existingContent.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                container.innerHTML = '';
            }, 300);
        }
    }
    attachWarningEventListeners() {
        const closeSomeBtn = document.getElementById('tab-limit-close-some');
        if (closeSomeBtn) {
            closeSomeBtn.addEventListener('click', () => this.closeExtraTabs());
        }
        const upgradeBtn = document.getElementById('tab-limit-upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.handleDirectUpgrade());
        }
    }
    async renderTabs() {
        const container = document.getElementById('tabs-container');
        const emptyState = document.getElementById('empty-state');
        if (!container) {
            return;
        }
        if (this.isRendering) {
            return;
        }
        this.isRendering = true;
        try {
            try {
                const bookmarkKey = await this.getUserBookmarkKey();
                const result = await chrome.storage.local.get([bookmarkKey]);
                this.favorites = result[bookmarkKey] || [];
            } catch (error) {
                this.favorites = [];
            }

            if (!Array.isArray(this.tabs)) {
                this.tabs = [];
            }

            let displayTabs = [...this.tabs];
            if (this.favorites && Array.isArray(this.favorites)) {
                const bookmarkedUrls = new Set(this.favorites.map(fav => fav.url));
                displayTabs = displayTabs.filter(tab => !bookmarkedUrls.has(tab.url));
            }

            if (!this.isPremium) {
                displayTabs = displayTabs.slice(0, this.tabLimit);
            } else {
            }
            if (displayTabs.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                container.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="9" x2="15" y2="9"></line>
                            <line x1="9" y1="13" x2="15" y2="13"></line>
                            <line x1="9" y1="17" x2="13" y2="17"></line>
                        </svg>
                        <h3 class="empty-title">No Tabs Open</h3>
                        <p class="empty-description">Open some tabs to get started with Tabmangment</p>
                    </div>
                `;
                return;
            }
            if (emptyState) emptyState.style.display = 'none';
            const tabsHTML = displayTabs.map((tab, index) => {
                try {
                    return this.createTabHTML(tab, index);
                } catch (htmlError) {
                    return `<div class="tab-item error">Error loading tab: ${tab.title || 'Unknown'}</div>`;
                }
            }).join('');
            container.innerHTML = tabsHTML;
            if (!this.isPremium && displayTabs.length >= this.tabLimit) {
                this.addFreeLimitFooter(container);
            }
            this.attachTabListeners();
            this.handleFaviconErrors();
        } catch (error) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #ef4444;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3 class="empty-title">Error Loading Tabs</h3>
                    <p class="empty-description">Something went wrong. Please try reloading.</p>
                    <button onclick="location.reload()" style="margin-top: 16px; padding: 10px 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; color: #475569; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
                        Reload Extension
                    </button>
                </div>
            `;
        } finally {
            this.isRendering = false;
        }
    }
    createTabHTML(tab, index = 0) {
        if (!tab || !tab.id) {
            return '<div class="tab-item error">Invalid tab data</div>';
        }
        const isActive = tab.active || false;
        const hasTimer = this.tabTimers && this.tabTimers[tab.id] && this.tabTimers[tab.id].active;
        const isEmptyTab = this.isEmptyTabForDisplay(tab);
        const isPremium = this.isPremium || false;
        const domain = this.extractDomain(tab.url || '');
        const isBookmarked = this.favorites && Array.isArray(this.favorites)
            ? this.favorites.some(fav => fav.url === tab.url)
            : false;
        return `
            <div class="tab-item ${isActive ? 'active' : ''} ${isEmptyTab ? 'empty-tab' : ''}" data-tab-id="${tab.id}">
                <div class="tab-header">
                    <div class="tab-favicon-container">
                        <img src="${this.sanitizeUrl(tab.favIconUrl) || 'icons/icon-16.png'}"
                             alt="${domain} favicon"
                             class="tab-favicon">
                    </div>
                    <div class="tab-info">
                        <div class="tab-title" title="${this.sanitizeText(tab.title)}">${isEmptyTab ? '🆕 New Tab (Empty)' : this.sanitizeText(this.truncate(tab.title, 25))}</div>
                        <div class="tab-url" title="${this.sanitizeUrl(tab.url)}">${!isEmptyTab ? domain : ''}</div>
                        ${hasTimer || isEmptyTab ? `<div class="timer-countdown ${isEmptyTab ? 'empty-tab-timer' : ''}" id="timer-display-${tab.id}" style="
                            color: ${isEmptyTab ? '#6366f1' : '#ff6b6b'};
                            font-weight: 600;
                            font-size: 11px;
                            margin-top: 4px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            background: ${isEmptyTab ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 107, 107, 0.1)'};
                            padding: 3px 8px;
                            border-radius: 6px;
                            display: inline-block;
                            letter-spacing: 0.3px;
                        ">${hasTimer ? '⏰ Loading...' : '🕐 Auto-closes in 24h'}</div>` : ''}
                    </div>
                </div>
                <div class="tab-actions">
                    <button class="action-btn ${!isPremium ? 'disabled' : ''} ${hasTimer ? 'active' : ''}"
                            data-action="timer"
                            data-tab-id="${tab.id}"
                            style="position: relative;"
                            title="${!isPremium ? 'Timer - Pro Feature' : (hasTimer ? 'Remove Timer' : 'Set Timer')}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        ${!isPremium ? '<div class="pro-badge-mini" style="position: absolute; top: -2px; right: -2px; background: linear-gradient(45deg, #ff6b6b, #ee5a24); color: white; font-size: 8px; font-weight: 600; padding: 1px 3px; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10; pointer-events: none;">PRO</div>' : ''}
                    </button>
                    <button class="action-btn ${!isPremium ? 'disabled' : ''} ${isBookmarked ? 'active' : ''}"
                            data-action="bookmark"
                            data-tab-id="${tab.id}"
                            style="position: relative;"
                            title="${!isPremium ? 'Favorites - Pro Feature' : (isBookmarked ? 'Remove from Favorites' : 'Add to Favorites')}">
                        <svg viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                        </svg>
                        ${!isPremium ? '<div class="pro-badge-mini" style="position: absolute; top: -2px; right: -2px; background: linear-gradient(45deg, #ff6b6b, #ee5a24); color: white; font-size: 8px; font-weight: 600; padding: 1px 3px; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10; pointer-events: none;">PRO</div>' : ''}
                    </button>
                    <button class="action-btn danger"
                            data-action="close"
                            data-tab-id="${tab.id}"
                            title="Close Tab"
>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    attachTabListeners() {
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => {
            const tabId = parseInt(item.dataset.tabId);
            if (!tabId) {
                return;
            }
            const tabHeader = item.querySelector('.tab-header');
            if (tabHeader) {
                tabHeader.addEventListener('click', () => this.switchToTab(tabId));
            }
            const actionBtns = item.querySelectorAll('.action-btn');
            actionBtns.forEach((btn, btnIndex) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    if (btn.classList.contains('disabled') && !this.isPremium && action !== 'pause') {
                        this.showPremiumModal();
                        return;
                    }
                    this.handleTabAction(tabId, action);
                });
            });

            this.adjustActionButtonColors(item);
        });
    }

    adjustActionButtonColors(tabItem) {
        try {
            const computedStyle = window.getComputedStyle(tabItem);
            const bgColor = computedStyle.backgroundColor;

            const rgb = bgColor.match(/\d+/g);
            if (!rgb || rgb.length < 3) return;

            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);

            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            const isDark = luminance < 0.5;

            const actionBtns = tabItem.querySelectorAll('.action-btn');
            actionBtns.forEach(btn => {
                const svg = btn.querySelector('svg');
                if (!svg) return;

                if (isDark) {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('border', 'none', 'important');
                    btn.style.setProperty('color', 'rgba(255, 255, 255, 0.95)', 'important');
                    svg.style.setProperty('stroke', 'rgba(255, 255, 255, 0.95)', 'important');

                    btn.style.setProperty('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))', 'important');
                } else {
                    btn.style.setProperty('background', 'transparent', 'important');
                    btn.style.setProperty('border', 'none', 'important');
                    btn.style.setProperty('color', 'rgba(0, 0, 0, 0.8)', 'important');
                    svg.style.setProperty('stroke', 'rgba(0, 0, 0, 0.8)', 'important');

                    btn.style.setProperty('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))', 'important');
                }
            });
        } catch (error) {
            console.error('Error adjusting action button colors:', error);
        }
    }
    handleFaviconErrors() {
        const faviconImages = document.querySelectorAll('.tab-favicon, .bookmark-favicon img, img[alt*="Favicon"], img[alt*="favicon"]');
        faviconImages.forEach(img => {
            const newImg = img.cloneNode(true);
            img.parentNode?.replaceChild(newImg, img);

            newImg.addEventListener('error', (e) => {
                e.preventDefault();
                e.stopPropagation();
                newImg.src = 'icons/icon-16.png';
            }, { once: true });

            newImg.onerror = null;
        });
    }
    async handleTabAction(tabId, action) {
        try {
            switch (action) {
                case 'timer':
                    if (this.isPremium) {
                        await this.showTimerModal(tabId);
                    } else {
                        this.showPremiumModal();
                    }
                    break;
                case 'bookmark':
                    if (this.isPremium) {
                        await this.addToFavorites(tabId);
                    } else {
                        this.showPremiumModal();
                    }
                    break;
                case 'close':
                    await this.closeTab(tabId);
                    break;
            }
        } catch (error) {
            this.showError(`Failed to ${action} tab`);
        }
    }
    async switchToTab(tabId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'switchToTab',
                tabId: tabId
            });
            if (response && response.success) {
                window.close();
            } else {
                throw new Error(response?.error || 'Failed to switch tab');
            }
        } catch (error) {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (tab) {
                    await chrome.tabs.update(tabId, { active: true });
                    await chrome.windows.update(tab.windowId, { focused: true });
                    window.close();
                }
            } catch (fallbackError) {
                this.showError('Failed to switch to tab');
            }
        }
    }
    async closeTab(tabId) {
        try {
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'closeTab',
                    tabId: tabId
                });
                if (response && response.success) {
                    this.removeTabWithAnimation(tabId);
                    return;
                }
            } catch (bgError) {
            }
            await chrome.tabs.remove(tabId);
            this.removeTabWithAnimation(tabId);
        } catch (error) {
            this.showError('Failed to close tab');
        }
    }
    async collapseAllTabs() {
        try {
            const collapseBtn = document.getElementById('collapse-btn');
            if (collapseBtn) {
                collapseBtn.style.transform = 'scale(0.95)';
                collapseBtn.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                collapseBtn.classList.add('collapsing');
                setTimeout(() => {
                    collapseBtn.style.transform = 'scale(1)';
                }, 200);
            }

            const allTabs = await chrome.tabs.query({ currentWindow: true });

            const domainGroups = {};
            for (const tab of allTabs) {
                if (this.isValidTab(tab)) {
                    try {
                        const url = new URL(tab.url);
                        const domain = url.hostname.replace('www.', '');
                        if (!domainGroups[domain]) {
                            domainGroups[domain] = [];
                        }
                        domainGroups[domain].push(tab);
                    } catch (error) {
                    }
                }
            }

            let groupedCount = 0;
            const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
            let colorIndex = 0;

            for (const [domain, tabs] of Object.entries(domainGroups)) {
                if (tabs.length > 1) {
                    try {
                        const tabIds = tabs.map(t => t.id);
                        const groupId = await chrome.tabs.group({ tabIds });
                        await chrome.tabGroups.update(groupId, {
                            title: domain,
                            collapsed: true,
                            color: colors[colorIndex % colors.length]
                        });
                        colorIndex++;
                        groupedCount += tabs.length;
                    } catch (error) {
                    }
                }
            }

            setTimeout(() => {
                if (collapseBtn) {
                    collapseBtn.classList.remove('collapsing');
                }
                this.refreshTabList();
                if (groupedCount > 0) {
                    this.showMessage(`Successfully grouped and collapsed ${groupedCount} tabs by domain!`, 'success');
                } else {
                    this.showMessage('No duplicate domains found to group.', 'info');
                }
            }, 500);
        } catch (error) {
            this.showError('Failed to collapse tabs. Please try again.');
            const collapseBtn = document.getElementById('collapse-btn');
            if (collapseBtn) {
                collapseBtn.classList.remove('collapsing');
            }
        }
    }
    removeTabWithAnimation(tabId) {
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (!tabElement) return;
        this.tabs = this.tabs.filter(tab => tab.id !== tabId);
        if (!this.isPremium && this.totalTabCount > this.tabs.length) {
            this.addNextHiddenTab();
        }
        tabElement.style.transition = 'all 0.3s ease-out';
        tabElement.style.opacity = '0';
        tabElement.style.transform = 'translateX(100%) scale(0.9)';
        tabElement.style.height = '0';
        tabElement.style.margin = '0';
        tabElement.style.padding = '0';
        setTimeout(() => {
            if (tabElement.parentNode) {
                tabElement.remove();
            }
            if (this.tabs.length === 0) {
                const container = document.getElementById('tabs-container');
                const emptyState = document.getElementById('empty-state');
                if (container && emptyState) {
                    emptyState.style.display = 'block';
                }
            } else if (!this.isPremium && this.tabs.length < this.tabLimit) {
                setTimeout(() => {
                    this.render();
                }, 100);
            }
        }, 300);
    }
    async addNextHiddenTab() {
        try {
            const allTabs = await chrome.tabs.query({});
            const visibleTabIds = new Set(this.tabs.map(tab => tab.id));
            const hiddenTabs = allTabs.filter(tab =>
                this.isValidTab(tab) && !visibleTabIds.has(tab.id)
            );
            if (hiddenTabs.length > 0) {
                const prioritizedHidden = this.prioritizeTabsForFreeUser(hiddenTabs);
                const nextTab = prioritizedHidden[0];
                this.tabs.push({
                    id: nextTab.id,
                    title: nextTab.title || 'Untitled',
                    url: nextTab.url,
                    favIconUrl: nextTab.favIconUrl,
                    active: nextTab.active,
                    paused: false,
                    timerActive: false,
                    autoCloseTime: null
                });
                if (!this.lastHiddenTabNotification ||
                    Date.now() - this.lastHiddenTabNotification > 5000) {
                    this.showMessage(`Tab revealed: ${this.truncate(nextTab.title || 'Untitled', 20)}`, 'success');
                    this.lastHiddenTabNotification = Date.now();
                }
            }
        } catch (error) {
        }
    }
    showBookmarkMenu() {
        const chatSection = document.getElementById('ai-chat-section');
        const tabsContainer = document.getElementById('tabs-container');

        // Fade out chat if active
        if (chatSection && chatSection.classList.contains('active')) {
            chatSection.classList.remove('active');
            setTimeout(() => {
                chatSection.style.display = 'none';
            }, 300);
        }

        // Ensure tabs container is visible and fade out briefly
        if (tabsContainer) {
            tabsContainer.classList.remove('active');
            setTimeout(() => {
                this.currentView = 'bookmarks';
                this.renderBookmarksView();
                // Fade back in with bookmarks content
                setTimeout(() => tabsContainer.classList.add('active'), 10);
            }, 300);
        }
    }
    async renderBookmarksView() {
        const container = document.getElementById('tabs-container');
        if (!container) return;

        // Ensure tabs container is visible
        container.style.display = 'block';

        try {
                const bookmarkKey = await this.getUserBookmarkKey();
                const result = await chrome.storage.local.get([bookmarkKey, 'themeConfig']);
                const bookmarks = result[bookmarkKey] || [];

                let theme = result.themeConfig || { primaryColor: '#667eea', secondaryColor: '#764ba2' };

                const isValidHex = (color) => /^#[0-9A-F]{6}$/i.test(color);
                if (!isValidHex(theme.primaryColor)) theme.primaryColor = '#667eea';
                if (!isValidHex(theme.secondaryColor)) theme.secondaryColor = '#764ba2';

                const themeGradient = `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`;

                const hexToRgba = (hex, alpha) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };
                const themeShadow = hexToRgba(theme.primaryColor, 0.25);

                const darkenColor = (hex) => {
                    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 20);
                    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 20);
                    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 20);
                    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                };
                const themeGradientDark = `linear-gradient(135deg, ${darkenColor(theme.primaryColor)}, ${darkenColor(theme.secondaryColor)})`;
                const bookmarksHTML = `
                    <!-- Bookmark Header -->
                    <div class="bookmark-header" style="
                        background: ${themeGradient};
                        color: white;
                        padding: 24px 20px;
                        margin: -16px -16px 20px -16px;
                        position: relative;
                        border-radius: 16px 16px 0 0;
                        box-shadow:
                            0 8px 32px rgba(255, 107, 53, 0.25),
                            0 2px 8px rgba(255, 107, 53, 0.15),
                            inset 0 1px 0 rgba(255, 255, 255, 0.2);
                        background-size: 200% 200%;
                        animation: gradientShift 6s ease infinite;
                        overflow: hidden;
                    ">
                        <!-- Decorative Elements -->
                        <div style="
                            position: absolute;
                            top: -50%;
                            right: -20%;
                            width: 100px;
                            height: 100px;
                            background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent);
                            border-radius: 50%;
                        "></div>
                        <div style="
                            position: absolute;
                            bottom: -30%;
                            left: -15%;
                            width: 80px;
                            height: 80px;
                            background: radial-gradient(circle, rgba(255, 255, 255, 0.08), transparent);
                            border-radius: 50%;
                        "></div>
                        <!-- Header Content -->
                        <div style="text-align: center; position: relative; z-index: 5;">
                            <div style="
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                gap: 14px;
                                margin-bottom: 10px;
                                background: rgba(255, 255, 255, 0.1);
                                padding: 12px 20px;
                                border-radius: 50px;
                                backdrop-filter: blur(10px);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                            ">
                                <div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));">🔖</div>
                                <div style="font-size: 18px; font-weight: 700; letter-spacing: -0.5px;">My Bookmarks</div>
                            </div>
                            <div style="
                                font-size: 13px;
                                opacity: 0.9;
                                font-weight: 500;
                                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                            ">Your saved tabs collection</div>
                        </div>
                    </div>
                    <!-- Search and Counter Bar -->
                    <div style="
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(99, 102, 241, 0.15);
                        border-radius: 14px;
                        padding: 16px;
                        margin-bottom: 12px;
                        box-shadow:
                            0 4px 16px rgba(99, 102, 241, 0.08),
                            inset 0 1px 0 rgba(255, 255, 255, 0.8);
                    ">
                        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                            <div style="flex: 1; position: relative;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none;">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <input
                                    type="text"
                                    id="bookmark-search"
                                    placeholder="Search bookmarks..."
                                    style="
                                        width: 100%;
                                        padding: 10px 12px 10px 38px;
                                        border: 1px solid rgba(203, 213, 225, 0.6);
                                        border-radius: 10px;
                                        font-size: 13px;
                                        font-weight: 500;
                                        background: white;
                                        color: #1e293b;
                                        transition: all 0.3s ease;
                                        outline: none;
                                    "
                                />
                            </div>
                            <div style="
                                background: linear-gradient(135deg, #1e293b, #0f172a);
                                color: white;
                                padding: 10px 16px;
                                border-radius: 10px;
                                font-size: 13px;
                                font-weight: 700;
                                white-space: nowrap;
                                box-shadow: 0 2px 8px rgba(15, 23, 42, 0.3);
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                </svg>
                                <span id="bookmark-count">${bookmarks.length}</span>
                            </div>
                        </div>
                    </div>
                    <!-- Enhanced Actions Bar -->
                    <div class="bookmark-actions" style="
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 107, 53, 0.15);
                        border-radius: 14px;
                        padding: 16px;
                        display: flex;
                        gap: 12px;
                        margin-bottom: 20px;
                        box-shadow:
                            0 4px 16px rgba(255, 107, 53, 0.08),
                            inset 0 1px 0 rgba(255, 255, 255, 0.8);
                    ">
                        <button id="bookmark-all-current"
                            data-gradient="${themeGradient}"
                            data-gradient-dark="${themeGradientDark}"
                            data-shadow="${themeShadow}"
                            style="
                            flex: 1;
                            background: ${themeGradient};
                            color: white;
                            border: none;
                            padding: 12px 16px;
                            border-radius: 10px;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                            box-shadow:
                                0 4px 12px ${themeShadow},
                                inset 0 1px 0 rgba(255, 255, 255, 0.2);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                        ">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                <path d="M12 7v6M9 10h6"/>
                            </svg>
                            Save All Tabs
                        </button>
                        <button id="clear-all-bookmarks" style="
                            background: rgba(255, 255, 255, 0.9);
                            color: #dc2626;
                            border: 1px solid rgba(220, 38, 38, 0.2);
                            padding: 12px 16px;
                            border-radius: 10px;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                            backdrop-filter: blur(10px);
                            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px;
                        ">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                            </svg>
                            Clear All
                        </button>
                    </div>
                    <!-- Bookmarks List Container -->
                    <div id="bookmarks-list" style="position: relative;">${this.renderBookmarksList(bookmarks, themeGradient)}</div>
                `;
                container.innerHTML = bookmarksHTML;
                this.attachBookmarkListeners();
                setTimeout(() => this.handleFaviconErrors(), 100);
            } catch (error) {
                console.error('Error rendering bookmarks:', error);
                console.error('Error stack:', error.stack);
                container.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #ef4444;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h3 class="empty-title">Error Loading Bookmarks</h3>
                        <p class="empty-description">Unable to load your saved bookmarks. Check console for details.</p>
                    </div>
                `;
            }
    }
    renderBookmarksList(bookmarks, themeGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)') {
        if (bookmarks.length === 0) {
            return `
                <div class="empty-state">
                    <svg class="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                    </svg>
                    <h3 class="empty-title">No Bookmarks Yet</h3>
                    <p class="empty-description">Save your favorite tabs to access them quickly later</p>
                </div>
            `;
        }
        return bookmarks.map((bookmark, index) => `
            <div class="bookmark-item" data-index="${index}" style="
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 18px;
                margin-bottom: 14px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
                border-radius: 16px;
                border: 1px solid rgba(226, 232, 240, 0.6);
                backdrop-filter: blur(20px);
                box-shadow:
                    0 4px 16px rgba(0, 0, 0, 0.04),
                    0 2px 4px rgba(0, 0, 0, 0.02),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                cursor: pointer;
                position: relative;
                animation: bookmarkFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                opacity: 0;
                transform: translateY(20px) scale(0.95);
                animation-delay: ${index * 80}ms;
                overflow: hidden;
            ">
                <!-- Accent Line -->
                <div style="
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: ${themeGradient};
                    border-radius: 0 4px 4px 0;
                    transition: width 0.3s ease;
                "></div>
                <!-- Enhanced Favicon -->
                <div class="bookmark-favicon" style="
                    width: 48px;
                    height: 48px;
                    background: ${themeGradient};
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow:
                        0 4px 12px rgba(255, 107, 53, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                ">
                    <img src="${this.getSafeFaviconUrl(bookmark.favIconUrl)}"
                         alt="Favicon"
                         style="
                            width: 24px;
                            height: 24px;
                            object-fit: cover;
                            border-radius: 6px;
                            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
                         ">
                </div>
                <!-- Bookmark Info -->
                <div class="bookmark-info" style="flex: 1; min-width: 0; padding: 2px 0;">
                    <div class="bookmark-title" style="
                        font-size: 15px;
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 6px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        letter-spacing: -0.25px;
                        line-height: 1.3;
                    ">${this.sanitizeText(bookmark.title || 'Untitled')}</div>
                    <div class="bookmark-url" style="
                        font-size: 13px;
                        color: #64748b;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        ${this.extractDomain(bookmark.url)}
                    </div>
                </div>
                <!-- Enhanced Remove Button -->
                <button class="remove-bookmark-btn" data-index="${index}" style="
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow:
                        0 4px 12px rgba(239, 68, 68, 0.25),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    flex-shrink: 0;
                    opacity: 0.8;
                ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    async searchBookmarks(query) {
        const bookmarkKey = await this.getUserBookmarkKey();
        const result = await chrome.storage.local.get([bookmarkKey]);
        const allBookmarks = result[bookmarkKey] || [];

        const searchQuery = query.trim().toLowerCase();
        const bookmarkItems = document.querySelectorAll('.bookmark-item');

        let visibleCount = 0;

        bookmarkItems.forEach((item, index) => {
            const bookmark = allBookmarks[index];
            if (!bookmark) return;

            const title = (bookmark.title || '').toLowerCase();
            const url = (bookmark.url || '').toLowerCase();
            const domain = this.extractDomain(bookmark.url).toLowerCase();

            const matchesSearch = searchQuery === '' ||
                                title.includes(searchQuery) ||
                                url.includes(searchQuery) ||
                                domain.includes(searchQuery);

            if (matchesSearch) {
                item.style.display = 'flex';
                visibleCount++;

                if (searchQuery !== '') {
                    const titleEl = item.querySelector('.bookmark-title');
                    const urlEl = item.querySelector('.bookmark-url');

                    if (titleEl) {
                        titleEl.innerHTML = this.highlightText(bookmark.title || 'Untitled', searchQuery);
                    }
                    if (urlEl) {
                        const domainText = this.extractDomain(bookmark.url);
                        const highlightedDomain = this.highlightText(domainText, searchQuery);
                        urlEl.innerHTML = `
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            ${highlightedDomain}
                        `;
                    }
                } else {
                    const titleEl = item.querySelector('.bookmark-title');
                    const urlEl = item.querySelector('.bookmark-url');

                    if (titleEl) {
                        titleEl.textContent = this.sanitizeText(bookmark.title || 'Untitled');
                    }
                    if (urlEl) {
                        const domainText = this.extractDomain(bookmark.url);
                        urlEl.innerHTML = `
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            ${domainText}
                        `;
                    }
                }
            } else {
                item.style.display = 'none';
            }
        });

        const bookmarkCount = document.getElementById('bookmark-count');
        if (bookmarkCount) {
            if (searchQuery === '') {
                bookmarkCount.textContent = allBookmarks.length;
            } else {
                bookmarkCount.textContent = `${visibleCount} of ${allBookmarks.length}`;
            }
        }
    }

    highlightText(text, query) {
        if (!query || !text) return this.sanitizeText(text);

        const sanitizedText = this.sanitizeText(text);
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');

        return sanitizedText.replace(regex, '<mark style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #78350f; padding: 2px 4px; border-radius: 3px; font-weight: 700;">$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    attachBookmarkListeners() {
        const searchInput = document.getElementById('bookmark-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchBookmarks(e.target.value);
            });
            searchInput.addEventListener('focus', (e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            });
            searchInput.addEventListener('blur', (e) => {
                e.target.style.borderColor = 'rgba(203, 213, 225, 0.6)';
                e.target.style.boxShadow = 'none';
            });
        }

        const bookmarkAllBtn = document.getElementById('bookmark-all-current');
        if (bookmarkAllBtn) {
            bookmarkAllBtn.addEventListener('click', async () => {
                await this.bookmarkAllCurrentTabs();
                this.renderBookmarksView();
            });
            const gradientNormal = bookmarkAllBtn.dataset.gradient;
            const gradientHover = bookmarkAllBtn.dataset.gradientDark;
            const shadow = bookmarkAllBtn.dataset.shadow;

            bookmarkAllBtn.addEventListener('mouseenter', () => {
                bookmarkAllBtn.style.background = gradientHover;
                bookmarkAllBtn.style.transform = 'translateY(-2px) scale(1.02)';
                bookmarkAllBtn.style.boxShadow = `0 8px 20px ${shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.3)`;
            });
            bookmarkAllBtn.addEventListener('mouseleave', () => {
                bookmarkAllBtn.style.background = gradientNormal;
                bookmarkAllBtn.style.transform = 'translateY(0) scale(1)';
                bookmarkAllBtn.style.boxShadow = `0 4px 12px ${shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
            });
        }
        const clearAllBtn = document.getElementById('clear-all-bookmarks');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', async () => {
                await this.clearAllBookmarks();
                this.renderBookmarksView();
            });
            clearAllBtn.addEventListener('mouseenter', () => {
                clearAllBtn.style.background = 'rgba(220, 38, 38, 0.15)';
                clearAllBtn.style.color = '#b91c1c';
                clearAllBtn.style.transform = 'translateY(-2px) scale(1.02)';
                clearAllBtn.style.boxShadow = '0 8px 20px rgba(220, 38, 38, 0.15)';
            });
            clearAllBtn.addEventListener('mouseleave', () => {
                clearAllBtn.style.background = 'rgba(255, 255, 255, 0.9)';
                clearAllBtn.style.color = '#dc2626';
                clearAllBtn.style.transform = 'translateY(0) scale(1)';
                clearAllBtn.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.1)';
            });
        }
        const bookmarkItems = document.querySelectorAll('.bookmark-item');
        bookmarkItems.forEach((item, index) => {
            item.addEventListener('click', async (e) => {
                if (e.target.classList.contains('remove-bookmark-btn')) return;
                const bookmarkKey = await this.getUserBookmarkKey();
                const result = await chrome.storage.local.get([bookmarkKey]);
                const bookmarks = result[bookmarkKey] || [];
                if (bookmarks[index]) {
                    this.openBookmark(bookmarks[index]);
                }
            });
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-4px) scale(1.01)';
                item.style.boxShadow = `
                    0 12px 32px rgba(0, 0, 0, 0.08),
                    0 4px 8px rgba(0, 0, 0, 0.04),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9),
                    0 0 0 1px rgba(255, 107, 53, 0.15)
                `;
                const accentLine = item.querySelector('div[style*="position: absolute"]');
                if (accentLine) {
                    accentLine.style.width = '6px';
                }
                const favicon = item.querySelector('.bookmark-favicon');
                if (favicon) {
                    favicon.style.transform = 'scale(1.05) rotate(2deg)';
                    favicon.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0) scale(1)';
                item.style.boxShadow = `
                    0 4px 16px rgba(0, 0, 0, 0.04),
                    0 2px 4px rgba(0, 0, 0, 0.02),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8)
                `;
                const accentLine = item.querySelector('div[style*="position: absolute"]');
                if (accentLine) {
                    accentLine.style.width = '4px';
                }
                const favicon = item.querySelector('.bookmark-favicon');
                if (favicon) {
                    favicon.style.transform = 'scale(1) rotate(0deg)';
                    favicon.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }
            });
        });
        const removeButtons = document.querySelectorAll('.remove-bookmark-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                await this.removeBookmark(index);
                this.renderBookmarksView();
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                btn.style.transform = 'scale(1.1) rotate(-3deg)';
                btn.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                btn.style.opacity = '1';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                btn.style.transform = 'scale(1) rotate(0deg)';
                btn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                btn.style.opacity = '0.8';
            });
        });
    }
    async bookmarkAllCurrentTabs() {
        try {
            const tabs = await chrome.tabs.query({});
            const validTabs = tabs.filter(tab => this.isValidTab(tab));
            const bookmarkKey = await this.getUserBookmarkKey();
            const result = await chrome.storage.local.get([bookmarkKey]);
            let favorites = result[bookmarkKey] || [];
            let addedCount = 0;
            for (const tab of validTabs) {
                const exists = favorites.some(fav => fav.url === tab.url);
                if (!exists) {
                    favorites.push({
                        id: tab.id,
                        title: tab.title,
                        url: tab.url,
                        favIconUrl: tab.favIconUrl,
                        dateAdded: Date.now()
                    });
                    addedCount++;
                }
            }
            await chrome.storage.local.set({ [bookmarkKey]: favorites });
            this.favorites = favorites;
            this.showMessage(`Added ${addedCount} new bookmarks!`, 'success');
            setTimeout(() => {
                this.renderTabs();
            }, 300);
        } catch (error) {
            this.showError('Failed to bookmark tabs');
        }
    }
    async clearAllBookmarks() {
        try {
            const bookmarkKey = await this.getUserBookmarkKey();
            await chrome.storage.local.set({ [bookmarkKey]: [] });
            this.favorites = [];
            this.showMessage('All bookmarks cleared - tabs restored', 'success');
            setTimeout(() => {
                this.renderTabs();
            }, 100);
        } catch (error) {
            this.showError('Failed to clear bookmarks');
        }
    }
    async removeBookmark(index) {
        try {
            const bookmarkKey = await this.getUserBookmarkKey();
            const result = await chrome.storage.local.get([bookmarkKey]);
            let favorites = result[bookmarkKey] || [];
            if (index >= 0 && index < favorites.length) {
                const removedBookmark = favorites[index];
                await this.animateBookmarkToTab(removedBookmark);
                favorites.splice(index, 1);
                await chrome.storage.local.set({ [bookmarkKey]: favorites });
                this.favorites = favorites;
                this.showMessage(`Restored "${this.truncate(removedBookmark.title, 20)}" to tabs`, 'success');
                setTimeout(() => {
                    this.renderTabs();
                }, 700);
            }
        } catch (error) {
            this.showError('Failed to remove bookmark');
        }
    }
    async openBookmark(bookmark) {
        try {
            await chrome.tabs.create({
                url: bookmark.url,
                active: true
            });
            this.showMessage(`Opening "${this.truncate(bookmark.title, 20)}"`, 'success');
        } catch (error) {
            this.showError('Failed to open bookmark');
        }
    }
    async addToFavorites(tabId) {
        try {
            const tab = this.tabs.find(t => t.id === tabId);
            if (!tab) {
                this.showError('Tab not found');
                return;
            }
            const bookmarkKey = await this.getUserBookmarkKey();
            const result = await chrome.storage.local.get([bookmarkKey]);
            let favorites = result[bookmarkKey] || [];
            const existingIndex = favorites.findIndex(fav => fav.url === tab.url);
            if (existingIndex !== -1) {
                await this.animateBookmarkToTab(favorites[existingIndex]);
                favorites.splice(existingIndex, 1);
                await chrome.storage.local.set({ [bookmarkKey]: favorites });
                this.showMessage(`Restored "${this.truncate(tab.title, 20)}" to tabs`, 'success');
                this.favorites = favorites;
                setTimeout(() => {
                    this.renderTabs();
                }, 700);
            } else {
                const bookmarkData = {
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                    favIconUrl: tab.favIconUrl,
                    dateAdded: Date.now()
                };
                await this.animateTabToBookmark(tabId, bookmarkData);
                favorites.push(bookmarkData);
                await chrome.storage.local.set({ [bookmarkKey]: favorites });
                this.showMessage(`Bookmarked "${this.truncate(tab.title, 20)}"`, 'success');
                this.favorites = favorites;
                setTimeout(() => {
                    this.renderTabs();
                }, 700);
            }
        } catch (error) {
            this.showError('Failed to update bookmark');
        }
    }
    async animateTabToBookmark(tabId, bookmarkData) {
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (!tabElement) return;
        const clone = tabElement.cloneNode(true);
        clone.classList.add('animating-to-bookmark');
        clone.style.position = 'fixed';
        clone.style.zIndex = '10000';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        const tabRect = tabElement.getBoundingClientRect();
        clone.style.left = tabRect.left + 'px';
        clone.style.top = tabRect.top + 'px';
        clone.style.width = tabRect.width + 'px';
        clone.style.height = tabRect.height + 'px';
        document.body.appendChild(clone);
        tabElement.style.transition = 'all 0.4s ease-out';
        tabElement.style.opacity = '0';
        tabElement.style.transform = 'translateX(-100%) scale(0.8)';
        setTimeout(() => {
            clone.style.transform = 'translateX(200px) translateY(-100px) scale(0.6) rotate(5deg)';
            clone.style.opacity = '0.3';
            clone.style.borderColor = '#ff6b35';
            clone.style.background = 'linear-gradient(135deg, #ff9a56, #ff6b35)';
        }, 100);
        setTimeout(() => {
            if (clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
            const originalTab = document.querySelector(`[data-tab-id="${tabId}"]`);
            if (originalTab) {
                originalTab.style.display = 'none';
            }
        }, 600);
    }
    async animateBookmarkToTab(bookmarkData) {
        const tempBookmark = this.createTempBookmarkElement(bookmarkData);
        document.body.appendChild(tempBookmark);
        setTimeout(() => this.handleFaviconErrors(), 50);
        tempBookmark.style.position = 'fixed';
        tempBookmark.style.right = '20px';
        tempBookmark.style.top = '20px';
        tempBookmark.style.zIndex = '10000';
        tempBookmark.style.pointerEvents = 'none';
        tempBookmark.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        const tabsContainer = document.getElementById('tabs-container');
        const containerRect = tabsContainer.getBoundingClientRect();
        setTimeout(() => {
            tempBookmark.style.transform = 'translateX(-300px) translateY(150px) scale(1.1) rotate(-3deg)';
            tempBookmark.style.opacity = '0.8';
            tempBookmark.style.borderColor = '#10b981';
            tempBookmark.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
        }, 100);
        setTimeout(() => {
            if (tempBookmark.parentNode) {
                tempBookmark.parentNode.removeChild(tempBookmark);
            }
        }, 600);
    }
    createTempBookmarkElement(bookmarkData) {
        const element = document.createElement('div');
        element.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border: 2px solid #ff6b35;
                min-width: 280px;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #ff9a56, #ff6b35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <img src="${this.getSafeFaviconUrl(bookmarkData.favIconUrl)}"
                         alt="Favicon"
                         style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.sanitizeText(bookmarkData.title || 'Untitled')}
                    </div>
                    <div style="font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.extractDomain(bookmarkData.url)}
                    </div>
                </div>
            </div>
        `;
        return element;
    }
    removeTabFromDOM(tabId) {
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement && tabElement.parentNode) {
            tabElement.parentNode.removeChild(tabElement);
        }
    }
    async renderCurrentView() {
        await this.renderTabs();
    }
    showPremiumModal() {

        document.querySelectorAll('.premium-upgrade-modal').forEach(modal => modal.remove());
        const modal = document.createElement('div');
        modal.className = 'premium-upgrade-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            pointer-events: all;
            opacity: 0;
        `;
        modal.innerHTML = `
            <div style="background: #ffffff; border-radius: 8px; padding: 20px; width: 90%; max-width: 320px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 18px; font-weight: 600;">Upgrade to Pro</h2>
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">Unlimited tabs and advanced features</p>
                </div>
                <div style="background: #f9fafb; border-radius: 6px; padding: 14px; margin-bottom: 16px; font-size: 12px;">
                    <div style="margin-bottom: 8px; color: #374151; font-weight: 500;">Features:</div>
                    <div style="margin-bottom: 4px; color: #4b5563;">• Custom timers and auto-close</div>
                    <div style="margin-bottom: 4px; color: #4b5563;">• Unlimited favorites</div>
                    <div style="margin-bottom: 4px; color: #4b5563;">• Advanced tab management</div>
                    <div style="margin-bottom: 4px; color: #4b5563;">• Remove 10-tab limit</div>
                    <div style="color: #4b5563;">• Priority support</div>
                </div>
                <div style="background: #eff6ff; border-radius: 6px; padding: 12px; margin-bottom: 16px; text-align: center;">
                    <div style="font-size: 16px; font-weight: 600; color: #1d4ed8; margin-bottom: 2px;">$4.99/month</div>
                    <div style="font-size: 11px; color: #64748b;">Cancel anytime</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button id="premium-upgrade" style="padding: 10px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; font-size: 13px; font-weight: 500;">Subscribe Now</button>
                    <button id="premium-close" style="padding: 8px; border: none; border-radius: 4px; background: #f3f4f6; color: #6b7280; cursor: pointer; font-size: 12px;">Not now</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.style.opacity = '1', 10);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.style.overflow = '';
                modal.remove();
            }
        });
        document.getElementById('premium-close').addEventListener('click', () => {
            document.body.style.overflow = '';
            modal.remove();
        });
        document.getElementById('premium-upgrade').addEventListener('click', async () => {
            const upgradeBtn = document.getElementById('premium-upgrade');
            const originalText = upgradeBtn.textContent;
            try {
                upgradeBtn.textContent = '🔄 Processing...';
                upgradeBtn.disabled = true;
                await this.handleUpgrade();

                if (document.getElementById('premium-upgrade')) {
                    upgradeBtn.textContent = originalText;
                    upgradeBtn.disabled = false;
                }
            } catch (error) {

                if (upgradeBtn) {
                    upgradeBtn.textContent = originalText;
                    upgradeBtn.disabled = false;
                }
            }
        });
    }
    async handleUpgrade() {
        try {
            const modal = document.querySelector('div[style*="position: fixed"][style*="z-index: 10000"]');
            if (modal) modal.remove();

            await chrome.tabs.create({
                url: `${CONFIG.WEB.DASHBOARD_URL}#subscription`,
                active: true
            });

            this.showMessage('📊 Opening subscription page...', 'success');
        } catch (error) {
            this.showMessage('❌ Failed to open dashboard.', 'error');
        }
    }
    setupPaymentTabListener(tabId, userEmail) {

        const tabUpdateListener = async (updatedTabId, changeInfo, tab) => {
            if (updatedTabId !== tabId) return;

            if (tab.url && (
                tab.url.includes('success') ||
                tab.url.includes('payment') ||
                tab.url.includes('thank') ||
                tab.url.includes('complete')
            )) {

                try {
                    const status = await this.checkSubscriptionStatus(userEmail);
                    if (status.isActive) {
                        await chrome.storage.local.set({
                            isPremium: true,
                            subscriptionActive: true,
                            planType: 'pro',
                            subscriptionId: status.subscriptionId,
                            activatedAt: Date.now(),
                            userEmail: userEmail
                        });
                        this.isPremium = true;
                        await this.render();
                        this.updateUIForProUser();
                        this.showProActivationSuccess();

                        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                    }
                } catch (error) {
                }
            }

            if (changeInfo.status === 'complete' && tab.url && !tab.url.includes('stripe.com')) {
                setTimeout(async () => {
                    try {
                        const status = await this.checkSubscriptionStatus(userEmail);
                        if (status.isActive) {

                        }
                    } catch (error) {
                    }
                }, 2000);
            }
        };

        const tabRemoveListener = async (removedTabId) => {
            if (removedTabId === tabId) {

                setTimeout(async () => {
                    try {
                        const status = await this.checkSubscriptionStatus(userEmail);
                        if (status.isActive) {
                            await chrome.storage.local.set({
                                isPremium: true,
                                subscriptionActive: true,
                                planType: 'pro',
                                subscriptionId: status.subscriptionId,
                                activatedAt: Date.now(),
                                userEmail: userEmail
                            });
                            this.isPremium = true;
                            await this.render();
                            this.updateUIForProUser();
                            this.showProActivationSuccess();
                        }
                    } catch (error) {
                    }
                }, 3000);

                chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                chrome.tabs.onRemoved.removeListener(tabRemoveListener);
            }
        };

        chrome.tabs.onUpdated.addListener(tabUpdateListener);
        chrome.tabs.onRemoved.addListener(tabRemoveListener);

        setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(tabUpdateListener);
            chrome.tabs.onRemoved.removeListener(tabRemoveListener);
        }, 30 * 60 * 1000);
    }

    startAggressivePolling(userEmail) {
        let attempts = 0;
        const maxAttempts = 120;
        const intervalTime = 5000;
        const pollInterval = setInterval(async () => {
            attempts++;
            try {
                const status = await this.checkSubscriptionStatus(userEmail);
                if (status.isActive && status.plan === 'pro') {

                    await chrome.storage.local.set({
                        isPremium: true,
                        subscriptionActive: true,
                        planType: 'pro',
                        subscriptionId: status.subscriptionId,
                        activatedAt: Date.now(),
                        userEmail: userEmail
                    });
                    this.isPremium = true;
                    await this.render();
                    this.updateUIForProUser();

                    this.showProActivationSuccess();

                    clearInterval(pollInterval);
                    return;
                }

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    this.startSubscriptionPolling(userEmail);
                }
            } catch (error) {
            }
        }, intervalTime);

        chrome.storage.local.set({
            pollingInterval: pollInterval,
            pollingUserEmail: userEmail
        });
    }

    startSubscriptionPolling(userEmail) {
        let attempts = 0;
        const maxAttempts = 40;
        const intervalTime = 30000;
        const pollInterval = setInterval(async () => {
            attempts++;
            try {
                const status = await this.checkSubscriptionStatus(userEmail);
                if (status.isActive && status.plan === 'pro') {

                    await chrome.storage.local.set({
                        isPremium: true,
                        subscriptionActive: true,
                        planType: 'pro',
                        subscriptionId: status.subscriptionId,
                        activatedAt: Date.now()
                    });
                    this.isPremium = true;
                    await this.render();
                    this.updateUIForProUser();

                    clearInterval(pollInterval);

                    this.showProActivationSuccess();
                    return;
                }
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    this.showMessage('⏰ Pro activation check timed out. Please refresh or contact support.', 'warning');
                }
            } catch (error) {
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    this.showMessage('❌ Unable to verify Pro activation. Please refresh or contact support.', 'error');
                }
            }
        }, intervalTime);

        chrome.storage.local.set({
            pollingStarted: Date.now(),
            pollingActive: true
        });
    }

    showProActivationSuccess() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
            justify-content: center; z-index: 10001; backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px); transition: all 0.3s ease; pointer-events: all;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 32px; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);">
                <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                <h2 style="margin: 0 0 12px 0; color: #16a34a; font-size: 24px;">Welcome to Pro!</h2>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 16px;">
                    Your subscription is now active. Enjoy unlimited tabs and all premium features!
                </p>
                <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <div style="color: #15803d; font-weight: 600; margin-bottom: 8px;">✅ Pro Features Unlocked:</div>
                    <div style="color: #16a34a; font-size: 14px; text-align: left;">
                        • Unlimited tab management<br>
                        • Custom timers and scheduling<br>
                        • Bookmarks and favorites<br>
                        • Advanced organization tools<br>
                        • Priority support
                    </div>
                </div>
                <button id="pro-success-close" style="
                    background: linear-gradient(135deg, #16a34a, #15803d); color: white;
                    border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;
                    font-size: 16px; font-weight: 600; width: 100%;
                ">Start Using Pro Features</button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#pro-success-close');
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        setTimeout(closeModal, 5000);
    }

    async checkProStatus(installationId) {
        return false;
    }
    async getOrCreateInstallationId() {
        try {
            let result = await chrome.storage.local.get(['installationId']);
            if (!result.installationId) {
                const installationId = 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                await chrome.storage.local.set({ installationId });
                return installationId;
            }
            return result.installationId;
        } catch (error) {
            return 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    }
    async createPaymentSession(userEmail) {
        try {

            try {
                const response = await fetch(`${API_BASE}/create-checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });
                if (response.ok) {
                    const data = await response.json();

                    await chrome.storage.local.set({
                        checkoutSessionId: data.sessionId,
                        stripeCustomerId: data.customerId
                    });
                    this.showMessage('💳 Opening secure Stripe checkout...', 'info');
                    return data.url;
                } else {
                }
            } catch (apiError) {
            }

            this.showMessage('💳 Opening Stripe payment page...', 'info');
            return this.createFallbackPaymentLink(userEmail);
        } catch (error) {
            this.showMessage('❌ Payment system error. Please try again or contact support.', 'error');
            return null;
        }
    }
    createFallbackPaymentLink(userEmail) {

        const extensionId = chrome.runtime.id;
        const successUrl = `chrome-extension://${extensionId}/success.html`;

        const livePaymentLink = `https://buy.stripe.com/dRm5kEgDE1R29cPgM84Rq00`;
        this.showMessage('💳 Opening Stripe checkout. Complete payment to activate Pro instantly.', 'info');
        return livePaymentLink;
    }
    async showInlineStripePortal() {
        try {

            const customerData = await chrome.storage.local.get(['stripeCustomerId', 'userEmail']);
            const userEmail = customerData.userEmail || await this.getUserEmail();
            if (!userEmail && !customerData.stripeCustomerId) {
                this.showError('Unable to access billing portal. Please contact support.');
                return;
            }

            const response = await fetch(`${API_BASE}/billing-portal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    customerId: customerData.stripeCustomerId,
                    bypassKey: 'ext_bypass_2024'
                })
            });
            if (response.ok) {
                const data = await response.json();

                if (data.customer_id) {
                    await chrome.storage.local.set({
                        stripeCustomerId: data.customer_id
                    });
                }

                chrome.tabs.create({
                    url: data.url,
                    active: true
                });
            } else {
                let errorData;
                try {
                    errorData = await response.text();
                } catch (e) {
                    errorData = 'Unable to parse error response';
                }

                if (response.status === 401 || (errorData && errorData.includes('Authentication Required'))) {
                    throw new Error('Deployment protection enabled - using fallback portal');
                }
                throw new Error(`API Error: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {

            chrome.tabs.create({
                url: 'https://buy.stripe.com/payment_link',
                active: true
            });
        }
    }

    async testStripeAPI() {
        try {
            const response = await fetch(`${API_BASE}/test-stripe`, {
                method: 'GET'
            });
            const data = await response.json();
            if (data.status === 'success') {
                this.showMessage('✅ Stripe API is working!', 'success');
            } else {
                this.showMessage(`❌ Stripe API Error: ${data.error}`, 'error');
            }
            return data;
        } catch (error) {
            this.showMessage(`❌ API Test Failed: ${error.message}`, 'error');
            return null;
        }
    }
    showCancellationConfirm(parentModal) {
        const confirmModal = document.createElement('div');
        confirmModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            pointer-events: all;
        `;
        const confirmContent = document.createElement('div');
        confirmContent.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        `;
        confirmContent.innerHTML = `
            <div style="color: #ff6b6b; font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3 style="margin: 0 0 16px 0; color: #333; font-size: 20px;">Cancel Subscription?</h3>
            <p style="margin: 0 0 24px 0; color: #666; line-height: 1.6;">
                Are you sure you want to cancel your Pro subscription? You'll lose access to premium features at the end of your current billing period.
            </p>
            <div style="display: flex; gap: 12px;">
                <button id="confirm-cancel" style="
                    flex: 1;
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Yes, Cancel</button>
                <button id="keep-subscription" style="
                    flex: 1;
                    background: #4caf50;
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Keep Pro</button>
            </div>
        `;
        confirmContent.querySelector('#confirm-cancel').addEventListener('click', () => {
            chrome.tabs.create({
                url: 'https://buy.stripe.com/payment_link',
                active: true
            });
            confirmModal.remove();
            parentModal.remove();
        });
        confirmContent.querySelector('#keep-subscription').addEventListener('click', () => {
            confirmModal.remove();
        });
        confirmModal.appendChild(confirmContent);
        document.body.appendChild(confirmModal);
    }
    showPopupBlockedMessage(existingModal) {
        if (existingModal) {
            existingModal.remove();
        }
        const modal = document.createElement('div');
        modal.className = 'popup-blocked-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            pointer-events: all;
        `;
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 400px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
        `;
        modalContent.innerHTML = `
            <div style="color: #f59e0b; font-size: 48px; margin-bottom: 15px;">🚫</div>
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Popup Blocked</h3>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6; font-size: 14px;">
                Your browser blocked the Stripe billing portal popup. Please click the button below to open it manually.
            </p>
            <button id="manual-open-btn" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 10px;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">Open Stripe Portal</button>
            <br>
            <button id="close-blocked-modal" style="
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 14px;
                text-decoration: underline;
            ">Close</button>
        `;
        modalContent.querySelector('#manual-open-btn').addEventListener('click', () => {
            chrome.tabs.create({
                url: 'https://buy.stripe.com/payment_link',
                active: true
            });
            modal.remove();
        });
        modalContent.querySelector('#close-blocked-modal').addEventListener('click', () => {
            modal.remove();
        });
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async checkSubscriptionStatus(userEmail) {
        try {
            if (!userEmail || typeof userEmail !== 'string') {
                return { isActive: false, plan: 'free', subscriptionId: null };
            }

            const stored = await chrome.storage.local.get(['isPremium', 'planType', 'subscriptionActive', 'lastSyncTime', 'subscriptionId']);
            if (stored.isPremium === true || stored.planType === 'pro' || stored.subscriptionActive === true) {
                this.isPremium = true;
                return { isActive: true, plan: 'pro', subscriptionId: stored.subscriptionId };
            }

            try {
                const storedUserData = localStorage.getItem('tabmangment_user');
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);

                    if (userData.isPro === true || userData.plan === 'pro') {
                        let billingData = {};
                        try {
                            const backendUrl = await this.getBackendUrl();
                            if (backendUrl) {
                                const response = await fetch(`${backendUrl}/api/get-subscription`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ email: userEmail }),
                                    timeout: 5000
                                });

                                if (response.ok) {
                                    billingData = await response.json();
                                }
                            }
                        } catch (apiError) {
                        }

                        await chrome.storage.local.set({
                            isPremium: true,
                            subscriptionActive: true,
                            planType: 'pro',
                            activatedAt: new Date().toISOString(),
                            nextBillingDate: billingData.nextBillingDate || userData.currentPeriodEnd,
                            currentPeriodEnd: billingData.currentPeriodEnd || userData.currentPeriodEnd,
                            subscriptionId: userData.subscriptionId || ('dash_' + Date.now()),
                            paymentConfirmed: true,
                            subscriptionStatus: billingData.subscriptionStatus || 'active',
                            userEmail: userEmail,
                            isAdmin: billingData.isAdmin || false
                        });

                        this.isPremium = true;
                        await this.render();
                        this.updateUIForProUser();
                        await this.renderSubscriptionPlan();

                        return {
                            isActive: true,
                            plan: 'pro',
                            subscriptionId: userData.subscriptionId,
                            currentPeriodEnd: billingData.currentPeriodEnd
                        };
                    }
                }
            } catch (error) {
            }

            const localStatus = await chrome.storage.local.get(['isPremium', 'subscriptionActive', 'planType', 'subscriptionId', 'payment_success']);

            if (localStatus.payment_success && !localStatus.payment_success.processed) {
                const paymentTime = new Date(localStatus.payment_success.timestamp);
                const now = new Date();
                const timeDiff = now - paymentTime;
                if (timeDiff < 30 * 60 * 1000) {
                    await this.upgradeToProPlan();
                    await chrome.storage.local.set({
                        payment_success: { ...localStatus.payment_success, processed: true }
                    });
                    return { isActive: true, plan: 'pro', subscriptionId: 'recent_payment' };
                }
            }


            if (localStatus.isPremium && localStatus.subscriptionActive) {
                return {
                    isActive: true,
                    plan: localStatus.planType || 'pro',
                    subscriptionId: localStatus.subscriptionId || 'local_subscription'
                };
            }
            return {
                isActive: false,
                plan: 'free',
                subscriptionId: null
            };
        } catch (error) {
            return {
                isActive: false,
                plan: 'free',
                subscriptionId: null
            };
        }
    }

    async checkSubscriptionStatusBackground() {
        try {
            const cached = await chrome.storage.local.get(['isPremium', 'planType', 'subscriptionActive']);

            if (this.userEmail) {
                try {
                    const backendUrl = await this.getBackendUrl();
                    if (backendUrl) {
                        const response = await fetch(`${backendUrl}/api/get-subscription`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ email: this.userEmail }),
                            timeout: 8000
                        });

                        if (response.ok) {
                            const data = await response.json();

                            if (data.success && data.isPro) {
                                await chrome.storage.local.set({
                                    isPremium: true,
                                    subscriptionActive: true,
                                    planType: data.subscriptionType || 'pro',
                                    subscriptionStatus: data.subscriptionStatus,
                                    nextBillingDate: data.nextBillingDate,
                                    currentPeriodEnd: data.currentPeriodEnd,
                                    stripeCustomerId: data.stripeCustomerId,
                                    stripeSubscriptionId: data.stripeSubscriptionId,
                                    isAdmin: data.isAdmin || false,
                                    lastBillingSync: new Date().toISOString()
                                });
                                this.isPremium = true;

                                this.removeAllProBadges();
                                this.updateUIForProUser();
                                this.renderSubscriptionPlan();
                            } else if (data.success && !data.isPro) {
                                await chrome.storage.local.set({
                                    isPremium: false,
                                    subscriptionActive: false,
                                    planType: 'free',
                                    subscriptionStatus: 'inactive',
                                    nextBillingDate: null,
                                    currentPeriodEnd: null
                                });
                                this.isPremium = false;
                            }
                        }
                    }
                } catch (apiError) {
                }
            }

            const refundCheck = await chrome.storage.local.get(['refundProcessed', 'subscriptionRefunded']);
            if (refundCheck.refundProcessed || refundCheck.subscriptionRefunded) {
                await chrome.storage.local.set({
                    isPremium: false,
                    subscriptionActive: false,
                    planType: 'free'
                });
                this.isPremium = false;
                this.render();
            }
        } catch (error) {
        }
    }

    async checkSubscription() {
        try {
            const userEmail = await this.getUserEmail();
            if (userEmail) {
                const status = await this.checkSubscriptionStatus(userEmail);
                if (status.isActive && status.plan === 'pro') {
                    await this.activateProFeatures();
                }
            }
        } catch (error) {
        }
    }

    async activateProFeatures() {
        try {
            const userEmail = await this.getUserEmail();
            const proData = {
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                activatedAt: new Date().toISOString(),
                nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
                subscriptionId: 'simple_' + Date.now(),
                userEmail: userEmail
            };

            await chrome.storage.local.set(proData);
            this.isPremium = true;
            await this.render();
            this.updateUIForProUser();
        } catch (error) {
        }
    }

    async autoCheckPaymentCompletion() {
        try {

            const tabs = await chrome.tabs.query({});

            for (const tab of tabs) {
                if (tab.url) {
                    const url = tab.url.toLowerCase();
                    const hasPaymentUrl = (
                        url.includes('success') ||
                        url.includes('thank') ||
                        url.includes('confirmation') ||
                        url.includes('complete') ||
                        url.includes('sites.google.com') ||
                        url.includes('stripe.com') ||
                        url.includes('payment')
                    );


                    if (hasPaymentUrl) {
                        try {
                            const results = await chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                func: () => {
                                    return document.body ? document.body.textContent.toLowerCase() : '';
                                }
                            });

                            if (results && results[0] && results[0].result) {
                                const pageText = results[0].result;

                                const hasPaymentContent = (
                                    pageText.includes('thanks for subscribing') ||
                                    pageText.includes('thank you for subscribing') ||
                                    pageText.includes('payment successful') ||
                                    pageText.includes('will appear on your statement') ||
                                    pageText.includes('sites.google.com/view') ||
                                    (pageText.includes('payment to') && pageText.includes('will appear'))
                                );


                                if (hasPaymentContent) {
                                    const userEmail = await this.getUserEmail();
                                    await this.activateProForPayment(userEmail);
                                    return;
                                }
                            }
                        } catch (e) {
                            if (url.includes('sites.google.com') || url.includes('thank') || url.includes('success')) {
                                const userEmail = await this.getUserEmail();
                                await this.activateProForPayment(userEmail);
                                return;
                            }
                        }
                    }
                }
            }


        } catch (error) {
        }
    }

    async activateProForPayment(userEmail) {
        try {

            const currentStatus = await chrome.storage.local.get(['isPremium', 'proWelcomeShown']);

            if (currentStatus.isPremium) {
                this.isPremium = true;
                await this.render();
                this.updateUIForProUser();
                await this.renderSubscriptionPlan();
                return true;
            }

            const shouldShowNotification = !currentStatus.proWelcomeShown;

            const proData = {
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                activatedAt: new Date().toISOString(),
                nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
                subscriptionId: 'auto_detected_' + Date.now(),
                paymentConfirmed: true,
                userEmail: userEmail,
                activatedVia: 'popup_auto_detection',
                paymentDetected: true,
                autoActivated: true,
                detectionMethod: 'popup_scan',
                proWelcomeShown: true
            };

            await chrome.storage.local.set(proData);

            this.isPremium = true;

            await this.render();
            this.updateUIForProUser();
            await this.renderSubscriptionPlan();


            if (this.showMessage) {
                this.showMessage('🎉 Pro features activated! Payment detected.', 'success');
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    async getUserEmail() {
        try {
            const stored = await chrome.storage.local.get(['userEmail']);
            if (stored.userEmail &&
                !stored.userEmail.startsWith('fallback_') &&
                !stored.userEmail.startsWith('user_')) {
                return stored.userEmail;
            }

            if (!this.emailDetector) {
                this.emailDetector = new EmailDetector();
            }

            const email = await this.emailDetector.detectUserEmail();

            if (email) {
                return email;
            } else {
                const uniqueUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

                await chrome.storage.local.set({
                    userEmail: uniqueUserId,
                    detectedEmail: uniqueUserId,
                    emailDetectedAt: new Date().toISOString(),
                    anonymousUser: true,
                    userType: 'chrome_web_store'
                });

                return uniqueUserId;
            }
        } catch (error) {
            const stored = await chrome.storage.local.get(['userEmail']);
            if (stored.userEmail &&
                !stored.userEmail.startsWith('fallback_') &&
                !stored.userEmail.startsWith('user_')) {
                return stored.userEmail;
            }

            const fallbackId = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await chrome.storage.local.set({
                userEmail: fallbackId,
                emailDetectionError: error.message,
                fallbackGenerated: true
            });
            return fallbackId;
        }
    }
    async promptForEmail() {
        return new Promise((resolve) => {
            const email = prompt('Please enter your email address to access premium features:');
            if (email && this.isValidEmail(email)) {
                chrome.storage.local.set({ userEmail: email });
                resolve(email);
            } else {
                resolve(null);
            }
        });
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    async checkAndApplySubscriptionStatus() {
        try {
            const stored = await chrome.storage.local.get(['userEmail', 'isPremium', 'planType', 'subscriptionActive']);
            if (!stored.userEmail) {
                this.isPremium = false;
                return;
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
            }

            if (!isPro) {
                isPro = stored.isPremium === true || stored.planType === 'pro' || stored.subscriptionActive === true;
            }

            if (isPro) {
                await chrome.storage.local.set({
                    hasProPlan: true,
                    isPremium: true,
                    subscriptionActive: true,
                    planType: 'pro',
                    subscriptionStatus: userData?.subscriptionStatus || 'active',
                    currentPeriodEnd: userData?.currentPeriodEnd || null,
                    nextBillingDate: userData?.nextBillingDate || userData?.currentPeriodEnd || null,
                    stripeCustomerId: userData?.stripeCustomerId,
                    stripeSubscriptionId: userData?.stripeSubscriptionId,
                    lastStatusCheck: new Date().toISOString()
                });
                this.isPremium = true;
                this.updateUIForProUser();

                if (userData) {
                    this.updateSubscriptionInfo(userData);
                }
            } else {
                await chrome.storage.local.set({
                    hasProPlan: false,
                    isPremium: false,
                    subscriptionActive: false,
                    planType: 'free',
                    subscriptionStatus: 'free',
                    subscriptionId: null,
                    lastStatusCheck: new Date().toISOString()
                });
                this.isPremium = false;
            }
        } catch (error) {
            const fallback = await chrome.storage.local.get(['isPremium']);
            this.isPremium = fallback.isPremium === true;
        }
    }

    updateSubscriptionInfo(data) {
        if (data.currentPeriodEnd) {
            const endDate = new Date(data.currentPeriodEnd);
            const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

            this.subscriptionInfo = {
                status: data.subscriptionStatus,
                currentPeriodEnd: data.currentPeriodEnd,
                daysLeft: daysLeft,
                customerId: data.stripeCustomerId,
                subscriptionId: data.stripeSubscriptionId
            };
        }
    }

    startSubscriptionStatusRefresh() {

    }
    async upgradeToProPlan() {
        try {
            const currentStatus = await chrome.storage.local.get(['isPremium', 'hasProPlan', 'proWelcomeShown']);

            if (currentStatus.isPremium || currentStatus.hasProPlan) {
                this.isPremium = true;
                this.updateUIForProUser();
                return;
            }

            const shouldShowWelcome = !currentStatus.proWelcomeShown;

            await chrome.storage.local.set({
                hasProPlan: true,
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                proUpgradedAt: new Date().toISOString(),
                proFeatures: ['unlimited_tabs', 'advanced_management', 'premium_themes'],
                proWelcomeShown: true
            });

            await chrome.storage.local.remove(['expecting_payment', 'payment_success']);

            this.isPremium = true;

            this.updateUIForProUser();

            const paymentBtn = document.getElementById('payment-completion-btn');
            if (paymentBtn) paymentBtn.remove();

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            this.showMessage('⚠️ Payment detected but upgrade failed. Please refresh the extension.', 'warning');
        }
    }
    async showProSuccessMessage() {
        return;
    }
    async updateUIForProUser() {

        const upgradeButtons = document.querySelectorAll('#tab-limit-upgrade-btn, #premium-upgrade');
        upgradeButtons.forEach(btn => {
            if (btn) {
                btn.style.display = 'none';
            }
        });

        const tabLimitWarning = document.getElementById('tab-limit-warning');
        if (tabLimitWarning) {
            tabLimitWarning.style.display = 'none';
        }

        const premiumBtn = document.getElementById('premium-btn');
        const premiumBtnText = document.getElementById('premium-btn-text');
        if (premiumBtn && premiumBtnText) {
            premiumBtnText.textContent = 'Manage Subscription';
            premiumBtn.title = 'Manage your Pro subscription';

            premiumBtn.replaceWith(premiumBtn.cloneNode(true));
            const newPremiumBtn = document.getElementById('premium-btn');
            newPremiumBtn.addEventListener('click', () => {
                this.openStripeBillingPortal();
            });
        }

        await this.updatePlanIndicator();

        this.removeAllProBadges();

        this.updatePremiumUI();
    }
    async updateUIForFreeUser() {
        const upgradeButtons = document.querySelectorAll('#tab-limit-upgrade-btn, #premium-upgrade');
        upgradeButtons.forEach(btn => {
            if (btn) {
                btn.style.display = 'block';
            }
        });

        const premiumBtn = document.getElementById('premium-btn');
        const premiumBtnText = document.getElementById('premium-btn-text');
        if (premiumBtn && premiumBtnText) {
            premiumBtnText.textContent = 'Upgrade Pro';
            premiumBtn.title = 'Upgrade to Pro';

            premiumBtn.replaceWith(premiumBtn.cloneNode(true));
            const newPremiumBtn = document.getElementById('premium-btn');
            newPremiumBtn.addEventListener('click', () => {
                this.handlePremiumButtonClick();
            });
        }

        const planIndicator = document.getElementById('plan-indicator');
        if (planIndicator) {
            planIndicator.className = 'plan-indicator free-plan';
            planIndicator.innerHTML = '<div class="plan-badge">FREE PLAN</div><div class="plan-description">Limited to 10 tabs</div>';
        }

        this.removeAllProBadges();
        this.addProBadgesToLockedFeatures();

        this.updatePremiumUI();
    }
    async updatePlanIndicator() {
        const planIndicator = document.getElementById('plan-indicator');
        if (planIndicator) {

            const subData = await chrome.storage.local.get(['currentPeriodEnd', 'subscriptionId', 'subscriptionStatus']);
            let billingInfo = '';

            if (subData.currentPeriodEnd) {
                const nextBilling = new Date(subData.currentPeriodEnd);
                const formattedDate = nextBilling.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                if (subData.subscriptionStatus === 'cancelling') {
                    billingInfo = `Ends ${formattedDate}`;
                } else {
                    billingInfo = `Renews ${formattedDate}`;
                }
            } else {
                billingInfo = 'Pro features active';
            }

            planIndicator.className = 'plan-indicator pro-plan';
            planIndicator.innerHTML = `
                <div class="plan-badge">PRO PLAN</div>
                <div class="plan-description">${billingInfo}</div>
            `;
        }
    }
    removeAllProBadges() {

        const existingBadges = document.querySelectorAll('.pro-badge');
        existingBadges.forEach(badge => badge.remove());
    }
    async checkAndApplyProStatus() {
        try {

            const paymentData = await chrome.storage.local.get(['payment_success']);
            if (paymentData.payment_success && !paymentData.payment_success.processed) {
                const paymentTime = new Date(paymentData.payment_success.timestamp);
                const now = new Date();
                const timeDiff = now - paymentTime;

                if (timeDiff < 30 * 60 * 1000) {
                    await this.upgradeToProPlan();

                    await chrome.storage.local.set({
                        payment_success: {
                            ...paymentData.payment_success,
                            processed: true
                        }
                    });
                    return;
                }
            }

            const data = await chrome.storage.local.get(['hasProPlan', 'proUpgradedAt']);
            if (data.hasProPlan) {
                this.updateUIForProUser();

                const upgradedDate = new Date(data.proUpgradedAt).toLocaleDateString();
            } else {
            }
        } catch (error) {
        }
    }
    startSubscriptionStatusMonitoring(installationId) {
        let checkCount = 0;
        const maxChecks = 60;
        const checkInterval = setInterval(async () => {
            checkCount++;
            try {
                const status = await this.checkPaymentStatus(installationId);
                if (status.isPaid) {
                    await this.activateSubscription(status);
                    clearInterval(checkInterval);
                    await this.render();
                    await this.renderSubscriptionPlan();
                }
            } catch (error) {
            }
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
            }
        }, 3000);
    }
    clearPaymentStatusCache() {
        this.paymentStatusCache = null;
        this.paymentStatusCacheTime = 0;
    }
    async checkPaymentStatus(installationId) {
        try {
            const now = Date.now();
            if (this.paymentStatusCache && (now - this.paymentStatusCacheTime) < this.cacheTimeout) {
                return this.paymentStatusCache;
            }
            const refundCheck = await chrome.storage.local.get([
                'refundProcessed',
                'subscriptionRefunded',
                'subscriptionCancelled'
            ]);
            if (refundCheck.refundProcessed || refundCheck.subscriptionRefunded || refundCheck.subscriptionCancelled) {
                const result = { isPaid: false };
                this.paymentStatusCache = result;
                this.paymentStatusCacheTime = now;
                return result;
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

            const localSub = await chrome.storage.local.get(['stripePaymentCompleted', 'isPremium', 'isPro', 'planType']);
            if (!isPro) {
                isPro = localSub.stripePaymentCompleted || localSub.isPremium || localSub.isPro || localSub.planType === 'pro';
            }

            if (isPro) {
                const result = {
                    isPaid: true,
                    customer_id: 'stripe_customer',
                    subscription_id: 'stripe_sub',
                    subscription_type: 'monthly',
                    next_billing_date: this.calculateNextBillingDate('monthly')
                };
                this.paymentStatusCache = result;
                this.paymentStatusCacheTime = now;
                return result;
            }
            const result = { isPaid: false };
            this.paymentStatusCache = result;
            this.paymentStatusCacheTime = now;
            return result;
        } catch (error) {
            if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
            }
            try {
                const emergencyCheck = await chrome.storage.local.get(['isPremium', 'subscriptionActive']);
                if (emergencyCheck.isPremium || emergencyCheck.subscriptionActive) {
                    return {
                        isPaid: true,
                        customer_id: 'emergency_customer',
                        subscription_id: 'emergency_sub',
                        subscription_type: 'monthly',
                        next_billing_date: this.calculateNextBillingDate('monthly')
                    };
                }
            } catch (emergencyError) {
            }
            return { isPaid: false };
        }
    }
    async activateSubscription(subscriptionData) {
        try {
            const now = Date.now();
            const subscriptionType = subscriptionData.subscription_type || 'monthly';

            const stored = await chrome.storage.local.get(['isAdmin', 'planType']);
            const isAdmin = stored.isAdmin || stored.planType === 'admin';

            let nextBillingDate = subscriptionData.next_billing_date;

            if (isAdmin) {
                const farFuture = new Date();
                farFuture.setFullYear(farFuture.getFullYear() + 100);
                nextBillingDate = farFuture.getTime();
            } else if (!nextBillingDate || nextBillingDate <= now) {
                nextBillingDate = this.calculateNextBillingDate(subscriptionType, now);
            }

            await chrome.storage.local.set({
                isPremium: true,
                subscriptionActive: true,
                planType: isAdmin ? 'admin' : 'pro',
                subscriptionExpiry: nextBillingDate,
                nextBillingDate: nextBillingDate,
                subscriptionType: subscriptionType,
                stripeCustomerId: subscriptionData.customer_id,
                subscriptionId: subscriptionData.subscription_id,
                subscriptionDate: now,
                lastPaymentDate: subscriptionData.payment_date || now
            });
            this.isPremium = true;
        } catch (error) {
        }
    }
    async forceSubscriptionCheck() {
        try {
            const installationId = await this.getOrCreateInstallationId();
            const status = await this.checkPaymentStatus(installationId);
            if (status.isPaid && !this.isPremium) {
                await this.activateSubscription(status);
            }
            const currentSub = await chrome.storage.local.get(['isPremium']);
            this.isPremium = currentSub.isPremium || false;
        } catch (error) {
        }
    }
    setupStripeWebhookListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'stripe-webhook') {
                this.handleStripeWebhook(message.data);
            }
        });
    }
    async handleStripeWebhook(webhookData) {
        try {
            this.clearPaymentStatusCache();
            const { event_type, customer_id, subscription_id } = webhookData;
            const currentData = await chrome.storage.local.get(['stripeCustomerId', 'subscriptionId']);
            if (currentData.stripeCustomerId !== customer_id && currentData.subscriptionId !== subscription_id) {
                return;
            }
            switch (event_type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(webhookData);
                    break;
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(webhookData);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(webhookData);
                    break;
                case 'customer.subscription.deleted':
                case 'customer.subscription.cancelled':
                    await this.handleSubscriptionCancelled(webhookData);
                    break;
                case 'charge.dispute.created':
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(webhookData);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(webhookData);
                    break;
                default:
            }
            await this.loadData();
            await this.render();
            await this.renderSubscriptionPlan();
        } catch (error) {
        }
    }
    async handlePaymentSucceeded(webhookData) {
        try {
            const {
                next_billing_date,
                subscription_type,
                customer_id,
                subscription_id,
                current_period_start,
                current_period_end
            } = webhookData;
            if (!next_billing_date || isNaN(new Date(next_billing_date).getTime())) {
                return;
            }
            const billingDate = new Date(next_billing_date);
            const formattedDate = billingDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            await chrome.storage.local.set({
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                subscriptionExpiry: next_billing_date,
                nextBillingDate: next_billing_date,
                subscriptionType: subscription_type || 'monthly',
                lastPaymentDate: Date.now(),
                stripeCustomerId: customer_id,
                subscriptionId: subscription_id,
                currentPeriodStart: current_period_start,
                currentPeriodEnd: current_period_end,
                lastWebhookUpdate: Date.now()
            });
            this.isPremium = true;
            await this.renderSubscriptionPlan();
        } catch (error) {
        }
    }
    async handleCheckoutCompleted(webhookData) {
        try {
            const {
                customer_id,
                subscription_id,
                subscription_type,
                subscription_status,
                current_period_start,
                current_period_end,
                trial_end
            } = webhookData;
            await chrome.storage.local.set({
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                stripeCustomerId: customer_id,
                subscriptionId: subscription_id,
                subscriptionType: subscription_type,
                subscriptionStatus: subscription_status,
                activationDate: Date.now(),
                currentPeriodStart: current_period_start,
                currentPeriodEnd: current_period_end,
                trialEnd: trial_end,
                nextBillingDate: current_period_end,
                stripePaymentCompleted: true
            });
            this.isPremium = true;
            await this.renderSubscriptionPlan();
        } catch (error) {
        }
    }
    async handleSubscriptionCreated(webhookData) {
        try {
            const {
                customer_id,
                subscription_id,
                subscription_type,
                subscription_status,
                current_period_start,
                current_period_end,
                trial_end
            } = webhookData;
            await chrome.storage.local.set({
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                stripeCustomerId: customer_id,
                subscriptionId: subscription_id,
                subscriptionType: subscription_type,
                subscriptionStatus: subscription_status,
                createdDate: Date.now(),
                currentPeriodStart: current_period_start,
                currentPeriodEnd: current_period_end,
                trialEnd: trial_end,
                nextBillingDate: current_period_end,
                stripePaymentCompleted: true
            });
            this.isPremium = true;
            await this.renderSubscriptionPlan();
        } catch (error) {
        }
    }
    async handleSubscriptionCancelled(webhookData) {
        const { cancellation_date, period_end } = webhookData;
        await chrome.storage.local.set({
            subscriptionCancelled: true,
            cancellationDate: cancellation_date || Date.now(),
            subscriptionExpiry: period_end || (this.calculateNextBillingDate('monthly'))
        });
    }
    async handlePaymentFailed(webhookData) {
        const { reason, refund_amount } = webhookData;
        await chrome.storage.local.set({
            isPremium: false,
            subscriptionActive: false,
            planType: 'free',
            refundProcessed: true,
            refundDate: Date.now(),
            refundReason: reason || 'payment_failed',
            refundAmount: refund_amount || 0,
            subscriptionExpiry: null,
            nextBillingDate: null,
            stripeCustomerId: null,
            subscriptionId: null
        });
        this.isPremium = false;
    }
    async handleSubscriptionUpdated(webhookData) {
        const { subscription_status, next_billing_date, subscription_type } = webhookData;
        if (subscription_status === 'active') {
            await chrome.storage.local.set({
                isPremium: true,
                subscriptionActive: true,
                subscriptionExpiry: next_billing_date,
                nextBillingDate: next_billing_date,
                subscriptionType: subscription_type
            });
            this.isPremium = true;
        } else {
            await chrome.storage.local.set({
                isPremium: false,
                subscriptionActive: false,
                planType: 'free'
            });
            this.isPremium = false;
        }
    }
    async getBackendUrl() {

        return CONFIG.API.BASE.replace('/api', '');
    }
    async getAuthToken() {
        try {
            const data = await chrome.storage.local.get(['installationId', 'stripeCustomerId']);
            return data.installationId || data.stripeCustomerId || 'anonymous';
        } catch (error) {
            return 'anonymous';
        }
    }
    async openSubscriptionManagement() {
        try {
            const customerData = await chrome.storage.local.get(['stripeCustomerId', 'installationId']);
            const customerId = customerData.stripeCustomerId;
            const installationId = customerData.installationId;
            if (!customerId && !installationId) {
                this.showError('Unable to open subscription management. Please contact support.');
                return;
            }
            let portalUrl = null;
            try {
                const backendUrl = await this.getBackendUrl();
                if (!backendUrl) {
                    throw new Error('Backend disabled for offline mode');
                }
                const response = await fetch(`${backendUrl}/create-portal`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customer_id: customerId,
                        installation_id: installationId,
                        return_url: chrome.runtime.getURL('popup.html')
                    }),
                    timeout: 5000
                });
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        portalUrl = data.portal_url;
                    }
                }
            } catch (apiError) {
            }
            if (!portalUrl) {
                const backendUrl = await this.getBackendUrl();
                if (backendUrl) {
                    portalUrl = `${backendUrl}/portal`;
                }
                this.showSubscriptionManagementModal();
                return;
            }
            await chrome.tabs.create({
                url: portalUrl,
                active: true
            });
            setTimeout(() => {
                window.close();
            }, 1500);
        } catch (error) {
            this.showError('Failed to open subscription management. Please try again or contact support.');
        }
    }
    showSubscriptionManagementModal() {
        const modal = document.createElement('div');
        modal.className = 'contact-modal';
        modal.style.display = 'flex';
        const modalContent = document.createElement('div');
        modalContent.className = 'contact-modal-content';
        modalContent.style.maxWidth = '400px';
        modalContent.innerHTML = `
            <div class="contact-header">
                <h3><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAB4ElEQVR4nLWWTWsUQRCGxyAsSLz7ES+Si+BBzEH/Qg45BIJiCGR3qxxhQ1fNBleCBwcP3sWcJdmf4FlQ8As86CkgbKaqs4EQ8QNPKitkV1pXWMTp6VlJQd9m3me66623J4o8ZUyngpxdA5I2kG4hyWdk6QPLV2TZQ9IXyLoOrFfrrXfHozKFRq8gyz6yDkIWkHwDtufCxEnuhgrj6KJsplg8kYWxxDkIMDgCLHpogJj1kv+c9SOQvAHWDFm+lwYgaewBrKfpYOLPs2n69GidsvNA0hy6KQQgtz0uWfS/m80sN+wJPyCRlfwdyL6z7uguSpf7ikK/s3aB9V6w5/8uYH0Z7hp5BYnMOfeFA5rb08j6vow9gfV5dXX7TDCkvtI9BaTPys2A7sbJzslgiGsmkp1H0tcl8uhRNE4h2wvA8uB3mvog0q8l3bPRuGVMp1I3etMlZz7EVnMFbjR3T8fJzsUiEJDe8hzTWv5RGHt5mDmPgWSp0dia/CeA9U7uDoyaQsCIM3ouZ4DlPrK2kG2CpA+B9Ece4Drb2XAAl41r+eL6dHgAtkl+5/4TACTtwiB0444sT4DkIFxcPrkULpVHaDpTQFkNWTaHk/zh1w1G2nO3GrK8BZIN97sSx3vHfGI/AbTJUIUUxJjAAAAAAElFTkSuQmCC" alt="Stripe" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;"> Manage Subscription</h3>
                <button class="contact-close-btn">×</button>
            </div>
            <div style="padding: 20px 0px;">
                <p style="margin-bottom: 20px; color: rgb(71, 85, 105); line-height: 1.6;">Manage your subscription, update payment methods, view invoices, or cancel anytime through Stripe's secure portal.</p>
                <div style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
                    <button class="stripe-portal-btn" style="background: linear-gradient(135deg, rgb(99, 91, 255), rgb(79, 70, 229)); color: white; border: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; cursor: pointer; transition: 0.3s; box-shadow: rgba(99, 91, 255, 0.3) 0px 4px 14px; width: 100%; max-width: 280px; transform: translateY(0px);">
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAB4ElEQVR4nLWWTWsUQRCGxyAsSLz7ES+Si+BBzEH/Qg45BIJiCGR3qxxhQ1fNBleCBwcP3sWcJdmf4FlQ8As86CkgbKaqs4EQ8QNPKitkV1pXWMTp6VlJQd9m3me66623J4o8ZUyngpxdA5I2kG4hyWdk6QPLV2TZQ9IXyLoOrFfrrXfHozKFRq8gyz6yDkIWkHwDtufCxEnuhgrj6KJsplg8kYWxxDkIMDgCLHpogJj1kv+c9SOQvAHWDFm+lwYgaewBrKfpYOLPs2n69GidsvNA0hy6KQQgtz0uWfS/m80sN+wJPyCRlfwdyL6z7uguSpf7ikK/s3aB9V6w5/8uYH0Z7hp5BYnMOfeFA5rb08j6vow9gfV5dXX7TDCkvtI9BaTPys2A7sbJzslgiGsmkp1H0tcl8uhRNE4h2wvA8uB3mvog0q8l3bPRuGVMp1I3etMlZz7EVnMFbjR3T8fJzsUiEJDe8hzTWv5RGHt5mDmPgWSp0dia/CeA9U7uDoyaQsCIM3ouZ4DlPrK2kG2CpA+B9Ece4Drb2XAAl41r+eL6dHgAtkl+5/4TACTtwiB0444sT4DkIFxcPrkULpVHaDpTQFkNWTaHk/zh1w1G2nO3GrK8BZIN97sSx3vHfGI/AbTJUIUUxJjAAAAAAElFTkSuQmCC" alt="Stripe" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;"> Open Stripe Portal
                    </button>
                    <div style="text-align: center; font-size: 14px; color: rgb(100, 116, 139); line-height: 1.5;">✨ Secure portal powered by Stripe<br>Cancel, modify, or download invoices</div>
                </div>
            </div>
        `;

        const closeBtn = modalContent.querySelector('.contact-close-btn');
        closeBtn.addEventListener('click', () => modal.remove());
        const portalBtn = modalContent.querySelector('.stripe-portal-btn');
        portalBtn.addEventListener('mouseenter', () => {
            portalBtn.style.transform = 'translateY(-2px)';
            portalBtn.style.boxShadow = '0 6px 20px rgba(99, 91, 255, 0.4)';
        });
        portalBtn.addEventListener('mouseleave', () => {
            portalBtn.style.transform = 'translateY(0)';
            portalBtn.style.boxShadow = '0 4px 14px rgba(99, 91, 255, 0.3)';
        });
        portalBtn.addEventListener('click', async () => {
            await this.openStripeBillingPortal();
            modal.remove();
        });
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    async openStripeBillingPortal() {
        try {
            await chrome.tabs.create({
                url: `${CONFIG.WEB.DASHBOARD_URL}`,
                active: true
            });
        } catch (error) {
            this.showError('Failed to open dashboard. Please try again.');
        }
    }
    async showFallbackSubscriptionPortal(userEmail) {

        await this.showInlineStripePortal();
    }
    showStripePortalInstructions(userEmail) {
        const modal = document.createElement('div');
        modal.className = 'instruction-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            pointer-events: all;
        `;
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            padding: 30px;
            border-radius: 15px;
            max-width: 550px;
            width: 90%;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            text-align: center;
        `;
        modalContent.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-size: 24px;">🏛️ Access Your Stripe Portal</h2>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                <h3 style="margin: 0 0 15px 0; color: #FFE066;">📋 Step-by-Step Instructions:</h3>
                <ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li><strong>Log into Stripe</strong> with your account credentials</li>
                    <li><strong>Look for "Customers"</strong> section in the dashboard</li>
                    <li><strong>Search for your email:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">${userEmail}</code></li>
                    <li><strong>Click on your customer record</strong></li>
                    <li><strong>View/manage subscriptions</strong> from your customer page</li>
                </ol>
            </div>
            <div style="background: rgba(255, 196, 0, 0.2); padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                <p style="margin: 0; font-size: 13px; line-height: 1.4;">
                    <strong>💡 Alternative:</strong> If you can't access Stripe dashboard, you can email us at
                    <strong>support@tabmangment.com</strong> with your subscription email to request cancellation.
                </p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="try-different-btn" style="
                    flex: 1;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">Try Different Method</button>
                <button id="close-instructions-btn" style="
                    flex: 1;
                    padding: 12px;
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">Got It!</button>
            </div>
        `;
        modalContent.querySelector('#try-different-btn').addEventListener('click', () => {
            modal.remove();
            this.showManualCancellationInstructions(userEmail);
        });
        modalContent.querySelector('#close-instructions-btn').addEventListener('click', () => {
            modal.remove();
        });
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    showManualCancellationInstructions(userEmail) {
        const modal = document.createElement('div');
        modal.className = 'cancellation-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s ease;
            pointer-events: all;
        `;
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 15px;
            max-width: 550px;
            width: 90%;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            text-align: center;
        `;
        modalContent.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-size: 24px;">✉️ Email Cancellation Request</h2>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                <h3 style="margin: 0 0 15px 0; color: #FFE066;">📧 Quick Cancellation via Email:</h3>
                <p style="margin: 0 0 15px 0; line-height: 1.6;">
                    Send an email with the following details to get your subscription cancelled within 24 hours:
                </p>
                <div style="background: rgba(0, 0, 0, 0.2); padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px;">
                    <strong>To:</strong> support@tabmangment.com<br>
                    <strong>Subject:</strong> Cancel Subscription Request<br><br>
                    <strong>Message:</strong><br>
                    Please cancel my Tabmangment Pro subscription.<br>
                    <strong>Email:</strong> ${userEmail}<br>
                    <strong>Cancellation Type:</strong> [Immediate OR End of billing period]<br>
                    <strong>Reason:</strong> [Optional]
                </div>
            </div>
            <div style="background: rgba(76, 175, 80, 0.2); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.4;">
                    <strong>✅ Guaranteed:</strong> We'll process your cancellation within 24 hours and send confirmation.
                    No penalties, no hassle!
                </p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="send-email-btn" style="
                    flex: 1;
                    padding: 12px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">Send Email Now</button>
                <button id="close-cancel-btn" style="
                    flex: 1;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">Close</button>
            </div>
        `;
        modalContent.querySelector('#send-email-btn').addEventListener('click', () => {
            const emailBody = encodeURIComponent(`Please cancel my Tabmangment Pro subscription.
Email: ${userEmail}
Cancellation Type: [Please specify: Immediate OR End of billing period]
Reason: [Optional]
Thank you!`);
            chrome.tabs.create({
                url: `mailto:support@tabmangment.com?subject=Cancel%20Subscription%20Request&body=${emailBody}`
            });
            modal.remove();
        });
        modalContent.querySelector('#close-cancel-btn').addEventListener('click', () => {
            modal.remove();
        });
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    async cancelSubscription() {
        try {
            const confirmCancel = confirm('Are you sure you want to cancel your Pro subscription? You will lose access to unlimited tabs and premium features.');
            if (!confirmCancel) {
                return;
            }
            const customerData = await chrome.storage.local.get(['stripeCustomerId', 'subscriptionId', 'installationId']);
            const customerId = customerData.stripeCustomerId;
            const subscriptionId = customerData.subscriptionId;
            const installationId = customerData.installationId;
            if (!customerId && !subscriptionId && !installationId) {
                this.showError('Unable to find subscription information. Please contact support.');
                return;
            }
            try {
                const backendUrl = await this.getBackendUrl();
                if (!backendUrl) {
                    throw new Error('Backend disabled for offline mode');
                }
                const response = await fetch(`${backendUrl}/cancel-subscription`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customer_id: customerId,
                        subscription_id: subscriptionId,
                        installation_id: installationId
                    }),
                    timeout: 10000
                });
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const result = await response.json();
                        if (result.success) {
                            await this.handleSubscriptionCancellation();
                            this.showMessage('✅ Subscription cancelled successfully. You still have access until the end of your billing period.', 'success');
                            return;
                        }
                    }
                }
            } catch (apiError) {
            }
            this.showManualCancellationInstructions();
        } catch (error) {
            this.showError('Failed to cancel subscription. Please contact support or use the billing portal.');
        }
    }
    async handleSubscriptionCancellation() {
        try {
            await chrome.storage.local.set({
                subscriptionCancelled: true,
                cancellationDate: Date.now(),
            });
            await this.render();
            await this.renderSubscriptionPlan();
        } catch (error) {
        }
    }
    showManualCancellationInstructions() {
        const modal = document.createElement('div');
        modal.className = 'contact-modal';
        modal.style.display = 'flex';
        const modalContent = document.createElement('div');
        modalContent.className = 'contact-modal-content';
        modalContent.style.maxWidth = '450px';
        modalContent.innerHTML = `
            <div class="contact-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px 12px 0 0; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                <h3 style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; color: #635bff;">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Subscription Management
                </h3>
                <button class="contact-close-btn" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">×</button>
            </div>
            <div style="padding: 24px;">
                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #0ea5e9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="color: #0369a1; font-weight: 600; font-size: 14px;">🎯 Your Pro Subscription</span>
                    </div>
                    <div style="color: #0c4a6e; font-size: 13px; line-height: 1.4;">
                        • $4.99/month recurring billing<br>
                        • Cancel anytime with one click<br>
                        • Download invoices and receipts<br>
                        • Update payment methods securely
                    </div>
                </div>
                <div style="text-align: center;">
                    <button id="open-portal-btn" style="
                        background: linear-gradient(135deg, #635bff, #4f46e5);
                        color: white;
                        border: none;
                        padding: 14px 28px;
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: 15px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 3px 12px rgba(99, 91, 255, 0.25);
                        width: 100%;
                        max-width: 300px;
                        margin-bottom: 16px;
                    ">
                        🏛️ Open Billing Portal
                    </button>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.4;">
                        <div style="margin-bottom: 4px;">🔒 Powered by Stripe - Bank-level security</div>
                        <div>⚡ Instant changes • 📧 Email confirmations</div>
                    </div>
                </div>
            </div>
        `;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        const portalBtn = modal.querySelector('#open-portal-btn');
        portalBtn.addEventListener('mouseenter', () => {
            portalBtn.style.transform = 'translateY(-2px)';
            portalBtn.style.boxShadow = '0 6px 20px rgba(99, 91, 255, 0.4)';
        });
        portalBtn.addEventListener('mouseleave', () => {
            portalBtn.style.transform = 'translateY(0)';
            portalBtn.style.boxShadow = '0 4px 14px rgba(99, 91, 255, 0.3)';
        });
        portalBtn.addEventListener('click', async () => {
            await this.openStripeBillingPortal();
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    async handleDirectUpgrade() {
        const upgradeBtn = document.getElementById('tab-limit-upgrade-btn');
        let originalText = 'Upgrade to Pro - $4.99/month';
        try {
            if (upgradeBtn) {
                originalText = upgradeBtn.innerHTML;
                upgradeBtn.innerHTML = '🔄 Opening Dashboard...';
                upgradeBtn.disabled = true;
            }

            await chrome.tabs.create({
                url: `${CONFIG.WEB.DASHBOARD_URL}#subscription`,
                active: true
            });

            this.showMessage('📊 Opening subscription page...', 'success');

            if (upgradeBtn) {
                upgradeBtn.innerHTML = originalText;
                upgradeBtn.disabled = false;
            }
        } catch (error) {
            this.showMessage('❌ Failed to open dashboard. Please try again.', 'error');
        } finally {
            if (upgradeBtn) {
                upgradeBtn.innerHTML = originalText;
                upgradeBtn.disabled = false;
            }
        }
    }
    showMessage(message, type = 'success') {
        const now = Date.now();
        if (now - this.lastNotificationTime < this.notificationCooldown) {
            return;
        }
        const existingMessages = document.querySelectorAll('.toast-message');
        for (const existing of existingMessages) {
            if (existing.textContent === message) {
                return;
            }
        }
        this.lastNotificationTime = now;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'toast-message';
        let backgroundColor;
        switch(type) {
            case 'success':
                backgroundColor = '#10b981';
                break;
            case 'warning':
                backgroundColor = '#f59e0b';
                break;
            case 'error':
                backgroundColor = '#ef4444';
                break;
            default:
                backgroundColor = '#10b981';
        }
        messageDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${backgroundColor};
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, 3000);
    }
    showError(message) {
        this.showMessage(message, 'error');
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
    isEmptyTabForDisplay(tab) {
        if (!tab || !tab.url) return false;
        const chromeNewTabUrls = [
            'chrome://newtab/',
            'chrome://new-tab-page/',
            'chrome-search://local-ntp/local-ntp.html',
            'chrome://startpageshared/'
        ];
        const otherBrowserNewTabs = [
            'about:newtab',
            'about:blank',
            'about:home'
        ];
        if (chromeNewTabUrls.some(url => tab.url === url || tab.url.startsWith(url))) {
            return true;
        }
        if (otherBrowserNewTabs.some(url => tab.url === url)) {
            return true;
        }
        const searchEngineHomepages = [
            'https://www.google.com',
            'https://www.bing.com',
            'https://www.yahoo.com',
            'https://duckduckgo.com'
        ];
        if (searchEngineHomepages.includes(tab.url)) {
            return true;
        }
        return false;
    }
    sendMessageWithTimeout(action, timeout = 5000, extraData = {}) {
        return new Promise((resolve, reject) => {
            if (!chrome.runtime || !chrome.runtime.sendMessage) {
                reject(new Error('Service Worker not available - chrome.runtime missing'));
                return;
            }
            const timeoutId = setTimeout(() => {
                reject(new Error(`Message timeout: ${action} - Service Worker may not be responding`));
            }, timeout);
            const message = { action, ...extraData };
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    clearTimeout(timeoutId);
                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message;
                        if (errorMsg.includes('Receiving end does not exist')) {
                            reject(new Error(`Service Worker not running - background script unavailable (${action})`));
                        } else if (errorMsg.includes('Extension context invalidated')) {
                            reject(new Error(`Extension context invalidated - please reload extension (${action})`));
                        } else {
                            reject(new Error(`Service Worker error: ${errorMsg} (${action})`));
                        }
                    } else if (!response) {
                        reject(new Error(`No response from Service Worker for ${action}`));
                    } else if (!response.success) {
                        reject(new Error(response.error || `Service Worker returned error for ${action}`));
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to send message to Service Worker: ${error.message} (${action})`));
            }
        });
    }
    sanitizeText(text) {
        if (!text) return 'Untitled';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '';
        try {
            const urlObj = new URL(url);
            return urlObj.href;
        } catch {
            return '';
        }
    }
    truncate(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }
    async setTimer(tabId, minutes) {
        await this.setCustomTimer(tabId, minutes, 'minutes');
    }
    async clearTimer(tabId) {
        try {
            const tab = this.tabs.find(t => t.id === tabId);
            if (tab) {
                tab.timerActive = false;
                tab.autoCloseTime = null;
                tab.timerDuration = null;
                tab.timerStartTime = null;
            }
            try {
                await chrome.runtime.sendMessage({
                    action: 'clearTimer',
                    tabId: tabId
                });
            } catch (error) {
            }
            this.showMessage('Timer removed', 'success');
            await this.render();
        } catch (error) {
            this.showError('Failed to remove timer');
        }
    }
    updateConfirmButton(modal, value, unit) {
        const confirmBtn = modal.querySelector('#timer-confirm-btn');
        const removeBtn = modal.querySelector('#timer-remove-btn');
        if (value === 0) {
            confirmBtn.textContent = 'Remove Timer';
            confirmBtn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
            if (removeBtn) removeBtn.style.display = 'none';
        } else {
            const unitText = unit === 'minutes' ? (value === 1 ? 'minute' : 'minutes') :
                            unit === 'hours' ? (value === 1 ? 'hour' : 'hours') :
                            unit === 'seconds' ? (value === 1 ? 'second' : 'seconds') :
                            (value === 1 ? 'day' : 'days');
            confirmBtn.textContent = `Set ${value} ${unitText}`;
            confirmBtn.style.background = 'linear-gradient(135deg, #4f46e5, #3b82f6)';
            if (removeBtn) removeBtn.style.display = 'flex';
        }
    }
    async setCustomTimer(tabId, value, unit) {
        try {
            const tab = this.tabs.find(t => t.id === tabId);
            if (!tab) {
                this.showError('Tab not found');
                return;
            }
            if (value === 0) {
                await this.clearTimer(tabId);
                return;
            }
            let milliseconds;
            switch (unit) {
                case 'seconds':
                    milliseconds = value * 1000;
                    break;
                case 'minutes':
                    milliseconds = value * 60 * 1000;
                    break;
                case 'hours':
                    milliseconds = value * 60 * 60 * 1000;
                    break;
                case 'days':
                    milliseconds = value * 24 * 60 * 60 * 1000;
                    break;
                default:
                    milliseconds = value * 60 * 1000;
            }
            const MAX_TIMEOUT = 2147483647;
            const MAX_DAYS = 100;
            const JS_TIMEOUT_LIMIT = 2147483647;
            const usePollingMode = milliseconds > JS_TIMEOUT_LIMIT;
            const MAX_ALLOWED_MS = MAX_DAYS * 24 * 60 * 60 * 1000;
            if (milliseconds > MAX_ALLOWED_MS) {
                this.showError(`Timer too long! Maximum limit is ${MAX_DAYS} days. Please use a smaller value.`);
                return;
            }
            const autoCloseTime = Date.now() + milliseconds;
            tab.timerActive = true;
            tab.autoCloseTime = autoCloseTime;
            tab.timerDuration = milliseconds;
            tab.timerStartTime = Date.now();
            try {
                await chrome.runtime.sendMessage({
                    action: 'setTimer',
                    tabId: tabId,
                    minutes: 0,
                    milliseconds: milliseconds,
                    usePolling: usePollingMode
                });
            } catch (error) {
            }
            const unitText = unit === 'minutes' ? (value === 1 ? 'minute' : 'minutes') :
                            unit === 'hours' ? (value === 1 ? 'hour' : 'hours') :
                            unit === 'seconds' ? (value === 1 ? 'second' : 'seconds') :
                            (value === 1 ? 'day' : 'days');
            const successMsg = usePollingMode
                ? `Timer set for ${value} ${unitText} (${this.formatTime(milliseconds)}) - Long timer mode enabled`
                : `Timer set for ${value} ${unitText} (${this.formatTime(milliseconds)})`;
            this.showMessage(successMsg, 'success');
            await this.render();
            this.startTimerCountdown();
        } catch (error) {
            this.showError('Failed to set timer');
        }
    }
    convertTimeUnits(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;
        let milliseconds;
        switch (fromUnit) {
            case 'seconds':
                milliseconds = value * 1000;
                break;
            case 'minutes':
                milliseconds = value * 60 * 1000;
                break;
            case 'hours':
                milliseconds = value * 60 * 60 * 1000;
                break;
            case 'days':
                milliseconds = value * 24 * 60 * 60 * 1000;
                break;
            default:
                return null;
        }
        let result;
        switch (toUnit) {
            case 'seconds':
                result = Math.round(milliseconds / 1000);
                break;
            case 'minutes':
                result = Math.round(milliseconds / (60 * 1000));
                break;
            case 'hours':
                result = Math.round(milliseconds / (60 * 60 * 1000));
                break;
            case 'days':
                result = Math.round(milliseconds / (24 * 60 * 60 * 1000));
                break;
            default:
                return null;
        }
        const limits = {
            seconds: 8640000,
            minutes: 144000,
            hours: 2400,
            days: 100
        };
        if (result > limits[toUnit]) {
            return null;
        }
        return result;
    }
    updateTimerPreview(modal, value, unit) {
        const previewElement = modal.querySelector('#timer-preview');
        if (!previewElement) return;
        if (value === 0) {
            previewElement.textContent = 'Timer will be removed';
            previewElement.style.color = '#dc2626';
        } else {
            let milliseconds;
            switch (unit) {
                case 'seconds': milliseconds = value * 1000; break;
                case 'minutes': milliseconds = value * 60 * 1000; break;
                case 'hours': milliseconds = value * 60 * 60 * 1000; break;
                case 'days': milliseconds = value * 24 * 60 * 60 * 1000; break;
                default: milliseconds = value * 60 * 1000;
            }
            const formatted = this.formatTime(milliseconds);
            const isLongTimer = milliseconds > 2147483647;
            if (isLongTimer) {
                previewElement.textContent = `Duration: ${formatted} (Long timer mode)`;
                previewElement.style.color = '#f59e0b';
            } else {
                previewElement.textContent = `Duration: ${formatted}`;
                previewElement.style.color = '#6b7280';
            }
        }
    }
    formatTime(milliseconds) {
        if (milliseconds <= 0) return '0s';
        const totalSeconds = Math.floor(milliseconds / 1000);
        const days = Math.floor(totalSeconds / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (days > 0) {
            if (hours > 0) {
                return `${days}d ${hours}h`;
            } else {
                return `${days}d`;
            }
        } else if (hours > 0) {
            if (minutes > 0) {
                return `${hours}h ${minutes}m`;
            } else {
                return `${hours}h`;
            }
        } else if (minutes > 0) {
            if (seconds > 0) {
                return `${minutes}m ${seconds}s`;
            } else {
                return `${minutes}m`;
            }
        } else {
            return `${seconds}s`;
        }
    }
    extractDomain(url) {
        if (!url) return 'Unknown';
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname;
            if (domain.startsWith('www.')) {
                domain = domain.substring(4);
            }
            return domain;
        } catch (error) {
            return 'Unknown';
        }
    }
    getSafeFaviconUrl(faviconUrl) {
        return faviconUrl || 'icons/icon-16.png';
    }
    async syncWithBrowserTabs(realTabs) {
        const extensionTabIds = new Set(this.tabs.map(tab => tab.id));
        let newTabsAdded = 0;
        for (const realTab of realTabs) {
            if (!extensionTabIds.has(realTab.id) && this.isValidTab(realTab)) {
                this.tabs.push({
                    id: realTab.id,
                    title: realTab.title,
                    url: realTab.url,
                    favIconUrl: realTab.favIconUrl,
                    active: realTab.active,
                    paused: false,
                    timerActive: false,
                    autoCloseTime: null
                });
                newTabsAdded++;
            }
        }
        if (!this.isPremium && this.tabs.length > this.tabLimit) {
            this.tabs = this.prioritizeTabsForFreeUser(this.tabs).slice(0, this.tabLimit);
        }
        if (!this.isPremium && newTabsAdded > 0) {
        }
    }
    prioritizeTabsForFreeUser(tabs) {
        return tabs.sort((a, b) => {
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;
            if (a.paused && !b.paused) return -1;
            if (!a.paused && b.paused) return 1;
            if (a.timerActive && !b.timerActive) return -1;
            if (!a.timerActive && b.timerActive) return 1;
            if (a.lastActivated && b.lastActivated) {
                return b.lastActivated - a.lastActivated;
            }
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return (a.index || 0) - (b.index || 0);
        });
    }
    showFreeLimitNotice(hiddenCount) {
        const noticeDiv = document.createElement('div');
        noticeDiv.style.cssText = `
            position: fixed;
            top: 40px;
            left: 10px;
            right: 10px;
            background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 12px;
            z-index: 10001;
            font-size: 12px;
            color: #92400e;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        `;
        noticeDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">📊</span>
                <div>
                    <strong>Free Plan Limit</strong><br>
                    Showing 10 of ${this.totalTabCount} tabs. ${hiddenCount} tabs hidden.
                    <button onclick="this.parentElement.parentElement.remove()"
                            style="float: right; background: none; border: none; color: #92400e; font-size: 16px; cursor: pointer; padding: 0; margin-left: 8px;">×</button>
                </div>
            </div>
        `;
        document.body.appendChild(noticeDiv);
        setTimeout(() => {
            if (noticeDiv.parentNode) {
                noticeDiv.remove();
            }
        }, 5000);
    }
    addFreeLimitFooter(container) {
        const footer = document.createElement('div');
        footer.style.cssText = `
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 16px;
            margin: 8px 0;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
        `;
        footer.innerHTML = `
            <div style="margin-bottom: 8px;">
                <span style="font-size: 20px;">🔒</span>
            </div>
            <div style="font-weight: 500; margin-bottom: 4px;">Free Plan Limit Reached</div>
            <div style="margin-bottom: 12px;">Showing maximum ${this.tabLimit} tabs. Close a tab to see others.</div>
            <button onclick="window.popup.showPremiumModal()"
                    style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">
                Upgrade for Unlimited Tabs
            </button>
        `;
        container.appendChild(footer);
    }
    updateScrollWheelHighlight(scrollWheel, selectedIndex) {
        const options = scrollWheel.querySelectorAll('.wheel-option');
        options.forEach((option, index) => {
            if (selectedIndex === -1) {
                option.style.opacity = '0.3';
                option.style.transform = 'scale(0.9)';
            } else {
                const distance = Math.abs(index - selectedIndex);
                const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3;
                const scale = distance === 0 ? 1 : 0.9;
                option.style.opacity = opacity.toString();
                option.style.transform = `scale(${scale})`;
            }
        });
    }
    populatePreBuiltScrollWheel(modal) {
        const scrollWheel = modal.querySelector('#scroll-wheel');
        const options = [
            { label: 'No Timer', value: 0, unit: 'minutes' },
            { label: '30 seconds', value: 30, unit: 'seconds' },
            { label: '1 minute', value: 1, unit: 'minutes' },
            { label: '2 minutes', value: 2, unit: 'minutes' },
            { label: '5 minutes', value: 5, unit: 'minutes' },
            { label: '10 minutes', value: 10, unit: 'minutes' },
            { label: '15 minutes', value: 15, unit: 'minutes' },
            { label: '30 minutes', value: 30, unit: 'minutes' },
            { label: '1 hour', value: 1, unit: 'hours' },
            { label: '2 hours', value: 2, unit: 'hours' },
            { label: '4 hours', value: 4, unit: 'hours' },
            { label: '8 hours', value: 8, unit: 'hours' },
            { label: '1 day', value: 1, unit: 'days' },
            { label: '3 days', value: 3, unit: 'days' },
            { label: '7 days', value: 7, unit: 'days' }
        ];
        const optionsHTML = options.map((option, index) => {
            const isNoTimer = option.value === 0;
            return `
                <div class="wheel-option" data-value="${option.value}" data-unit="${option.unit}" data-label="${option.label}" data-index="${index}" style="
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${isNoTimer ? '15px' : '16px'};
                    font-weight: ${isNoTimer ? '600' : '500'};
                    color: ${isNoTimer ? '#ef4444' : '#374151'};
                    transition: all 0.2s ease;
                    cursor: pointer;
                    user-select: none;
                    position: relative;
                ">
                    ${option.label}
                </div>
            `;
        }).join('');
        scrollWheel.innerHTML = optionsHTML;
        scrollWheel.dataset.selected = '0';
        scrollWheel.style.transform = 'translateY(0px)';
    }
    setupScrollWheel(scrollWheel, onValueChange) {
        let isDragging = false;
        let startY = 0;
        let startTransform = 0;
        let currentTransform = 0;
        const itemHeight = 44;
        const options = scrollWheel.querySelectorAll('.wheel-option');
        const maxIndex = options.length - 1;
        const getTransformY = () => {
            const transform = scrollWheel.style.transform;
            const match = transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
            return match ? parseFloat(match[1]) : 0;
        };
        const setTransform = (y, animate = true) => {
            const boundedY = Math.max(Math.min(y, 0), -(maxIndex * itemHeight));
            currentTransform = boundedY;
            scrollWheel.style.transition = animate ? 'transform 0.2s ease-out' : 'none';
            scrollWheel.style.transform = `translateY(${boundedY}px)`;
            const selectedIndex = Math.round(-boundedY / itemHeight);
            scrollWheel.dataset.selected = selectedIndex.toString();
            options.forEach((option, index) => {
                const distance = Math.abs(index - selectedIndex);
                const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3;
                const scale = distance === 0 ? 1 : 0.9;
                option.style.opacity = opacity.toString();
                option.style.transform = `scale(${scale})`;
            });
            const selectedOption = options[selectedIndex];
            if (selectedOption && onValueChange) {
                const value = parseInt(selectedOption.dataset.value);
                const unit = selectedOption.dataset.unit;
                const label = selectedOption.dataset.label;
                onValueChange({ value, unit, label });
            }
        };
        const startDrag = (clientY) => {
            isDragging = true;
            startY = clientY;
            startTransform = getTransformY();
            scrollWheel.style.cursor = 'grabbing';
        };
        const updateDrag = (clientY) => {
            if (!isDragging) return;
            const deltaY = clientY - startY;
            setTransform(startTransform + deltaY, false);
        };
        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            scrollWheel.style.cursor = 'grab';
            const currentY = getTransformY();
            const nearestIndex = Math.round(-currentY / itemHeight);
            const snapY = -(nearestIndex * itemHeight);
            setTransform(snapY, true);
        };
        scrollWheel.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startDrag(e.clientY);
        });
        document.addEventListener('mousemove', (e) => {
            updateDrag(e.clientY);
        });
        document.addEventListener('mouseup', endDrag);
        scrollWheel.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrag(e.touches[0].clientY);
        }, { passive: false });
        document.addEventListener('touchmove', (e) => {
            if (isDragging) e.preventDefault();
            updateDrag(e.touches[0].clientY);
        }, { passive: false });
        document.addEventListener('touchend', endDrag);
        options.forEach((option, index) => {
            option.addEventListener('click', () => {
                const targetY = -(index * itemHeight);
                setTransform(targetY, true);
            });
        });
        scrollWheel.addEventListener('wheel', (e) => {
            e.preventDefault();
            const currentY = getTransformY();
            const direction = e.deltaY > 0 ? 1 : -1;
            const newIndex = Math.round(-currentY / itemHeight) + direction;
            const clampedIndex = Math.max(0, Math.min(maxIndex, newIndex));
            const targetY = -(clampedIndex * itemHeight);
            setTransform(targetY, true);
        });
        setTransform(0, false);
    }
    setScrollWheelValue(scrollWheel, value) {
        const options = scrollWheel.querySelectorAll('.wheel-option');
        let targetIndex = 0;
        options.forEach((option, index) => {
            if (parseInt(option.dataset.value) === value) {
                targetIndex = index;
            }
        });
        const targetY = -(targetIndex * 40);
        scrollWheel.style.transform = `translateY(${targetY}px)`;
        scrollWheel.dataset.selected = targetIndex.toString();
    }
    updateConfirmButton(modal, value, unit) {
        const confirmBtn = modal.querySelector('#timer-confirm-btn');
        if (value === 0) {
            confirmBtn.innerHTML = `
                <span style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                    Remove Timer
                </span>
            `;
            confirmBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else {
            let unitText = '';
            switch (unit) {
                case 'seconds':
                    unitText = value === 1 ? 'second' : 'seconds';
                    break;
                case 'minutes':
                    unitText = value === 1 ? 'minute' : 'minutes';
                    break;
                case 'hours':
                    unitText = value === 1 ? 'hour' : 'hours';
                    break;
                case 'days':
                    unitText = value === 1 ? 'day' : 'days';
                    break;
                default:
                    unitText = unit;
            }
            confirmBtn.innerHTML = `
                <span style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    Set ${value} ${unitText}
                </span>
            `;
            confirmBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        }
    }
    startRealTimeUpdates() {
        this.performRealTimeUpdate();
        this.updateInterval = setInterval(() => {
            this.performRealTimeUpdate();
        }, 1000);
        try {
            chrome.tabs.onCreated.addListener(() => this.handleTabEvent('created'));
            chrome.tabs.onRemoved.addListener(() => this.handleTabEvent('removed'));
            chrome.tabs.onUpdated.addListener(() => this.handleTabEvent('updated'));
            chrome.tabs.onActivated.addListener(() => this.handleTabEvent('activated'));
        } catch (error) {
        }
    }
    async performRealTimeUpdate() {
        try {
            const previousTabCount = this.realTimeTabCount;
            const previousHiddenCount = this.hiddenTabCount;
            await this.updateTabCount();
            this.renderStats();
            if (previousTabCount !== this.realTimeTabCount) {
                if (this.shouldRefreshTabList(previousTabCount)) {
                    await this.refreshTabList();
                }
            }
            if (!this.isPremium) {
                if (previousHiddenCount !== this.hiddenTabCount || previousTabCount !== this.realTimeTabCount) {
                    this.updateHiddenTabDisplay();
                    this.renderTabLimitWarning();
                }
            }
        } catch (error) {
        }
    }
    handleTabEvent(eventType) {
        clearTimeout(this.tabEventDebounce);
        this.tabEventDebounce = setTimeout(() => {
            this.performRealTimeUpdate();
        }, 200);
    }
    shouldRefreshTabList(previousCount) {
        return Math.abs(this.realTimeTabCount - previousCount) >= 1 ||
               (!this.isPremium && this.tabs.length < this.tabLimit);
    }
    async refreshTabList() {
        try {
            if (this.isRendering) return;
            await this.loadData();
            await this.renderTabs();
        } catch (error) {
        }
    }
    updateHiddenTabDisplay() {
        const warningContainer = document.getElementById('tab-limit-warning');
        if (warningContainer && !this.isPremium && this.hiddenTabCount > 0) {
            this.renderTabLimitWarning();
        }
    }
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    async closeExtraTabs() {
        if (this.isPremium) {
            return;
        }
        try {
            const allTabs = await chrome.tabs.query({});
            const validTabs = allTabs.filter(tab => this.isValidTab(tab));
            if (validTabs.length <= this.tabLimit) {
                this.showMessage('You are already within the 10-tab limit!', 'success');
                return;
            }
            const excessCount = validTabs.length - this.tabLimit;
            this.showClosingProgress(excessCount);
            const prioritizedTabs = this.prioritizeTabsForFreeUser(validTabs);
            const tabsToKeep = prioritizedTabs.slice(0, this.tabLimit);
            const tabsToClose = prioritizedTabs.slice(this.tabLimit);
            const batchSize = 3;
            let closedCount = 0;
            for (let i = 0; i < tabsToClose.length; i += batchSize) {
                const batch = tabsToClose.slice(i, i + batchSize);
                const closePromises = batch.map(async (tab) => {
                    try {
                        if (tab.paused) {
                            return false;
                        }
                        await chrome.tabs.remove(tab.id);
                        closedCount++;
                        return true;
                    } catch (error) {
                        return false;
                    }
                });
                await Promise.all(closePromises);
                this.updateClosingProgress(closedCount, excessCount);
                if (i + batchSize < tabsToClose.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            this.hideClosingProgress();
            if (closedCount > 0) {
                this.showMessage(`Successfully closed ${closedCount} extra tabs!`, 'success');
                setTimeout(() => {
                    this.performRealTimeUpdate();
                    this.renderTabLimitWarning();
                }, 500);
            } else {
                this.showMessage('No tabs could be closed (protected tabs?)', 'warning');
            }
        } catch (error) {
            this.showError('Failed to close extra tabs');
            this.hideClosingProgress();
        }
    }
    showClosingProgress(totalToClose) {
        const progressDiv = document.createElement('div');
        progressDiv.id = 'closing-progress';
        progressDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 20px;
            z-index: 10003;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            text-align: center;
            min-width: 250px;
        `;
        progressDiv.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 8px;">🗂️</div>
            <div style="font-weight: 500; margin-bottom: 12px; color: #1f2937;">Closing Extra Tabs</div>
            <div id="progress-text" style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
                Preparing to close ${totalToClose} excess tabs...
            </div>
            <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
                <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(135deg, #3b82f6, #2563eb); transition: width 0.3s ease;"></div>
            </div>
        `;
        document.body.appendChild(progressDiv);
    }
    updateClosingProgress(closed, total) {
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');
        if (progressText) {
            progressText.textContent = `Closed ${closed} of ${total} extra tabs...`;
        }
        if (progressBar) {
            const percentage = Math.round((closed / total) * 100);
            progressBar.style.width = `${percentage}%`;
        }
    }
    hideClosingProgress() {
        const progressDiv = document.getElementById('closing-progress');
        if (progressDiv) {
            progressDiv.style.opacity = '0';
            progressDiv.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (progressDiv.parentNode) {
                    progressDiv.remove();
                }
            }, 300);
        }
    }
    async loadAnalyticsData() {
        try {
            const analyticsData = await chrome.storage.local.get([
                'tabAnalytics',
                'siteVisitCounts',
                'totalTabsOpened',
                'tabsClosedAuto',
                'domainUsageTime'
            ]);
            const analytics = analyticsData.tabAnalytics || {};
            const siteVisits = analyticsData.siteVisitCounts || {};
            const totalOpened = analyticsData.totalTabsOpened || 0;
            const autosClosed = analyticsData.tabsClosedAuto || 0;
            const domainTime = analyticsData.domainUsageTime || {};
            await this.clearFakeData();
            await this.collectCurrentTabData();
            const cleanData = await chrome.storage.local.get([
                'tabAnalytics',
                'siteVisitCounts',
                'totalTabsOpened',
                'tabsClosedAuto',
                'domainUsageTime'
            ]);
            const cleanAnalytics = cleanData.tabAnalytics || {};
            const cleanSiteVisits = cleanData.siteVisitCounts || {};
            const cleanTotalOpened = cleanData.totalTabsOpened || 0;
            const cleanAutosClosed = cleanData.tabsClosedAuto || 0;
            const cleanDomainTime = cleanData.domainUsageTime || {};
            this.updateMostVisitedList(cleanAnalytics, cleanSiteVisits, cleanDomainTime);
        } catch (error) {
        }
    }
    updateMostVisitedList(analytics, siteVisits, domainTime) {
        const listContainer = document.getElementById('most-visited-list');
        if (!listContainer) {
            return;
        }
        const combinedData = {};
        Object.entries(siteVisits).forEach(([domain, visits]) => {
            combinedData[domain] = { visits, time: domainTime[domain] || 0, tabs: 0, avgTime: 0 };
        });
        Object.entries(analytics).forEach(([domain, data]) => {
            if (!combinedData[domain]) {
                combinedData[domain] = { visits: siteVisits[domain] || 0, time: data.totalTime || 0, tabs: data.totalTabs || 0, avgTime: data.avgTimePerTab || 0 };
            } else {
                combinedData[domain].tabs = data.totalTabs || 0;
                combinedData[domain].avgTime = data.avgTimePerTab || 0;
                combinedData[domain].time = data.totalTime || combinedData[domain].time;
            }
        });
        if (Object.keys(combinedData).length === 0) {
            this.showCurrentTabsInAnalytics(listContainer);
            return;
        }
        let totalTime = 0;
        Object.values(combinedData).forEach(data => {
            totalTime += data.time;
        });
        const sortedSites = Object.entries(combinedData)
            .sort((a, b) => b[1].time - a[1].time)
            .slice(0, 10);
        listContainer.innerHTML = `
            <div class="screen-time-summary">
                <div class="total-screen-time">
                    <div class="total-time-label">Total Screen Time</div>
                    <div class="total-time-value">${this.formatTime(totalTime)}</div>
                </div>
            </div>
            <div class="sites-list">
                ${sortedSites.map(([domain, data]) => {
                    const percentage = totalTime > 0 ? (data.time / totalTime * 100).toFixed(1) : 0;
                    return `
                        <div class="site-item">
                            <div class="site-header">
                                <div class="site-info">
                                    <div class="site-favicon">${this.getDomainIcon(domain)}</div>
                                    <div class="site-details">
                                        <div class="site-name">${this.formatDomain(domain)}</div>
                                        <div class="site-stats">${data.visits} visits</div>
                                    </div>
                                </div>
                                <div class="site-time-info">
                                    <div class="site-time">${this.formatTime(data.time)}</div>
                                    <div class="site-percentage">${percentage}%</div>
                                </div>
                            </div>
                            <div class="site-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    formatTime(milliseconds) {
        if (!milliseconds || milliseconds === 0) return '0s';
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    getDomainIcon(domain, useFavicon = true) {
        if (useFavicon) {
            return `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}" alt="" class="tab-favicon">
                    <span class="fallback-icon" style="display:none;">${this.getFallbackIcon(domain)}</span>`;
        }
        return this.getFallbackIcon(domain);
    }
    getFallbackIcon(domain) {
        const icons = {
            'google.com': '🔍',
            'youtube.com': '📺',
            'github.com': '💻',
            'stackoverflow.com': '💡',
            'twitter.com': '🐦',
            'facebook.com': '📘',
            'linkedin.com': '💼',
            'reddit.com': '🤖',
            'instagram.com': '📷',
            'amazon.com': '🛒',
            'netflix.com': '🎬',
            'spotify.com': '🎵'
        };
        return icons[domain] || '🌐';
    }
    formatDomain(domain) {
        return domain.replace('www.', '').split('.')[0];
    }
    updateAnalyticsInsights(analytics, siteVisits, totalOpened, domainTime) {
        const insightsContainer = document.getElementById('analytics-insights');
        if (!insightsContainer) {
            return;
        }
        const insights = [];
        const totalTime = Object.values(domainTime).reduce((sum, time) => sum + time, 0);
        if (totalOpened > 50) {
            insights.push({
                icon: '📈',
                text: `You've opened ${totalOpened} tabs! You're an active browser user.`
            });
        }
        if (totalTime > 0) {
            insights.push({
                icon: '⏱️',
                text: `Total browsing time tracked: ${this.formatTime(totalTime)}`
            });
        }
        const topSitesByTime = Object.entries(domainTime).sort((a, b) => b[1] - a[1]);
        if (topSitesByTime.length > 0 && topSitesByTime[0][1] > 0) {
            const [topDomain, timeSpent] = topSitesByTime[0];
            const percentage = Math.round((timeSpent / totalTime) * 100);
            insights.push({
                icon: '🎯',
                text: `${percentage}% of your time is spent on ${this.formatDomain(topDomain)} (${this.formatTime(timeSpent)})`
            });
        }
        const topByTabs = Object.entries(analytics)
            .sort((a, b) => (b[1].totalTabs || 0) - (a[1].totalTabs || 0));
        if (topByTabs.length > 0 && topByTabs[0][1].totalTabs > 5) {
            const [domain, data] = topByTabs[0];
            insights.push({
                icon: '📊',
                text: `You opened ${data.totalTabs} tabs on ${this.formatDomain(domain)} with ${this.formatTime(data.avgTimePerTab)} average time per tab`
            });
        }
        if (insights.length === 0) {
            this.addCurrentTabInsights(insights);
        }
        insightsContainer.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <span class="insight-icon">${insight.icon}</span>
                <span class="insight-text">${insight.text}</span>
            </div>
        `).join('');
    }
    async addCurrentTabInsights(insights) {
        try {
            const currentTabs = await chrome.tabs.query({});
            const validTabs = currentTabs.filter(tab =>
                tab.url &&
                !tab.url.startsWith('chrome://') &&
                !tab.url.startsWith('moz-extension://') &&
                !tab.url.startsWith('chrome-extension://')
            );
            if (validTabs.length > 0) {
                insights.push({
                    icon: '📊',
                    text: `You currently have ${validTabs.length} ${validTabs.length === 1 ? 'tab' : 'tabs'} open for browsing`
                });
                const domains = new Set();
                validTabs.forEach(tab => {
                    try {
                        domains.add(new URL(tab.url).hostname);
                    } catch (e) {}
                });
                if (domains.size > 1) {
                    insights.push({
                        icon: '🌐',
                        text: `You're browsing ${domains.size} different websites right now`
                    });
                }
                const activeTab = validTabs.find(tab => tab.active);
                if (activeTab) {
                    try {
                        const domain = new URL(activeTab.url).hostname;
                        insights.push({
                            icon: '👁️',
                            text: `Currently viewing: ${this.formatDomain(domain)}`
                        });
                    } catch (e) {}
                }
            } else {
                insights.push({
                    icon: '⏰',
                    text: 'Open some tabs and browse to start tracking your usage patterns and analytics!'
                });
            }
        } catch (error) {
            insights.push({
                icon: '📈',
                text: 'Start browsing to see your tab usage analytics and insights!'
            });
        }
    }
    async clearFakeData() {
        try {
            await chrome.storage.local.remove([
                'tabAnalytics',
                'siteVisitCounts',
                'totalTabsOpened',
                'tabsClosedAuto',
                'domainUsageTime'
            ]);
        } catch (error) {
        }
    }
    async collectCurrentTabData() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getTabData' });
            if (response && response.success && response.data) {
                const currentTabs = response.data;
                const existing = await chrome.storage.local.get([
                    'siteVisitCounts',
                    'totalTabsOpened',
                    'tabAnalytics',
                    'domainUsageTime'
                ]);
                const siteVisits = existing.siteVisitCounts || {};
                let totalOpened = existing.totalTabsOpened || 0;
                const analytics = existing.tabAnalytics || {};
                const domainTime = existing.domainUsageTime || {};
            }
        } catch (error) {
        }
    }
    async showCurrentTabsInAnalytics(listContainer) {
        try {
            const currentTabs = await chrome.tabs.query({});
            const response = await chrome.runtime.sendMessage({ action: 'getTabDurations' });
            const tabDurations = response?.durations || {};
            const validTabs = [];
            let totalCurrentTime = 0;
            const uniqueDomains = new Set();
            for (const tab of currentTabs) {
                if (tab.url && !tab.url.startsWith('chrome://')) {
                    try {
                        const domain = new URL(tab.url).hostname;
                        if (!domain) continue;
                        const duration = tabDurations[tab.id] || 0;
                        totalCurrentTime += duration;
                        uniqueDomains.add(domain);
                        validTabs.push({
                            id: tab.id,
                            title: tab.title || 'Untitled',
                            domain: domain,
                            url: tab.url,
                            active: tab.active,
                            duration: duration
                        });
                    } catch (e) {
                    }
                }
            }
            if (validTabs.length === 0) {
                listContainer.innerHTML = `
                    <div class="current-session-summary">
                        <div class="session-time">
                            <div class="session-label">Current Session</div>
                            <div class="session-value">Start browsing to track time</div>
                        </div>
                    </div>
                    <div class="analytics-item">
                        <div class="analytics-item-icon">📊</div>
                        <div class="analytics-item-text">
                            <div class="analytics-item-title">Analytics tracking started</div>
                            <div class="analytics-item-subtitle">Open some tabs and browse to see real-time data</div>
                        </div>
                    </div>
                `;
                return;
            }
            const sortedTabs = validTabs.sort((a, b) => b.duration - a.duration);
            listContainer.innerHTML = `
                <div class="current-session-summary">
                    <div class="session-time">
                        <div class="session-label">Current Session</div>
                        <div class="session-value">${this.formatTime(totalCurrentTime)}</div>
                    </div>
                    <div class="session-stats">
                        <div class="stat">
                            <span class="stat-number">${validTabs.length}</span>
                            <span class="stat-label">Active Tabs</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${uniqueDomains.size}</span>
                            <span class="stat-label">Sites</span>
                        </div>
                    </div>
                </div>
                <div class="current-tabs-list">
                    ${sortedTabs.map(tab => {
                        const percentage = totalCurrentTime > 0 ? (tab.duration / totalCurrentTime * 100).toFixed(1) : 0;
                        return `
                            <div class="current-tab-item ${tab.active ? 'active-tab' : ''}">
                                <div class="tab-header">
                                    <div class="tab-info">
                                        <div class="tab-favicon">${this.getDomainIcon(tab.domain)}</div>
                                        <div class="tab-details">
                                            <div class="tab-title">${tab.title.length > 40 ? tab.title.substring(0, 40) + '...' : tab.title}</div>
                                            <div class="tab-domain">${this.formatDomain(tab.domain)} ${tab.active ? '• Active now' : ''}</div>
                                        </div>
                                    </div>
                                    <div class="tab-time-info">
                                        <div class="tab-time">${this.formatTime(tab.duration)}</div>
                                        <div class="tab-percentage">${percentage}%</div>
                                    </div>
                                </div>
                                <div class="tab-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${percentage}%"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } catch (error) {
            listContainer.innerHTML = `
                <div class="analytics-item">
                    <div class="analytics-item-icon">❌</div>
                    <div class="analytics-item-text">
                        <div class="analytics-item-title">Error loading data</div>
                        <div class="analytics-item-subtitle">Please try again</div>
                    </div>
                </div>
            `;
        }
    }
    async trackTabOpen(url) {
        try {
            const domain = new URL(url).hostname;
            const data = await chrome.storage.local.get(['siteVisitCounts', 'totalTabsOpened']);
            const siteVisits = data.siteVisitCounts || {};
            const totalOpened = (data.totalTabsOpened || 0) + 1;
            siteVisits[domain] = (siteVisits[domain] || 0) + 1;
            await chrome.storage.local.set({
                siteVisitCounts: siteVisits,
                totalTabsOpened: totalOpened
            });
        } catch (error) {
        }
    }
    async trackTabAutoClose() {
        try {
            const data = await chrome.storage.local.get(['tabsClosedAuto']);
            const autosClosed = (data.tabsClosedAuto || 0) + 1;
            await chrome.storage.local.set({
                tabsClosedAuto: autosClosed
            });
        } catch (error) {
        }
    }
}
let popup;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await applyStoredTheme();

        popup = new TabmangmentPopup();
        window.popup = popup;

        if (typeof popup.startDashboardSync === 'function') {
            popup.startDashboardSync();
        }

    });
} else {
    applyStoredTheme();

    popup = new TabmangmentPopup();
    window.popup = popup;

    if (typeof popup.startDashboardSync === 'function') {
        popup.startDashboardSync();
    }

}
window.addEventListener('beforeunload', () => {
    if (popup) {
        popup.stopRealTimeUpdates();
    }
});

TabmangmentPopup.prototype.startDashboardSync = function() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'SUBSCRIPTION_UPDATE') {
                this.handleDashboardSync(message);
                sendResponse({ status: 'received' });
            } else if (message.type === 'USER_LOGGED_IN') {
                this.handleUserLogin(message);
                sendResponse({ status: 'received' });
            }
            return true;
        });
    }

    setInterval(() => {
        this.checkDashboardSyncData();
    }, 10000);

    setInterval(() => {
        this.sendStatsToLocalStorage();
    }, 30000);
};

TabmangmentPopup.prototype.handleDashboardSync = async function(message) {
    try {
        if (message.user && message.user.email) {
            const userData = message.user;

            const newPlanStatus = userData.isPro || false;

            await chrome.storage.local.set({
                isPremium: newPlanStatus,
                subscriptionActive: newPlanStatus,
                planType: userData.plan || 'free',
                subscriptionStatus: userData.subscriptionStatus || 'free',
                userEmail: userData.email,
                dashboardSyncTime: Date.now()
            });

            this.isPremium = newPlanStatus;

            await this.render();
            if (this.isPremium) {
                this.updateUIForProUser();
            } else {
                this.updateUIForFreeUser();
            }
            await this.renderSubscriptionPlan();

        }
    } catch (error) {
    }
};

TabmangmentPopup.prototype.handleUserLogin = async function(message) {
    try {

        const userData = message.userData;
        const token = message.token;

        await chrome.storage.local.set({
            userEmail: userData.email,
            userName: userData.name || userData.email.split('@')[0],
            authToken: token,
            isPremium: userData.isPro || false,
            planType: userData.plan || 'free',
            subscriptionActive: userData.isPro || false,
            userId: userData.id || userData.email
        });


        this.userEmail = userData.email;
        this.userName = userData.name || userData.email.split('@')[0];
        this.isPremium = userData.isPro || false;

        this.hideLoginScreen();

        await this.loadData();
        await this.render();

    } catch (error) {
    }
};

TabmangmentPopup.prototype.checkDashboardSyncData = function() {
    try {
        const syncData = localStorage.getItem('dashboardSyncData');
        if (syncData) {
            const data = JSON.parse(syncData);
            const now = Date.now();

            if (data.timestamp && (now - data.timestamp) < 60000) {
                this.handleDashboardSync(data);
                localStorage.removeItem('dashboardSyncData');
            }
        }
    } catch (error) {
    }
};

TabmangmentPopup.prototype.sendStatsToLocalStorage = async function() {
    try {
        const tabs = await chrome.tabs.query({});
        const managedTabs = this.tabs ? this.tabs.length : 0;
        const activeTimers = Object.keys(this.tabTimers || {}).length;

        const memorySavedMB = Math.max(0, (tabs.length - managedTabs) * 50);

        const focusScore = tabs.length > 0 ? Math.round((managedTabs / tabs.length) * 100) : 100;

        const stats = {
            totalTabs: managedTabs,
            autoClosed: this.stats ? this.stats.scheduled : 0,
            memorySaved: memorySavedMB,
            focusScore: focusScore,
            lastUpdated: Date.now()
        };

        localStorage.setItem('extensionStats', JSON.stringify(stats));

    } catch (error) {
    }
};


/**
 * Apply stored theme from localStorage to popup
 */
async function applyStoredTheme() {
    try {
        const stored = await chrome.storage.local.get(['themeConfig', 'activeTheme']);

        if (!stored.themeConfig) {
            return;
        }

        applyThemeToPopup(stored.themeConfig);

    } catch (error) {
    }
}

/**
 * Apply theme configuration to popup elements
 */
function getColorLuminance(hexColor) {
    let hex = hexColor.replace('#', '');

    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    let r = parseInt(hex.substr(0, 2), 16) / 255;
    let g = parseInt(hex.substr(2, 2), 16) / 255;
    let b = parseInt(hex.substr(4, 2), 16) / 255;

    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance;
}

function getContrastingTextColor(backgroundColor) {
    const luminance = getColorLuminance(backgroundColor);

    return luminance > 0.5 ? '#1e293b' : '#ffffff';
}

function getSecondaryTextColor(backgroundColor) {
    const luminance = getColorLuminance(backgroundColor);

    return luminance > 0.5 ? '#64748b' : '#94a3b8';
}

function getContrastRatio(color1, color2) {
    const lum1 = getColorLuminance(color1);
    const lum2 = getColorLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
}

function hasGoodContrast(textColor, backgroundColor, minRatio = 4.5) {
    try {
        const ratio = getContrastRatio(textColor, backgroundColor);
        return ratio >= minRatio;
    } catch (error) {
        return false;
    }
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');

    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return null;
    }

    return { r, g, b };
}

async function loadAndApplyTheme() {
    try {
        const { activeTheme, themeConfig } = await chrome.storage.local.get(['activeTheme', 'themeConfig']);

        if (themeConfig) {
            applyThemeToPopup(themeConfig);
        }
    } catch (error) {
    }
}

/**
 * Apply theme to popup with INTELLIGENT AUTO-CONTRAST
 *
 * CRITICAL: All text must be readable against its actual background.
 * This function calculates text colors based on each element's specific background,
 * not just the global theme color.
 *
 * Auto-contrast calculations:
 * - Tab items: Text color based on theme.backgroundColor (can be dark/light)
 * - Stat cards: Text color based on white background (#ffffff)
 * - General UI: Text color based on body gradient (theme.primaryColor)
 *
 * This ensures text is always visible regardless of theme configuration.
 */
function applyThemeToPopup(theme) {
    try {
        const bgColor = theme.primaryColor || '#667eea';
        const accentColor = theme.accentColor || '#8b5cf6';

        let tabItemBg = theme.backgroundColor;

        if (!tabItemBg || tabItemBg === 'rgba(255, 255, 255, 0.95)' || tabItemBg === '#ffffff') {
            const accentRgb = hexToRgb(accentColor);
            tabItemBg = accentRgb
                ? `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.08)`
                : 'rgba(139, 92, 246, 0.08)';
        }

        let tabItemBgHex;
        if (tabItemBg.startsWith('rgba') || tabItemBg.startsWith('rgb')) {
            tabItemBgHex = bgColor;
        } else if (tabItemBg.startsWith('#')) {
            tabItemBgHex = tabItemBg;
        } else {
            tabItemBgHex = bgColor;
        }

        const autoTabItemTextColor = getContrastingTextColor(tabItemBgHex);
        const autoTabItemSecondaryTextColor = getSecondaryTextColor(tabItemBgHex);

        let tabItemTextColor;
        let tabItemSecondaryTextColor;

        if (theme.textColor && hasGoodContrast(theme.textColor, tabItemBgHex)) {
            tabItemTextColor = theme.textColor;
            tabItemSecondaryTextColor = `${theme.textColor}cc`;
        } else {
            tabItemTextColor = autoTabItemTextColor;
            tabItemSecondaryTextColor = autoTabItemSecondaryTextColor;

            if (theme.textColor) {
                console.warn(`Theme text color ${theme.textColor} has insufficient contrast with tab background ${tabItemBgHex}. Using auto-calculated color ${tabItemTextColor} instead.`);
            }
        }

        const statCardTextColor = getContrastingTextColor('#ffffff');
        const statCardSecondaryTextColor = getSecondaryTextColor('#ffffff');

        const primaryTextColor = theme.textColor || getContrastingTextColor(bgColor);
        const secondaryTextColor = theme.textColor ? `${theme.textColor}cc` : getSecondaryTextColor(bgColor);

        const themeStyle = document.createElement('style');
        themeStyle.id = 'custom-theme-styles';

        const existingStyle = document.getElementById('custom-theme-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        let css = '';

        if (theme.bgType === 'gradient' || !theme.bgType) {
            css += `
                .popup-main-content {
                    background: linear-gradient(${theme.gradientDirection || '135deg'}, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%) !important;
                }
                #app-loader {
                    background: linear-gradient(${theme.gradientDirection || '135deg'}, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%) !important;
                }
            `;
        } else if (theme.bgType === 'solid') {
            css += `
                .popup-main-content {
                    background: ${theme.primaryColor} !important;
                }
                #app-loader {
                    background: ${theme.primaryColor} !important;
                }
            `;
        } else if (theme.bgType === 'pattern') {
            css += `
                .popup-main-content {
                    background: linear-gradient(${theme.gradientDirection || '135deg'}, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%) !important;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px) !important;
                    background-size: 20px 20px !important;
                }
                #app-loader {
                    background: linear-gradient(${theme.gradientDirection || '135deg'}, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%) !important;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px) !important;
                    background-size: 20px 20px !important;
                }
            `;
        }

        if (theme.fontFamily) {
            css += `
                body,
                body * {
                    font-family: ${theme.fontFamily} !important;
                }
                .tab-title,
                .tab-url,
                .stat-value,
                .stat-label,
                .header-btn,
                .control-btn,
                .empty-state p,
                .empty-state h3,
                button,
                input,
                select,
                textarea,
                .loader-text {
                    font-family: ${theme.fontFamily} !important;
                }
            `;
        }

        if (theme.fontSize) {
            css += `
                body {
                    font-size: ${theme.fontSize} !important;
                }
                .tab-title {
                    font-size: ${theme.fontSize} !important;
                }
                .tab-url {
                    font-size: calc(${theme.fontSize} - 1px) !important;
                }
                .stat-label {
                    font-size: calc(${theme.fontSize} - 2px) !important;
                }
            `;
        }

        css += `
            .header-btn.premium-btn {
                background: linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%) !important;
            }
            .header-btn.premium-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px ${theme.primaryColor}40 !important;
            }
            .control-btn {
                background: linear-gradient(135deg, ${theme.primaryColor}15 0%, ${theme.secondaryColor}15 100%) !important;
                border-color: ${theme.primaryColor}40 !important;
            }
            .control-btn:hover {
                background: linear-gradient(135deg, ${theme.primaryColor}25 0%, ${theme.secondaryColor}25 100%) !important;
            }

            /* Ensure stat cards stay visible */
            .stat-card {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px);
            }

            /* Tab Items - Full Theme Integration - Adaptive Backgrounds */
            .tab-item {
                background: ${theme.backgroundColor || 'rgba(255, 255, 255, 0.95)'} !important;
                border: 1px solid ${theme.primaryColor}30 !important;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .tab-item:hover {
                background: ${theme.backgroundColor || 'rgba(255, 255, 255, 0.98)'} !important;
                border-color: ${theme.primaryColor}80 !important;
                box-shadow: 0 4px 12px ${theme.primaryColor}40 !important;
                transform: translateY(-2px) !important;
            }

            .tab-item.active {
                background: ${theme.backgroundColor || 'rgba(255, 255, 255, 1)'} !important;
                border-color: ${theme.primaryColor} !important;
                box-shadow: 0 0 0 2px ${theme.primaryColor}60, 0 4px 16px ${theme.primaryColor}40 !important;
            }

            /* Tab Title and URL Colors - VALIDATED CONTRAST-SAFE COLORS */
            .tab-title {
                color: ${tabItemTextColor} !important;
                font-weight: 500;
            }

            .tab-url {
                color: ${tabItemSecondaryTextColor} !important;
                opacity: 0.7 !important;
            }

            /* Tab Timer Display - Match validated tab text color */
            .tab-timer,
            .timer-countdown {
                color: ${tabItemTextColor} !important;
                background: ${theme.primaryColor}15 !important;
            }

            /* Stats and Labels - AUTO CONTRAST BASED ON STAT CARD BACKGROUND */
            .stat-value {
                color: ${statCardTextColor} !important;
            }

            .stat-label {
                color: ${statCardSecondaryTextColor} !important;
            }

            /* Empty State Text - Force dark colors for white background */
            .empty-state p,
            .empty-state h3,
            .empty-title,
            .empty-description {
                color: #475569 !important;
            }

            .empty-icon-svg {
                color: #cbd5e1 !important;
                opacity: 0.8;
            }

            /* Bookmark Text - Force dark colors for light background */
            .bookmark-title {
                color: #1e293b !important;
            }

            .bookmark-url {
                color: #64748b !important;
            }

            /* Header and Buttons Text - AUTO CONTRAST */
            .header-title,
            .control-btn {
                color: ${primaryTextColor} !important;
            }

            /* Tab Action Buttons - Inside tab items, must contrast with tab background */
            .tab-item .action-btn {
                background: ${theme.primaryColor}15 !important;
                border: 1px solid ${theme.primaryColor}30 !important;
                color: ${tabItemTextColor} !important;
                transition: all 0.2s ease !important;
            }

            .tab-item .action-btn:hover:not(.disabled) {
                background: ${theme.primaryColor}25 !important;
                border-color: ${theme.primaryColor}60 !important;
                color: ${tabItemTextColor} !important;
                transform: scale(1.1) !important;
            }

            /* General action buttons (outside tabs) */
            .action-btn {
                background: rgba(255, 255, 255, 0.12) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                color: rgba(255, 255, 255, 0.95) !important;
                transition: all 0.2s ease !important;
            }

            .action-btn:hover:not(.disabled) {
                background: rgba(255, 255, 255, 0.2) !important;
                border-color: rgba(255, 255, 255, 0.3) !important;
                transform: scale(1.1) !important;
            }

            .action-btn.danger {
                background: rgba(239, 68, 68, 0.1) !important;
                border-color: rgba(239, 68, 68, 0.3) !important;
                color: #ef4444 !important;
            }

            .action-btn.danger:hover {
                background: rgba(239, 68, 68, 0.2) !important;
                border-color: rgba(239, 68, 68, 0.6) !important;
                transform: scale(1.1) !important;
            }

            .action-btn.disabled {
                background: rgba(148, 163, 184, 0.1) !important;
                border-color: rgba(148, 163, 184, 0.2) !important;
                color: #94a3b8 !important;
                opacity: 0.6 !important;
            }

            /* PRO Badge in buttons - ensure visibility */
            .pro-badge-mini {
                background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
                color: white !important;
                font-weight: 600 !important;
                z-index: 10 !important;
            }

            /* Tabs Container - Professional Background */
            .tabs-container {
                background: linear-gradient(135deg, ${theme.primaryColor}12 0%, ${theme.secondaryColor}12 100%) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                border-radius: 12px !important;
                border: 1px solid ${theme.primaryColor}20 !important;
                transition: all 0.3s ease !important;
            }

            /* Stats Actions Row */
            .stats-actions-row {
                background: linear-gradient(135deg, ${theme.primaryColor}18 0%, ${theme.secondaryColor}18 100%) !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid ${theme.primaryColor}25 !important;
                transition: all 0.3s ease !important;
            }

            /* Header */
            .header {
                background: linear-gradient(135deg, ${theme.primaryColor}20 0%, ${theme.secondaryColor}20 100%) !important;
                backdrop-filter: blur(15px) !important;
                border-bottom: 1px solid ${theme.primaryColor}30 !important;
                transition: all 0.3s ease !important;
            }

            .subscription-info {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px) !important;
                border-radius: 8px !important;
                padding: 6px 12px !important;
                transition: all 0.3s ease !important;
            }

            .plan-name {
                color: #000000 !important;
                text-shadow: none !important;
                font-weight: 700 !important;
                font-size: 11px !important;
            }

            .billing-date {
                color: #666666 !important;
                text-shadow: none !important;
                font-weight: 400 !important;
                font-size: 9px !important;
                opacity: 0.85 !important;
                margin-top: 2px !important;
            }

            .subscription-info.pro .plan-name {
                background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}) !important;
                -webkit-background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                background-clip: text !important;
            }

            /*
             * Search Panel - FIXED PROFESSIONAL DESIGN
             * NOT affected by themes for maximum visibility and consistency
             * Uses dark glass design with high contrast that works on all backgrounds
             */

            /* Tab Favicon Container */
            .tab-favicon-container {
                background: ${theme.primaryColor}10 !important;
                border-color: ${theme.primaryColor}20 !important;
            }

            /* Tab Header Hover Effects */
            .tab-header:hover .tab-favicon-container {
                background: ${theme.primaryColor}20 !important;
                border-color: ${theme.primaryColor}40 !important;
            }

            /* Header Buttons - BLACK text and icons for visibility */
            .header-btn {
                background: rgba(255, 255, 255, 0.95) !important;
                color: #000000 !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                backdrop-filter: blur(10px) !important;
                transition: all 0.2s ease !important;
            }

            .header-btn .btn-text,
            .header-btn .btn-icon {
                color: #000000 !important;
                fill: none !important;
                stroke: #000000 !important;
                stroke-width: 2 !important;
            }

            .header-btn:hover {
                background: rgba(255, 255, 255, 1) !important;
                border-color: ${theme.primaryColor} !important;
                transform: translateY(-1px) !important;
            }

            .header-btn:hover .btn-text,
            .header-btn:hover .btn-icon {
                color: #000000 !important;
                stroke: #000000 !important;
            }

            .header-btn.search-btn:hover,
            .header-btn.premium-btn:hover {
                box-shadow: 0 4px 16px ${theme.primaryColor}40 !important;
            }

            /* Premium button - keep colorful */
            .header-btn.premium-btn {
                background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}) !important;
                color: #ffffff !important;
            }

            .header-btn.premium-btn .btn-text {
                color: #ffffff !important;
            }

            /* Action Buttons in stats/actions section - BLACK SVGs for visibility */
            .actions-section .action-btn {
                background: rgba(255, 255, 255, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                backdrop-filter: blur(10px) !important;
                color: #000000 !important;
            }

            .actions-section .action-btn svg {
                stroke: #000000 !important;
                fill: none !important;
                stroke-width: 2 !important;
            }

            .actions-section .action-btn:hover {
                background: rgba(255, 255, 255, 1) !important;
                border-color: ${theme.primaryColor} !important;
                transform: translateY(-1px) !important;
            }

            .actions-section .action-btn:hover svg {
                stroke: #000000 !important;
            }

            /* General action buttons (fallback) */
            .action-btn {
                background: rgba(255, 255, 255, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.3) !important;
                backdrop-filter: blur(10px) !important;
            }

            .action-btn svg {
                stroke: #000000 !important;
                fill: none !important;
                stroke-width: 2 !important;
            }

            .action-btn:hover {
                background: rgba(255, 255, 255, 1) !important;
                border-color: ${theme.primaryColor} !important;
            }

            /* Stat Cards with proper background */
            .stat-card {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(15px) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                transition: all 0.3s ease !important;
            }

            .stat-number {
                background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}) !important;
                -webkit-background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                background-clip: text !important;
                font-weight: 700 !important;
            }

            .stat-label {
                color: ${statCardSecondaryTextColor} !important;
            }

            /* Tab Limit Warning - Solid background with dark text for readability */
            .tab-limit-warning-content {
                background: rgba(245, 158, 11, 0.95) !important;
                border: 2px solid rgba(245, 158, 11, 0.3) !important;
                backdrop-filter: blur(10px) !important;
            }

            .tab-limit-warning-content h3,
            .tab-limit-warning-content strong,
            .tab-limit-warning-content div {
                color: #78350f !important;
            }

            .tab-limit-warning-content p,
            .tab-limit-warning-content p strong,
            .tab-limit-warning-content span {
                color: #92400e !important;
            }

            /* Success message (green background) */
            .tab-limit-warning-content[style*="dcfdf4"] {
                background: rgba(167, 243, 208, 0.95) !important;
            }

            .tab-limit-warning-content[style*="dcfdf4"] h3,
            .tab-limit-warning-content[style*="dcfdf4"] strong,
            .tab-limit-warning-content[style*="dcfdf4"] p {
                color: #065f46 !important;
            }

            /* Empty State - Force dark colors for white background */
            .empty-state {
                color: #475569 !important;
            }

            .empty-state h3,
            .empty-title {
                color: #475569 !important;
            }

            .empty-state p,
            .empty-description {
                color: #94a3b8 !important;
            }

            .empty-icon-svg {
                color: #cbd5e1 !important;
                opacity: 0.8;
            }

            /* Scrollbar Theming */
            .tabs-container::-webkit-scrollbar-thumb {
                background: ${theme.primaryColor}60 !important;
            }

            .tabs-container::-webkit-scrollbar-thumb:hover {
                background: ${theme.primaryColor}80 !important;
            }

            .tabs-container::-webkit-scrollbar-track {
                background: ${theme.primaryColor}10 !important;
            }

            /* ========== BOOKMARKS VIEW COMPREHENSIVE THEMING ========== */

            /* Bookmark Header */
            .bookmark-header {
                background: linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%) !important;
                backdrop-filter: blur(20px) !important;
                box-shadow:
                    0 8px 32px ${theme.primaryColor}40,
                    0 2px 8px ${theme.primaryColor}20,
                    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
            }

            /* Bookmark Stats */
            .bookmark-stats {
                background: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
            }

            /* Bookmark All Current Button */
            #bookmark-all-current {
                background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}) !important;
                box-shadow: 0 4px 12px ${theme.primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
            }

            /* Clear All Bookmarks Button */
            #clear-all-bookmarks {
                background: rgba(255, 255, 255, 0.9) !important;
                backdrop-filter: blur(10px) !important;
            }

            /* Bookmark Items */
            .bookmark-item {
                background: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(15px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                box-shadow:
                    0 4px 16px rgba(0, 0, 0, 0.04),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
            }

            .bookmark-item:hover {
                background: rgba(255, 255, 255, 0.22) !important;
                border-color: ${theme.primaryColor}60 !important;
                box-shadow:
                    0 12px 32px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4),
                    0 0 0 1px ${theme.primaryColor}30 !important;
            }

            /* Bookmark Favicon */
            .bookmark-favicon {
                background: linear-gradient(135deg, ${theme.primaryColor}20, ${theme.secondaryColor}20) !important;
                border: 2px solid ${theme.primaryColor}40 !important;
                box-shadow: 0 4px 12px ${theme.primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
            }

            .bookmark-item:hover .bookmark-favicon {
                box-shadow: 0 6px 16px ${theme.primaryColor}60, inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
            }

            /* Bookmark Text - Force dark colors for light background */
            .bookmark-title {
                color: #1e293b !important;
            }

            .bookmark-url {
                color: #64748b !important;
            }

            /* Remove Bookmark Button */
            .remove-bookmark-btn {
                background: linear-gradient(135deg, #ef4444, #dc2626) !important;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
            }

            .remove-bookmark-btn:hover {
                background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
                box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
            }
        `;

        if (theme.animationsEnabled) {
            const animationDuration = theme.animationSpeed || '300ms';

            if (theme.animationStyle === 'fade') {
                css += `
                    .tab-item {
                        animation: fadeIn ${animationDuration} ease !important;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `;
            } else if (theme.animationStyle === 'slide') {
                css += `
                    .tab-item {
                        animation: slideUp ${animationDuration} ease !important;
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `;
            } else if (theme.animationStyle === 'bounce') {
                css += `
                    .tab-item {
                        animation: bounce ${animationDuration} cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
                    }
                    @keyframes bounce {
                        from { opacity: 0; transform: scale(0.8); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `;
            } else if (theme.animationStyle === 'zoom') {
                css += `
                    .tab-item {
                        animation: zoomIn ${animationDuration} ease !important;
                    }
                    @keyframes zoomIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `;
            }
        }

        themeStyle.textContent = css;
        document.head.appendChild(themeStyle);

    } catch (error) {
    }
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'THEME_UPDATE') {
            if (message.themeConfig) {
                chrome.storage.local.set({
                    activeTheme: message.themeName,
                    themeConfig: message.themeConfig
                }, () => {
                    applyThemeToPopup(message.themeConfig);
                    sendResponse({ status: 'Theme applied and saved' });
                });
            }
        }
        return true;
    });
}