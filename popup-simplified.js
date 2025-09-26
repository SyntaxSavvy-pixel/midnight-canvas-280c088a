class TabmangmentPopup {
    constructor() {
        this.tabs = [];
        this.stats = { active: 0, scheduled: 0 };
        this.selectedTabId = null;
        this.updateInterval = null;
        this.tabLimit = 10;
        this.isPremium = false;
        this.totalTabCount = 0;
        this.hiddenTabCount = 0;
        this.currentView = 'tabs';

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.checkServiceWorkerHealth();
            await this.loadData();
            await this.checkPremiumStatus();
            await this.render();
            this.startRealTimeUpdates();
        } catch (error) {
            this.showError('Failed to initialize extension: ' + error.message);
        }
    }

    async checkServiceWorkerHealth() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'ping' });
            if (!response?.success) {
                throw new Error('Service worker not responding');
            }
        } catch (error) {
            console.error('Service worker health check failed:', error);
        }
    }

    async checkPremiumStatus() {
        try {
            const data = await chrome.storage.local.get(['isPremium', 'subscriptionActive']);
            this.isPremium = data.isPremium || data.subscriptionActive || false;
            console.log('Premium status:', this.isPremium);
        } catch (error) {
            console.error('Error checking premium status:', error);
            this.isPremium = false;
        }
    }

    setupEventListeners() {
        const premiumBtn = document.getElementById('premium-btn');
        if (premiumBtn) {
            premiumBtn.addEventListener('click', () => this.handlePremiumButtonClick());
        }

        const contactBtn = document.getElementById('contact-btn');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => this.showContactModal());
        }

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateClosingSoonCount') {
                this.updateClosingSoonBadge(message.count);
            }
        });
    }

    async handlePremiumButtonClick() {
        if (this.isPremium) {
            this.showSubscriptionManagementModal();
        } else {

            const userEmail = await this.getUserEmail();
            if (userEmail) {
                await this.createSimplifiedPaymentSession(userEmail);
            } else {
                this.showPremiumModal();
            }
        }
    }

    async getUserEmail() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); display: flex; align-items: center;
                justify-content: center; z-index: 10000;
            `;

            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                    <h3 style="margin: 0 0 20px 0; color: #333;">Upgrade to Pro - $0.99/month</h3>
                    <p style="margin-bottom: 20px; color: #666;">Enter your email to continue with Stripe payment:</p>
                    <input type="email" id="user-email" placeholder="your.email@example.com"
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px;">
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancel-payment" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
                        <button id="continue-payment" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">Continue to Payment</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const emailInput = modal.querySelector('#user-email');
            const continueBtn = modal.querySelector('#continue-payment');
            const cancelBtn = modal.querySelector('#cancel-payment');

            const cleanup = () => modal.remove();

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            continueBtn.addEventListener('click', () => {
                const email = emailInput.value.trim();
                if (email && email.includes('@')) {
                    cleanup();
                    resolve(email);
                } else {
                    emailInput.style.borderColor = 'red';
                    emailInput.placeholder = 'Please enter a valid email';
                }
            });

            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    continueBtn.click();
                }
            });

            setTimeout(() => emailInput.focus(), 100);
        });
    }

    async createSimplifiedPaymentSession(userEmail) {
        try {
            console.log('🔄 Creating payment session for:', userEmail);

            const stripePaymentUrl = `https:

            this.showMessage('✅ Opening Stripe payment page...', 'success');

            await chrome.tabs.create({
                url: stripePaymentUrl,
                active: true
            });

            await chrome.storage.local.set({ userEmail: userEmail });

            return {
                url: stripePaymentUrl,
                email: userEmail,
                amount: 99,
                currency: 'usd'
            };

        } catch (error) {
            console.error('❌ Payment session error:', error);
            this.showMessage('❌ Unable to open payment page. Please try again.', 'error');
            throw error;
        }
    }

    showPremiumModal() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 350px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);">
                <h3 style="margin: 0 0 16px 0; color: #333; text-align: center;">🚀 Upgrade to Pro</h3>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 8px;">$0.99/month</div>
                    <div style="text-align: center; opacity: 0.9;">Unlimited tabs & premium features</div>
                </div>
                <ul style="margin: 16px 0; padding-left: 20px; color: #555;">
                    <li>Unlimited tab management</li>
                    <li>Advanced timer features</li>
                    <li>Smart tab analytics</li>
                    <li>Auto-optimization</li>
                    <li>Priority support</li>
                </ul>
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button id="cancel-premium" style="flex: 1; padding: 12px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
                    <button id="upgrade-premium" style="flex: 2; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Upgrade Now</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#cancel-premium').addEventListener('click', () => modal.remove());
        modal.querySelector('#upgrade-premium').addEventListener('click', async () => {
            modal.remove();
            const email = await this.getUserEmail();
            if (email) {
                await this.createSimplifiedPaymentSession(email);
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    showSubscriptionManagementModal() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 400px;">
                <h3 style="margin: 0 0 16px 0; color: #333;">✅ Pro Subscription Active</h3>
                <p style="color: #666; margin-bottom: 20px;">You have access to all Pro features!</p>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-weight: bold; color: #333;">Pro Features Unlocked:</div>
                    <ul style="margin: 8px 0; padding-left: 20px; color: #555;">
                        <li>Unlimited tabs</li>
                        <li>Advanced timers</li>
                        <li>Smart analytics</li>
                        <li>Auto-optimization</li>
                    </ul>
                </div>
                <div style="text-align: center;">
                    <button id="close-modal" style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    showContactModal() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 400px;">
                <h3 style="margin: 0 0 16px 0; color: #333;">📧 Contact Support</h3>
                <p style="color: #666; margin-bottom: 20px;">Need help? Reach out to us:</p>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="margin-bottom: 12px;">
                        <strong>Email:</strong> <a href="mailto:support@tabmangment.com" style="color: #4CAF50;">support@tabmangment.com</a>
                    </div>
                    <div>
                        <strong>Response Time:</strong> Usually within 24 hours
                    </div>
                </div>
                <div style="text-align: center;">
                    <button id="close-contact" style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#close-contact').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async loadData() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getTabData' });
            if (response?.success) {
                this.tabs = response.data || [];
                this.totalTabCount = this.tabs.length;
                this.hiddenTabCount = Math.max(0, this.totalTabCount - this.tabLimit);
            }

            const statsResponse = await chrome.runtime.sendMessage({ action: 'getStats' });
            if (statsResponse?.success) {
                this.stats = statsResponse.data || { active: 0, scheduled: 0 };
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.tabs = [];
            this.stats = { active: 0, scheduled: 0 };
        }
    }

    async render() {
        await this.renderTabs();
        this.updateStats();
        this.updatePremiumButton();
    }

    async renderTabs() {
        const container = document.getElementById('tabs-container');
        if (!container) return;

        let displayTabs = this.tabs;

        if (!this.isPremium && this.tabs.length > this.tabLimit) {
            displayTabs = this.tabs.slice(0, this.tabLimit);
            this.showFreeLimitWarning(container);
        }

        container.innerHTML = displayTabs.map(tab => this.createTabElement(tab)).join('');

        displayTabs.forEach(tab => {
            this.attachTabListeners(tab.id);
        });
    }

    createTabElement(tab) {
        const timeRemaining = tab.autoCloseTime ? Math.max(0, tab.autoCloseTime - Date.now()) : 0;
        const hasTimer = tab.timerActive && timeRemaining > 0;

        return `
            <div class="tab-item" data-tab-id="${tab.id}">
                <div class="tab-favicon">
                    <img src="${tab.favIconUrl || 'icons/icon-16.png'}" alt="favicon" width="16" height="16">
                </div>
                <div class="tab-content">
                    <div class="tab-title">${this.truncateText(tab.title, 40)}</div>
                    <div class="tab-url">${this.extractDomain(tab.url)}</div>
                    ${hasTimer ? `<div class="tab-timer">⏰ ${this.formatTime(timeRemaining)}</div>` : ''}
                </div>
                <div class="tab-actions">
                    <button class="tab-action-btn timer-btn" data-action="timer" data-tab-id="${tab.id}" title="Set Timer">
                        ⏱️
                    </button>
                    <button class="tab-action-btn protect-btn ${tab.protected ? 'active' : ''}" data-action="protect" data-tab-id="${tab.id}" title="Protect Tab">
                        🛡️
                    </button>
                    <button class="tab-action-btn close-btn" data-action="close" data-tab-id="${tab.id}" title="Close Tab">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }

    attachTabListeners(tabId) {
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (!tabElement) return;

        tabElement.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-actions')) {
                this.switchToTab(tabId);
            }
        });

        tabElement.querySelectorAll('.tab-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleTabAction(action, tabId);
            });
        });
    }

    async handleTabAction(action, tabId) {
        try {
            switch (action) {
                case 'timer':
                    await this.showTimerModal(tabId);
                    break;
                case 'protect':
                    await chrome.runtime.sendMessage({ action: 'protectTab', tabId });
                    await this.render();
                    break;
                case 'close':
                    await chrome.runtime.sendMessage({ action: 'closeTab', tabId });
                    await this.loadData();
                    await this.render();
                    break;
            }
        } catch (error) {
            console.error('Tab action error:', error);
            this.showMessage('Action failed. Please try again.', 'error');
        }
    }

    async switchToTab(tabId) {
        try {
            await chrome.runtime.sendMessage({ action: 'switchToTab', tabId });
            window.close();
        } catch (error) {
            console.error('Switch tab error:', error);
        }
    }

    showFreeLimitWarning(container) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'free-limit-warning';
        warningDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #ff9a56, #ff6b35); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
                <div style="font-weight: bold; margin-bottom: 8px;">Free Plan: Showing ${this.tabLimit} of ${this.totalTabCount} tabs</div>
                <div style="font-size: 14px; opacity: 0.9;">Upgrade to Pro for unlimited tabs!</div>
                <button id="upgrade-from-warning" style="background: white; color: #ff6b35; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 8px; cursor: pointer; font-weight: bold;">
                    Upgrade Now - $0.99/month
                </button>
            </div>
        `;

        container.insertBefore(warningDiv, container.firstChild);

        warningDiv.querySelector('#upgrade-from-warning').addEventListener('click', () => {
            this.handlePremiumButtonClick();
        });
    }

    updateStats() {
        const activeEl = document.getElementById('active-count');
        const scheduledEl = document.getElementById('scheduled-count');

        if (activeEl) activeEl.textContent = this.stats.active || 0;
        if (scheduledEl) scheduledEl.textContent = this.stats.scheduled || 0;
    }

    updatePremiumButton() {
        const premiumBtn = document.getElementById('premium-btn');
        if (premiumBtn) {
            if (this.isPremium) {
                premiumBtn.innerHTML = '✅ PRO ACTIVE';
                premiumBtn.style.background = '#4CAF50';
                premiumBtn.style.cursor = 'pointer';
            } else {
                premiumBtn.innerHTML = '🚀 UPGRADE PRO';
                premiumBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                premiumBtn.style.cursor = 'pointer';
            }
        }
    }

    updateClosingSoonBadge(count) {
        const badge = document.getElementById('closing-soon-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            await this.loadData();
            await this.render();
        }, 2000);
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed; top: 10px; right: 10px; padding: 12px 16px;
            border-radius: 6px; color: white; font-weight: bold; z-index: 10000;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'Unknown';
        }
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

    async showTimerModal(tabId) {

        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; width: 90%; max-width: 300px;">
                <h3 style="margin: 0 0 16px 0; color: #333;">Set Timer</h3>
                <div style="display: grid; gap: 12px; margin-bottom: 20px;">
                    <button class="timer-option" data-minutes="15" style="padding: 12px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">15 minutes</button>
                    <button class="timer-option" data-minutes="30" style="padding: 12px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">30 minutes</button>
                    <button class="timer-option" data-minutes="60" style="padding: 12px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">1 hour</button>
                    <button class="timer-option" data-minutes="0" style="padding: 12px; border: 1px solid #f44336; color: #f44336; background: white; border-radius: 6px; cursor: pointer;">Remove Timer</button>
                </div>
                <div style="text-align: center;">
                    <button id="cancel-timer" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const cleanup = () => modal.remove();

        modal.querySelector('#cancel-timer').addEventListener('click', cleanup);

        modal.querySelectorAll('.timer-option').forEach(btn => {
            btn.addEventListener('click', async () => {
                const minutes = parseInt(btn.dataset.minutes);

                if (minutes === 0) {
                    await chrome.runtime.sendMessage({ action: 'clearTimer', tabId });
                } else {
                    await chrome.runtime.sendMessage({ action: 'setTimer', tabId, minutes });
                }

                cleanup();
                await this.loadData();
                await this.render();
                this.showMessage(`Timer ${minutes === 0 ? 'removed' : 'set for ' + minutes + ' minutes'}`, 'success');
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) cleanup();
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TabmangmentPopup());
} else {
    new TabmangmentPopup();
}