// TabKeep Extension - Authentication Manager
// Handles user authentication and sync token management

class AuthManager {
  constructor() {
    this.AUTH_URL = 'https://www.tabkeep.app/extension-auth';
    this.syncToken = null;
    this.userId = null;
    this.userEmail = null;
    this.isAuthenticated = false;
  }

  /**
   * Initialize authentication state
   */
  async init() {
    await this.loadAuthState();
    this.setupMessageListeners();
  }

  /**
   * Load auth state from chrome.storage
   */
  async loadAuthState() {
    try {
      const data = await chrome.storage.sync.get([
        'tabkeepSyncToken',
        'tabkeepUserId',
        'tabkeepUserEmail',
        'authTimestamp'
      ]);

      if (data.tabkeepSyncToken && data.tabkeepUserId) {
        this.syncToken = data.tabkeepSyncToken;
        this.userId = data.tabkeepUserId;
        this.userEmail = data.tabkeepUserEmail;
        this.isAuthenticated = true;

        console.log('✅ User authenticated with sync token:', this.syncToken.substring(0, 10) + '...');
      } else {
        this.isAuthenticated = false;
        console.log('❌ User not authenticated');
      }

      return this.isAuthenticated;
    } catch (error) {
      console.error('Error loading auth state:', error);
      return false;
    }
  }

  /**
   * Open authentication page in new tab
   */
  openAuthPage() {
    chrome.tabs.create({
      url: this.AUTH_URL,
      active: true
    });
  }

  /**
   * Setup message listeners for auth updates from web
   */
  setupMessageListeners() {
    // Listen for messages from the web app
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TABKEEP_AUTH_SUCCESS') {
        this.handleAuthSuccess(message);
        sendResponse({ success: true });
      }
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        if (changes.tabkeepSyncToken) {
          this.syncToken = changes.tabkeepSyncToken.newValue;
          this.isAuthenticated = !!this.syncToken;
        }
        if (changes.tabkeepUserId) {
          this.userId = changes.tabkeepUserId.newValue;
        }
        if (changes.tabkeepUserEmail) {
          this.userEmail = changes.tabkeepUserEmail.newValue;
        }
      }
    });
  }

  /**
   * Handle successful authentication
   */
  async handleAuthSuccess(authData) {
    try {
      // Store auth data
      await chrome.storage.sync.set({
        tabkeepSyncToken: authData.syncToken,
        tabkeepUserId: authData.userId,
        tabkeepUserEmail: authData.userEmail,
        userAvatar: authData.avatarId,
        authTimestamp: authData.timestamp || Date.now()
      });

      this.syncToken = authData.syncToken;
      this.userId = authData.userId;
      this.userEmail = authData.userEmail;
      this.isAuthenticated = true;

      console.log('✅ Authentication successful!');
      console.log('Sync Token:', this.syncToken.substring(0, 10) + '...');
      console.log('User ID:', this.userId);

      // Broadcast auth success to open popups
      this.broadcastAuthUpdate();

      return true;
    } catch (error) {
      console.error('Error handling auth success:', error);
      return false;
    }
  }

  /**
   * Broadcast auth update to all extension contexts
   */
  broadcastAuthUpdate() {
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      isAuthenticated: this.isAuthenticated,
      syncToken: this.syncToken,
      userId: this.userId,
      userEmail: this.userEmail
    });
  }

  /**
   * Logout user
   */
  async logout() {
    await chrome.storage.sync.remove([
      'tabkeepSyncToken',
      'tabkeepUserId',
      'tabkeepUserEmail',
      'userAvatar',
      'authTimestamp'
    ]);

    this.syncToken = null;
    this.userId = null;
    this.userEmail = null;
    this.isAuthenticated = false;

    this.broadcastAuthUpdate();
    console.log('✅ User logged out');
  }

  /**
   * Get current auth state
   */
  getAuthState() {
    return {
      isAuthenticated: this.isAuthenticated,
      syncToken: this.syncToken,
      userId: this.userId,
      userEmail: this.userEmail
    };
  }
}

// Create global auth manager instance
const authManager = new AuthManager();
authManager.init();
