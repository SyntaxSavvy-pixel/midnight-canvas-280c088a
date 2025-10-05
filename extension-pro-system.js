import { CONFIG } from './config.js';

class ProManager {
  constructor() {
    this.apiBase = CONFIG.API.BASE;
    this.isPro = false;
    this.checkingStatus = false;
    this.lastStatusCheck = 0;
    this.statusCheckInterval = 5 * 60 * 1000;
  }

  async init() {
    await this.loadStoredStatus();
    await this.checkProStatus();
    this.setupPeriodicCheck();
  }

  async loadStoredStatus() {
    try {
      const data = await chrome.storage.local.get(['proData']);
      if (data.proData) {
        this.isPro = data.proData.isPro || false;
        this.lastStatusCheck = data.proData.lastCheck || 0;

      }
    } catch (error) {

    }
  }

  async saveProStatus(proData) {
    try {
      await chrome.storage.local.set({
        proData: {
          ...proData,
          lastCheck: Date.now()
        }
      });
      this.isPro = proData.isPro;

    } catch (error) {

    }
  }

  async getUserIdentifier() {
    try {

      const stored = await chrome.storage.local.get(['userData', 'userEmail']);

      if (stored.userData?.email) {
        return stored.userData.email;
      }

      if (stored.userEmail) {
        return stored.userEmail;
      }

      return null;
    } catch (error) {

      return null;
    }
  }

  async checkProStatus(force = false) {
    try {

      const now = Date.now();
      if (!force && (now - this.lastStatusCheck) < this.statusCheckInterval) {

        return this.isPro;
      }

      if (this.checkingStatus) {

        return this.isPro;
      }

      this.checkingStatus = true;

      const userIdentifier = await this.getUserIdentifier();
      if (!userIdentifier) {

        this.checkingStatus = false;
        return false;
      }

      const response = await fetch(`${this.apiBase}/check-status?email=${encodeURIComponent(userIdentifier)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        await this.saveProStatus({
          isPro: data.isPro,
          status: data.status,
          subscriptionId: data.subscriptionId,
          currentPeriodEnd: data.currentPeriodEnd,
          plan: data.plan
        });

        this.checkingStatus = false;
        return data.isPro;
      } else {

        this.checkingStatus = false;
        return this.isPro;
      }

    } catch (error) {

      this.checkingStatus = false;
      return this.isPro;
    }
  }

  async createCheckout(email) {
    try {
      if (!email) {
        throw new Error('Email is required for checkout');
      }

      const response = await fetch(`${this.apiBase}/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          userId: email
        })
      });

      if (response.ok) {
        const data = await response.json();

        await chrome.storage.local.set({
          userEmail: email,
          checkoutSession: {
            sessionId: data.sessionId,
            customerId: data.customerId,
            createdAt: Date.now()
          }
        });

        return data.url;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

    } catch (error) {

      throw error;
    }
  }

  async handleUpgrade() {
    try {

      const email = await this.promptForEmail();
      if (!email) {
        return;
      }

      const checkoutUrl = await this.createCheckout(email);

      await chrome.tabs.create({
        url: checkoutUrl,
        active: true
      });

      this.startActivationMonitoring(email);

      this.showMessage('💳 Complete your purchase to unlock Pro features!', 'info');

    } catch (error) {

      this.showMessage('❌ Unable to start upgrade process. Please try again.', 'error');
    }
  }

  async promptForEmail() {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
          <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 16px 0;">Upgrade to Pro</h3>
            <p style="margin: 0 0 16px 0; color: #666;">Enter your email to continue:</p>
            <input type="email" id="proEmail" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 16px;">
            <div style="display: flex; gap: 8px;">
              <button id="confirmUpgrade" style="flex: 1; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Continue</button>
              <button id="cancelUpgrade" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const emailInput = modal.querySelector('#proEmail');
      const confirmBtn = modal.querySelector('#confirmUpgrade');
      const cancelBtn = modal.querySelector('#cancelUpgrade');

      emailInput.focus();

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      confirmBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (email && email.includes('@')) {
          cleanup();
          resolve(email);
        } else {
          emailInput.style.borderColor = '#ef4444';
          emailInput.focus();
        }
      });

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click();
        }
      });
    });
  }

  startActivationMonitoring(email) {

    let attempts = 0;
    const maxAttempts = 30;
    const checkInterval = 10000;

    const monitor = setInterval(async () => {
      attempts++;

      const isNowPro = await this.checkProStatus(true);

      if (isNowPro) {

        clearInterval(monitor);

        this.showMessage('🎉 Pro features activated! Welcome to Pro!', 'success');
        this.onProActivated();

        return;
      }

      if (attempts >= maxAttempts) {

        clearInterval(monitor);
        this.showMessage('⏰ Please refresh the extension if your purchase completed.', 'warning');
      }
    }, checkInterval);
  }

  setupPeriodicCheck() {

    setInterval(async () => {
      await this.checkProStatus();
    }, this.statusCheckInterval);

    document.addEventListener('DOMContentLoaded', async () => {
      await this.checkProStatus();
    });
  }

  onProActivated() {

    this.updateUIForPro();

    this.initProFeatures();

    chrome.action.setBadgeText({ text: 'PRO' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  }

  updateUIForPro() {

    document.querySelectorAll('.upgrade-btn').forEach(btn => {
      btn.style.display = 'none';
    });

    document.querySelectorAll('.pro-feature').forEach(feature => {
      feature.style.display = 'block';
    });

    document.querySelectorAll('.pro-badge').forEach(badge => {
      badge.style.display = 'none';
    });

  }

  initProFeatures() {

    this.unlimitedTabsEnabled = true;

    this.advancedTimersEnabled = true;

    this.bulkOperationsEnabled = true;

  }

  hasProAccess(feature) {
    if (!this.isPro) {
      return false;
    }

    switch (feature) {
      case 'unlimited_tabs':
      case 'advanced_timers':
      case 'bulk_operations':
      case 'custom_themes':
        return true;
      default:
        return false;
    }
  }

  showProPrompt(feature) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%;">
          <h3 style="margin: 0 0 16px 0;">🚀 Pro Feature</h3>
          <p style="margin: 0 0 16px 0; color: #666;">This feature requires Pro access. Upgrade now to unlock:</p>
          <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #666;">
            <li>Unlimited tabs and bookmarks</li>
            <li>Advanced timer controls</li>
            <li>Bulk operations</li>
            <li>Priority support</li>
          </ul>
          <div style="display: flex; gap: 8px;">
            <button id="upgradeNow" style="flex: 1; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Upgrade Now</button>
            <button id="closePro" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Not Now</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#upgradeNow').addEventListener('click', () => {
      document.body.removeChild(modal);
      this.handleUpgrade();
    });

    modal.querySelector('#closePro').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  showMessage(message, type = 'info') {

  }
}

const proManager = new ProManager();

document.addEventListener('DOMContentLoaded', async () => {
  await proManager.init();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProManager;
}