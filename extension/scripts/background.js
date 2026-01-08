// TabKeep - Background Service Worker
// Handles auto-close timers, tab tracking, and background tasks

class TabKeepBackground {
  constructor() {
    this.autoCloseInterval = null;
    this.tabTimers = new Map(); // Store tab creation/activation times
    this.autoCloseDelay = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    this.init();
  }

  init() {
    console.log('TabKeep Background Service Worker initialized');

    // Load settings and start auto-close if enabled
    this.loadSettings();

    // Listen for tab events
    chrome.tabs.onCreated.addListener((tab) => this.onTabCreated(tab));
    chrome.tabs.onActivated.addListener((activeInfo) => this.onTabActivated(activeInfo));
    chrome.tabs.onRemoved.addListener((tabId) => this.onTabRemoved(tabId));
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.onTabUpdated(tabId, changeInfo, tab));

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Set up periodic check for inactive tabs
    this.startAutoCloseTimer();
  }

  async loadSettings() {
    try {
      const { autoCloseEnabled } = await chrome.storage.local.get('autoCloseEnabled');
      if (autoCloseEnabled) {
        this.startAutoCloseTimer();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  onTabCreated(tab) {
    console.log('Tab created:', tab.id);
    this.tabTimers.set(tab.id, {
      created: Date.now(),
      lastActive: Date.now()
    });
  }

  async onTabActivated(activeInfo) {
    console.log('Tab activated:', activeInfo.tabId);

    // Update last active time
    const timer = this.tabTimers.get(activeInfo.tabId);
    if (timer) {
      timer.lastActive = Date.now();
    } else {
      this.tabTimers.set(activeInfo.tabId, {
        created: Date.now(),
        lastActive: Date.now()
      });
    }
  }

  onTabRemoved(tabId) {
    console.log('Tab removed:', tabId);
    this.tabTimers.delete(tabId);
  }

  onTabUpdated(tabId, changeInfo, tab) {
    // Update timer when tab URL changes
    if (changeInfo.url) {
      const timer = this.tabTimers.get(tabId);
      if (timer) {
        timer.lastActive = Date.now();
      }
    }
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'toggleAutoClose':
        this.toggleAutoClose(request.enabled);
        sendResponse({ success: true });
        break;

      case 'getTabStats':
        this.getTabStats().then(stats => {
          sendResponse({ stats });
        });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  }

  async toggleAutoClose(enabled) {
    if (enabled) {
      console.log('Auto-close enabled');
      this.startAutoCloseTimer();
    } else {
      console.log('Auto-close disabled');
      this.stopAutoCloseTimer();
    }

    await chrome.storage.local.set({ autoCloseEnabled: enabled });
  }

  startAutoCloseTimer() {
    // Clear existing interval if any
    if (this.autoCloseInterval) {
      clearInterval(this.autoCloseInterval);
    }

    // Check every 5 minutes for inactive tabs
    this.autoCloseInterval = setInterval(() => {
      this.checkInactiveTabs();
    }, 5 * 60 * 1000);

    console.log('Auto-close timer started');
  }

  stopAutoCloseTimer() {
    if (this.autoCloseInterval) {
      clearInterval(this.autoCloseInterval);
      this.autoCloseInterval = null;
    }

    console.log('Auto-close timer stopped');
  }

  async checkInactiveTabs() {
    try {
      const { autoCloseEnabled } = await chrome.storage.local.get('autoCloseEnabled');

      if (!autoCloseEnabled) {
        return;
      }

      const tabs = await chrome.tabs.query({});
      const now = Date.now();
      const tabsToClose = [];

      for (const tab of tabs) {
        // Don't close pinned tabs or active tabs
        if (tab.pinned || tab.active) {
          continue;
        }

        const timer = this.tabTimers.get(tab.id);

        if (timer) {
          const inactiveTime = now - timer.lastActive;

          // Close if inactive for more than autoCloseDelay
          if (inactiveTime > this.autoCloseDelay) {
            tabsToClose.push(tab.id);
          }
        }
      }

      if (tabsToClose.length > 0) {
        console.log(`Closing ${tabsToClose.length} inactive tabs`);
        await chrome.tabs.remove(tabsToClose);

        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../assets/icons/icon-128.png',
          title: 'TabKeep Auto-Close',
          message: `Closed ${tabsToClose.length} inactive tab${tabsToClose.length > 1 ? 's' : ''}`,
          priority: 1
        });
      }
    } catch (error) {
      console.error('Error checking inactive tabs:', error);
    }
  }

  async getTabStats() {
    try {
      const tabs = await chrome.tabs.query({});
      const now = Date.now();

      let totalInactiveTime = 0;
      let inactiveTabs = 0;

      for (const tab of tabs) {
        const timer = this.tabTimers.get(tab.id);

        if (timer && !tab.active) {
          const inactiveTime = now - timer.lastActive;
          totalInactiveTime += inactiveTime;

          if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
            inactiveTabs++;
          }
        }
      }

      return {
        totalTabs: tabs.length,
        inactiveTabs,
        avgInactiveTime: totalInactiveTime / Math.max(tabs.length - 1, 1)
      };
    } catch (error) {
      console.error('Error getting tab stats:', error);
      return null;
    }
  }
}

// Initialize background service
const tabKeep = new TabKeepBackground();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('TabKeep installed:', details.reason);

  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      autoCloseEnabled: true
    });

    // Open welcome page
    chrome.tabs.create({
      url: 'https://tabkeep.app'
    });
  }
});
