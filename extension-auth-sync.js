// Extension Authentication Sync
// This handles syncing between website login and extension
// Runs in the extension background/popup

class ExtensionAuthSync {
  constructor() {
    this.apiBaseUrl = 'https://tabmangment.com/api';
    this.syncInterval = null;
    this.isLoggedIn = false;
    this.currentUser = null;
    this.token = null;

    this.init();
  }

  async init() {

    // Check if user is already logged in
    await this.checkExistingLogin();

    // Listen for login messages from website
    this.setupMessageListeners();

    // Start periodic sync
    this.startPeriodicSync();
  }

  async checkExistingLogin() {
    try {
      // Check extension storage for login data
      const storage = await chrome.storage.local.get(['tabmangment_user', 'tabmangment_token']);

      if (storage.tabmangment_user && storage.tabmangment_token) {

        this.currentUser = storage.tabmangment_user;
        this.token = storage.tabmangment_token;

        // Verify token is still valid
        const isValid = await this.verifyToken(this.token);

        if (isValid) {
          this.isLoggedIn = true;
          await this.syncUserData();
        } else {
          await this.logout();
        }
      } else {
      }
    } catch (error) {
    }
  }

  setupMessageListeners() {
    // Listen for messages from website/popup
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      });
    }

    // Listen for storage changes
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
          if (changes.tabmangment_user || changes.tabmangment_token) {
            this.handleStorageChange(changes);
          }
        }
      });
    }
  }

  async handleMessage(message, sender, sendResponse) {

    try {
      switch (message.type) {
        case 'USER_LOGGED_IN':
          await this.handleUserLogin(message.user, message.token);
          sendResponse({ success: true });
          break;

        case 'GET_USER_STATUS':
          sendResponse({
            success: true,
            isLoggedIn: this.isLoggedIn,
            user: this.currentUser,
            isPro: this.currentUser?.isPro || false
          });
          break;

        case 'LOGOUT_USER':
          await this.logout();
          sendResponse({ success: true });
          break;

        case 'SYNC_USER_DATA':
          await this.syncUserData();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, message: 'Unknown message type' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleUserLogin(user, token) {

    this.currentUser = user;
    this.token = token;
    this.isLoggedIn = true;

    // Store in extension storage
    await chrome.storage.local.set({
      tabmangment_user: user,
      tabmangment_token: token,
      userEmail: user.email,
      isPremium: user.isPro || false,
      subscriptionActive: user.isPro || false,
      planType: user.isPro ? 'pro' : 'free'
    });


    // Sync latest user data
    await this.syncUserData();

  }

  async handleStorageChange(changes) {

    if (changes.tabmangment_user) {
      this.currentUser = changes.tabmangment_user.newValue;
    }

    if (changes.tabmangment_token) {
      this.token = changes.tabmangment_token.newValue;
    }

    this.isLoggedIn = !!(this.currentUser && this.token);
  }

  async verifyToken(token) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      return false;
    }
  }

  async syncUserData() {
    if (!this.isLoggedIn || !this.token) {
      return;
    }

    try {

      const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        const user = result.user;
        this.currentUser = user;

        // Update extension storage with latest data
        await chrome.storage.local.set({
          tabmangment_user: user,
          userEmail: user.email,
          isPremium: user.isPro || false,
          subscriptionActive: user.isPro || false,
          planType: user.isPro ? 'pro' : 'free',
          proActivatedAt: user.proActivatedAt,
          lastSyncAt: new Date().toISOString()
        });

      } else {
        await this.logout();
      }
    } catch (error) {
    }
  }

  async logout() {

    this.isLoggedIn = false;
    this.currentUser = null;
    this.token = null;

    // Clear extension storage
    await chrome.storage.local.remove([
      'tabmangment_user',
      'tabmangment_token',
      'userEmail',
      'isPremium',
      'subscriptionActive',
      'planType',
      'proActivatedAt'
    ]);

  }

  startPeriodicSync() {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      if (this.isLoggedIn) {
        this.syncUserData();
      }
    }, 5 * 60 * 1000);

  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Public methods for extension to use
  async openLoginPage() {
    const loginUrl = `${this.apiBaseUrl.replace('/api', '')}/new-authentication`;
    chrome.tabs.create({ url: loginUrl });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isUserLoggedIn() {
    return this.isLoggedIn;
  }

  isUserPro() {
    return this.currentUser?.isPro || false;
  }
}

// Global instance
let authSync = null;

// Initialize when script loads
if (typeof chrome !== 'undefined' && chrome.runtime) {
  authSync = new ExtensionAuthSync();

  // Add global functions for extension to use
  window.openLoginPage = () => authSync?.openLoginPage();
  window.getUserStatus = () => authSync?.getCurrentUser();
  window.isLoggedIn = () => authSync?.isUserLoggedIn();
  window.isUserPro = () => authSync?.isUserPro();
  window.syncUserData = () => authSync?.syncUserData();
  window.logoutUser = () => authSync?.logout();
}