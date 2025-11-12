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
        const searchBtn = document.getElementById('search-btn');
        const searchSection = document.getElementById('search-section');
        const tabsContainer = document.getElementById('tabs-container');
        const searchInput = document.getElementById('search-input');
        const searchClearBtn = document.getElementById('search-clear-btn');
        const collapseBtn = document.getElementById('collapse-btn');
        const bookmarkBtn = document.getElementById('bookmark-all-btn');

        const showTabsView = () => {
            if (searchSection) searchSection.style.display = 'none';
            if (tabsContainer) tabsContainer.style.display = 'block';
            if (searchBtn) searchBtn.classList.remove('active');
            if (searchInput) searchInput.value = '';
            if (searchClearBtn) searchClearBtn.style.display = 'none';
            this.clearSearchResults();
        };

        const showSearchView = async () => {
            if (searchSection) searchSection.style.display = 'block';
            if (tabsContainer) tabsContainer.style.display = 'none';
            if (searchBtn) searchBtn.classList.add('active');
            await this.updateSearchUsageDisplay();
            setTimeout(() => {
                if (searchInput) searchInput.focus();
            }, 100);
        };

        if (searchBtn) {
            searchBtn.addEventListener('click', async () => {
                const isSearchActive = searchSection && searchSection.style.display !== 'none';

                if (isSearchActive) {
                    showTabsView();
                } else {
                    await showSearchView();
                }
            });
        }

        this.showTabsView = showTabsView;
        this.showSearchView = showSearchView;

        const refreshBtn = document.getElementById('search-refresh-btn');
        const clearResultsBtn = document.getElementById('search-clear-results-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const currentQuery = searchInput ? searchInput.value.trim() : '';
                if (currentQuery) {
                    this.performAISearch(currentQuery, true);
                }
            });
        }

        if (clearResultsBtn) {
            clearResultsBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                this.clearSearchResults();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;

                if (searchClearBtn) {
                    searchClearBtn.style.display = query ? 'flex' : 'none';
                }

                if (!query.trim()) {
                    this.clearSearchResults();
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim();
                    if (query) {
                        this.performAISearch(query);
                    }
                }
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                searchClearBtn.style.display = 'none';
                this.clearSearchResults();
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
        const { canSearch } = await this.checkSearchUsage();

        if (!canSearch) {
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

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.dataset.url = result.url;

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

                const searchSection = document.getElementById('search-section');
                const isSearchActive = searchSection && searchSection.style.display !== 'none';

                if (isSearchActive && this.showTabsView) {
                    this.showTabsView();
                }

                if (this.currentView === 'bookmarks') {
                    this.currentView = 'tabs';
                    this.render();
                } else {
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
            user_name: document.getElementById('contact-name').value.trim(),
            user_email: document.getElementById('contact-email').value.trim(),
            subject: document.getElementById('contact-subject').value.trim(),
            message: document.getElementById('contact-message').value.trim(),
            timestamp: new Date().toLocaleString(),
            extension_version: chrome.runtime.getManifest().version
        };
        try {
            if (!this.emailJSReady) {
                throw new Error('EmailJS not initialized. Please wait a moment and try again.');
            }
            if (!formData.user_name || !formData.user_email || !formData.subject || !formData.message) {
                throw new Error('Please fill in all required fields.');
            }
            submitBtn.disabled = true;
            submitText.innerHTML = '<div class="contact-loading"><div class="contact-spinner"></div><span>Sending...</span></div>';
            const response = await this.sendEmailViaAPI(formData);
            this.showMessage('Message sent successfully! I will get back to you soon.', 'success');
            this.hideContactModal();
        } catch (error) {
            this.openEmailFallback(formData);
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
            const bookmarksToPreserve = {};
            for (const key of bookmarkKeys) {
                bookmarksToPreserve[key] = allKeys[key];
            }

            await chrome.storage.local.clear();

            if (Object.keys(bookmarksToPreserve).length > 0) {
                await chrome.storage.local.set(bookmarksToPreserve);
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

            const tabs = await chrome.tabs.query({ url: ['*://tabmangment.com
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

            .stat-card {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px);
            }

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

            .tab-title {
                color: ${tabItemTextColor} !important;
                font-weight: 500;
            }

            .tab-url {
                color: ${tabItemSecondaryTextColor} !important;
                opacity: 0.7 !important;
            }

            .tab-timer,
            .timer-countdown {
                color: ${tabItemTextColor} !important;
                background: ${theme.primaryColor}15 !important;
            }

            .stat-value {
                color: ${statCardTextColor} !important;
            }

            .stat-label {
                color: ${statCardSecondaryTextColor} !important;
            }

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

            .bookmark-title {
                color: #1e293b !important;
            }

            .bookmark-url {
                color: #64748b !important;
            }

            .header-title,
            .control-btn {
                color: ${primaryTextColor} !important;
            }

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

            .pro-badge-mini {
                background: linear-gradient(45deg, #ff6b6b, #ee5a24) !important;
                color: white !important;
                font-weight: 600 !important;
                z-index: 10 !important;
            }

            .tabs-container {
                background: linear-gradient(135deg, ${theme.primaryColor}12 0%, ${theme.secondaryColor}12 100%) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                border-radius: 12px !important;
                border: 1px solid ${theme.primaryColor}20 !important;
                transition: all 0.3s ease !important;
            }

            .stats-actions-row {
                background: linear-gradient(135deg, ${theme.primaryColor}18 0%, ${theme.secondaryColor}18 100%) !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid ${theme.primaryColor}25 !important;
                transition: all 0.3s ease !important;
            }

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

            .tab-favicon-container {
                background: ${theme.primaryColor}10 !important;
                border-color: ${theme.primaryColor}20 !important;
            }

            .tab-header:hover .tab-favicon-container {
                background: ${theme.primaryColor}20 !important;
                border-color: ${theme.primaryColor}40 !important;
            }

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

            .header-btn.premium-btn {
                background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}) !important;
                color: #ffffff !important;
            }

            .header-btn.premium-btn .btn-text {
                color: #ffffff !important;
            }

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

            .tab-limit-warning-content[style*="dcfdf4"] {
                background: rgba(167, 243, 208, 0.95) !important;
            }

            .tab-limit-warning-content[style*="dcfdf4"] h3,
            .tab-limit-warning-content[style*="dcfdf4"] strong,
            .tab-limit-warning-content[style*="dcfdf4"] p {
                color: #065f46 !important;
            }

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

            .tabs-container::-webkit-scrollbar-thumb {
                background: ${theme.primaryColor}60 !important;
            }

            .tabs-container::-webkit-scrollbar-thumb:hover {
                background: ${theme.primaryColor}80 !important;
            }

            .tabs-container::-webkit-scrollbar-track {
                background: ${theme.primaryColor}10 !important;
            }

            .bookmark-header {
                background: linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%) !important;
                backdrop-filter: blur(20px) !important;
                box-shadow:
                    0 8px 32px ${theme.primaryColor}40,
                    0 2px 8px ${theme.primaryColor}20,
                    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
            }

            .bookmark-stats {
                background: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
            }

            #bookmark-all-current {
                background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}) !important;
                box-shadow: 0 4px 12px ${theme.primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
            }

            #clear-all-bookmarks {
                background: rgba(255, 255, 255, 0.9) !important;
                backdrop-filter: blur(10px) !important;
            }

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

            .bookmark-favicon {
                background: linear-gradient(135deg, ${theme.primaryColor}20, ${theme.secondaryColor}20) !important;
                border: 2px solid ${theme.primaryColor}40 !important;
                box-shadow: 0 4px 12px ${theme.primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
            }

            .bookmark-item:hover .bookmark-favicon {
                box-shadow: 0 6px 16px ${theme.primaryColor}60, inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
            }

            .bookmark-title {
                color: #1e293b !important;
            }

            .bookmark-url {
                color: #64748b !important;
            }

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