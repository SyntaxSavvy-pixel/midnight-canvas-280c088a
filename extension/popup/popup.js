// TabKeep - Popup Script
// Handles the popup UI and tab management

class TabKeepPopup {
  constructor() {
    this.tabsList = document.getElementById('tabsList');
    this.tabCount = document.getElementById('tabCount');
    this.vpnToggle = document.getElementById('vpnToggle');
    this.aiBtn = document.getElementById('aiBtn');
    this.bookmarkBtn = document.getElementById('bookmarkBtn');
    this.collapseBtn = document.getElementById('collapseBtn');

    // Avatar elements
    this.avatarContainer = document.getElementById('avatarContainer');
    this.profileAvatar = document.getElementById('profileAvatar');

    // Bookmarks view elements
    this.bookmarksView = document.getElementById('bookmarksView');
    this.bookmarksArea = document.getElementById('bookmarksArea');
    this.bookmarksGrid = document.getElementById('bookmarksGrid');
    this.bookmarksEmpty = document.getElementById('bookmarksEmpty');

    // Current search query
    this.searchQuery = '';

    this.init();
  }

  init() {
    this.loadTabs();
    this.setupEventListeners();
    this.loadSettings();
    this.loadAvatar();
    this.setupAvatarSync();
  }

  setupEventListeners() {
    // VPN toggle
    this.vpnToggle.addEventListener('click', () => {
      this.toggleVPN();
    });

    // Quick action buttons
    this.aiBtn.addEventListener('click', () => {
      this.openAIAssistant();
    });

    this.bookmarkBtn.addEventListener('click', () => {
      this.openBookmarksView();
    });

    this.collapseBtn.addEventListener('click', () => {
      this.collapseAllTabs();
    });

    // AI Interface Event Listeners
    this.setupAIEventListeners();

    // Bookmarks Interface Event Listeners
    this.setupBookmarksEventListeners();
  }

  setupAIEventListeners() {
    const backBtn = document.getElementById('backBtn');
    const clearBtn = document.getElementById('clearChatBtn');
    const aiInput = document.getElementById('aiInput');
    const sendBtn = document.getElementById('sendBtn');
    const suggestionBtns = document.querySelectorAll('.ai-suggestion-btn');

    // Back button - return to main view
    backBtn?.addEventListener('click', () => {
      this.closeAIAssistant();
    });

    // Clear chat button
    clearBtn?.addEventListener('click', () => {
      this.clearChat();
    });

    // Input handling
    aiInput?.addEventListener('input', (e) => {
      const hasText = e.target.value.trim().length > 0;
      sendBtn.disabled = !hasText;

      // Auto-resize textarea
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    });

    // Send message on Enter (without Shift)
    aiInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
          this.sendAIMessage();
        }
      }
    });

    // Send button click
    sendBtn?.addEventListener('click', () => {
      this.sendAIMessage();
    });

    // Suggested prompts
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        this.sendAIMessage(prompt);
      });
    });
  }

  setupBookmarksEventListeners() {
    const bookmarksBackBtn = document.getElementById('bookmarksBackBtn');
    const syncBtn = document.getElementById('syncBtn');
    const searchInput = document.getElementById('bookmarkSearchInput');

    // Back button - return to main view
    bookmarksBackBtn?.addEventListener('click', () => {
      this.closeBookmarksView();
    });

    // Sync button
    syncBtn?.addEventListener('click', () => {
      this.syncBookmarks();
    });

    // Search input
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.loadBookmarks();
    });
  }

  async loadTabs() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const activeTab = tabs.find(tab => tab.active);
      this.renderTabs(tabs, activeTab);
      this.updateTabCount(tabs.length);
    } catch (error) {
      console.error('Error loading tabs:', error);
      this.showEmptyState('Failed to load tabs');
    }
  }

  renderTabs(tabs, activeTab) {
    if (tabs.length === 0) {
      this.showEmptyState();
      return;
    }

    this.tabsList.innerHTML = '';

    // Sort tabs: current tab always first, then the rest in original order
    const sortedTabs = [...tabs].sort((a, b) => {
      const aIsCurrent = activeTab && a.id === activeTab.id;
      const bIsCurrent = activeTab && b.id === activeTab.id;

      if (aIsCurrent) return -1; // Current tab goes first
      if (bIsCurrent) return 1;  // Current tab goes first
      return 0; // Keep original order for other tabs
    });

    sortedTabs.forEach(tab => {
      const isCurrentTab = activeTab && tab.id === activeTab.id;
      const tabItem = this.createTabItem(tab, isCurrentTab);
      this.tabsList.appendChild(tabItem);
    });

    // Scroll to top to show the current tab (which is now always first)
    if (activeTab) {
      setTimeout(() => {
        this.tabsList.scrollTop = 0;
      }, 100);
    }
  }

  createTabItem(tab, isCurrentTab = false) {
    const item = document.createElement('div');
    item.className = 'tab-item';

    // Mark as current tab if it's active
    if (isCurrentTab) {
      item.classList.add('current-tab');
    }

    const favicon = this.getFaviconElement(tab);
    const info = document.createElement('div');
    info.className = 'tab-info';

    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tab.title || 'Untitled';

    const url = document.createElement('div');
    url.className = 'tab-url';

    const urlText = document.createElement('span');
    urlText.textContent = this.formatUrl(tab.url);
    url.appendChild(urlText);

    info.appendChild(title);
    info.appendChild(url);

    // Action buttons container (same for all tabs)
    const actions = document.createElement('div');
    actions.className = 'tab-actions';

    // Bookmark button
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = 'tab-action-btn tab-bookmark-btn';
    bookmarkBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    bookmarkBtn.title = 'Bookmark this tab';
    bookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.bookmarkTab(tab, item);
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-action-btn tab-close-btn';
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    `;
    closeBtn.title = 'Close this tab';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id, item);
    });

    actions.appendChild(bookmarkBtn);
    actions.appendChild(closeBtn);

    item.appendChild(favicon);
    item.appendChild(info);
    item.appendChild(actions);

    // Click to switch to tab
    item.addEventListener('click', () => {
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
      window.close();
    });

    return item;
  }

  async closeTab(tabId, itemElement) {
    try {
      // Check if we're closing the current tab
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const closingTab = tabs.find(t => t.id === tabId);
      const isClosingCurrentTab = closingTab && closingTab.active;

      // Animate removal first
      itemElement.classList.add('removing');

      // Close the tab
      await chrome.tabs.remove(tabId);

      // Wait for animation to complete, then refresh
      setTimeout(() => {
        // Refresh the list to update the current tab highlight and position
        this.loadTabs();
      }, 350);

      // Show appropriate message
      if (isClosingCurrentTab) {
        this.showNotification('Current tab closed');
      }
    } catch (error) {
      console.error('Error closing tab:', error);
      this.showNotification('Failed to close tab', 'error');
    }
  }

  async bookmarkTab(tab, tabItemElement) {
    try {
      // Get existing bookmarks from storage
      const { bookmarks = [] } = await chrome.storage.sync.get('bookmarks');

      // Create bookmark object
      const bookmark = {
        id: Date.now().toString(),
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        timestamp: Date.now()
      };

      // Add to bookmarks array
      bookmarks.push(bookmark);

      // Save to sync storage (persists across devices and extension reinstalls)
      await chrome.storage.sync.set({ bookmarks });

      // Trigger fade-out animation
      if (tabItemElement) {
        tabItemElement.classList.add('removing');

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 350));
      }

      this.showNotification('Saved to bookmarks!');

      // Reload bookmarks if we're on bookmarks view
      if (!this.bookmarksView.classList.contains('hidden')) {
        this.loadBookmarks();
      }
    } catch (error) {
      console.error('Error bookmarking tab:', error);
      this.showNotification('Failed to bookmark', 'error');
    }
  }

  getFaviconElement(tab) {
    const faviconContainer = document.createElement('div');
    faviconContainer.className = 'tab-favicon';

    if (tab.favIconUrl && !tab.favIconUrl.includes('chrome://')) {
      const img = document.createElement('img');
      img.src = tab.favIconUrl;
      img.alt = '';
      img.onerror = () => {
        faviconContainer.innerHTML = this.getDefaultIcon();
      };
      faviconContainer.appendChild(img);
    } else {
      faviconContainer.innerHTML = this.getDefaultIcon();
    }

    return faviconContainer;
  }

  getDefaultIcon() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    `;
  }

  formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  updateTabCount(count) {
    this.tabCount.textContent = `${count} tab${count !== 1 ? 's' : ''}`;
  }

  showEmptyState(message = 'No tabs open') {
    this.tabsList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
        </svg>
        <p>${message}</p>
        <small>Start browsing to see tabs here</small>
      </div>
    `;
  }

  // Settings Management
  async loadSettings() {
    try {
      const { vpnEnabled } = await chrome.storage.local.get('vpnEnabled');
      if (vpnEnabled) {
        this.vpnToggle.classList.add('active');
      } else {
        this.vpnToggle.classList.remove('active');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async toggleVPN() {
    try {
      const { vpnEnabled } = await chrome.storage.local.get('vpnEnabled');
      const newState = !vpnEnabled;

      await chrome.storage.local.set({ vpnEnabled: newState });

      if (newState) {
        this.vpnToggle.classList.add('active');
      } else {
        this.vpnToggle.classList.remove('active');
      }

      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'toggleVPN',
        enabled: newState
      });
    } catch (error) {
      console.error('Error toggling VPN:', error);
    }
  }

  // AI Assistant Methods
  openAIAssistant() {
    const mainView = document.getElementById('mainView');
    const aiView = document.getElementById('aiView');

    // Hide main view, show AI view
    mainView.classList.add('hidden');
    aiView.classList.remove('hidden');

    // Focus on input
    setTimeout(() => {
      document.getElementById('aiInput')?.focus();
    }, 100);
  }

  closeAIAssistant() {
    const mainView = document.getElementById('mainView');
    const aiView = document.getElementById('aiView');

    // Show main view, hide AI view
    aiView.classList.add('hidden');
    mainView.classList.remove('hidden');
  }

  clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    const aiWelcome = document.querySelector('.ai-welcome');
    const aiSuggestions = document.querySelector('.ai-suggestions');

    // Clear all messages
    chatMessages.innerHTML = '';

    // Show welcome screen again
    if (aiWelcome) aiWelcome.style.display = 'block';
    if (aiSuggestions) aiSuggestions.style.display = 'grid';

    this.showNotification('Chat cleared');
  }

  sendAIMessage(customMessage = null) {
    const aiInput = document.getElementById('aiInput');
    const message = customMessage || aiInput.value.trim();

    if (!message) return;

    // Hide welcome screen on first message
    const aiWelcome = document.querySelector('.ai-welcome');
    const aiSuggestions = document.querySelector('.ai-suggestions');
    if (aiWelcome) aiWelcome.style.display = 'none';
    if (aiSuggestions) aiSuggestions.style.display = 'none';

    // Add user message
    this.addChatMessage(message, 'user');

    // Clear input
    if (!customMessage) {
      aiInput.value = '';
      aiInput.style.height = 'auto';
      document.getElementById('sendBtn').disabled = true;
    }

    // Show typing indicator
    this.showTypingIndicator();

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      this.hideTypingIndicator();
      this.handleAIResponse(message);
    }, 1500);
  }

  addChatMessage(text, type = 'ai') {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${type}`;

    const avatar = document.createElement('div');
    avatar.className = 'ai-message-avatar';

    if (type === 'ai') {
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      `;
    } else {
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      `;
    }

    const content = document.createElement('div');
    content.className = 'ai-message-content';

    const bubble = document.createElement('div');
    bubble.className = 'ai-message-bubble';
    bubble.textContent = text;

    const time = document.createElement('div');
    time.className = 'ai-message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    content.appendChild(bubble);
    content.appendChild(time);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    const chatArea = document.getElementById('chatArea');
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');

    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message ai typing-indicator';
    typingDiv.innerHTML = `
      <div class="ai-message-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="ai-message-content">
        <div class="ai-typing">
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
        </div>
      </div>
    `;

    chatMessages.appendChild(typingDiv);

    // Scroll to bottom
    const chatArea = document.getElementById('chatArea');
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  handleAIResponse(userMessage) {
    // Demo responses based on user input
    const lowerMessage = userMessage.toLowerCase();

    let response = "I'm your TabKeep AI assistant! I can help you manage tabs, find better deals, and organize your browsing. What would you like me to help you with?";

    if (lowerMessage.includes('deal') || lowerMessage.includes('price') || lowerMessage.includes('cheaper')) {
      response = "I can help you find better deals! When you're on a shopping site like Amazon or eBay, I'll automatically check for cheaper alternatives. Would you like me to search for better prices on your current tab?";
    } else if (lowerMessage.includes('organize') || lowerMessage.includes('sort') || lowerMessage.includes('category')) {
      response = "I'll help organize your tabs! I can group them by:\n\n• Shopping sites\n• Work/Productivity\n• Social media\n• News & Articles\n\nWhich category would you like to focus on?";
    } else if (lowerMessage.includes('resource') || lowerMessage.includes('memory') || lowerMessage.includes('slow')) {
      response = "Let me check your tabs for resource usage... Based on your open tabs, I recommend closing duplicate tabs and pages you haven't used in a while. Would you like me to identify inactive tabs?";
    } else if (lowerMessage.includes('shopping') || lowerMessage.includes('save')) {
      response = "I can save all your shopping tabs to a dedicated bookmark folder called 'Shopping List'. This way you can close them now and come back later. Should I go ahead and save them?";
    } else if (lowerMessage.includes('close') || lowerMessage.includes('clean')) {
      response = "I can help clean up your tabs! You currently have tabs that haven't been active in the last hour. Would you like me to close them or save them first?";
    }

    this.addChatMessage(response, 'ai');
  }

  async bookmarkAllTabs() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });

      // Create a folder with timestamp
      const folderName = `TabKeep - ${new Date().toLocaleString()}`;

      const folder = await chrome.bookmarks.create({
        title: folderName
      });

      // Bookmark all tabs
      for (const tab of tabs) {
        await chrome.bookmarks.create({
          parentId: folder.id,
          title: tab.title,
          url: tab.url
        });
      }

      // Show success feedback
      this.showNotification(`Bookmarked ${tabs.length} tabs`);
    } catch (error) {
      console.error('Error bookmarking tabs:', error);
      this.showNotification('Failed to bookmark tabs', 'error');
    }
  }

  async collapseAllTabs() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const currentTab = tabs.find(tab => tab.active);

      // Close all tabs except the current one
      const tabsToClose = tabs.filter(tab => !tab.active).map(tab => tab.id);

      if (tabsToClose.length > 0) {
        await chrome.tabs.remove(tabsToClose);
        this.showNotification(`Closed ${tabsToClose.length} tabs`);

        // Reload the tabs list
        setTimeout(() => this.loadTabs(), 350);
      } else {
        this.showNotification('Only one tab is open');
      }
    } catch (error) {
      console.error('Error collapsing tabs:', error);
      this.showNotification('Failed to close tabs', 'error');
    }
  }

  showNotification(message, type = 'success') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10B981' : '#EF4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Bookmarks Methods
  openBookmarksView() {
    const mainView = document.getElementById('mainView');
    const bookmarksView = this.bookmarksView;

    // Hide main view, show bookmarks view
    mainView.classList.add('hidden');
    bookmarksView.classList.remove('hidden');

    // Load bookmarks
    this.loadBookmarks();
  }

  closeBookmarksView() {
    const mainView = document.getElementById('mainView');
    const bookmarksView = this.bookmarksView;

    // Show main view, hide bookmarks view
    bookmarksView.classList.add('hidden');
    mainView.classList.remove('hidden');
  }

  async loadBookmarks() {
    try {
      const { bookmarks = [] } = await chrome.storage.sync.get('bookmarks');

      // Filter bookmarks based on search query
      let filteredBookmarks = [...bookmarks];

      if (this.searchQuery) {
        filteredBookmarks = bookmarks.filter(bookmark => {
          const titleMatch = bookmark.title.toLowerCase().includes(this.searchQuery);
          const urlMatch = bookmark.url.toLowerCase().includes(this.searchQuery);
          return titleMatch || urlMatch;
        });
      }

      // Sort by most recent first
      filteredBookmarks.sort((a, b) => b.timestamp - a.timestamp);

      // Render bookmarks
      this.renderBookmarks(filteredBookmarks);

      // Update stats
      this.updateBookmarkStats(bookmarks);

      // Update bookmark count in header
      document.getElementById('bookmarkCount').textContent = bookmarks.length;
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      this.showNotification('Failed to load bookmarks', 'error');
    }
  }

  renderBookmarks(bookmarks) {
    if (bookmarks.length === 0) {
      this.bookmarksEmpty.classList.remove('hidden');
      this.bookmarksGrid.classList.add('hidden');

      // Update empty state message based on search
      const emptyTitle = this.bookmarksEmpty.querySelector('.bookmarks-empty-title');
      const emptyText = this.bookmarksEmpty.querySelector('.bookmarks-empty-text');

      if (this.searchQuery) {
        emptyTitle.textContent = 'No results found';
        emptyText.textContent = `No bookmarks match "${this.searchQuery}". Try a different search term.`;
      } else {
        emptyTitle.textContent = 'No bookmarks yet';
        emptyText.textContent = 'Bookmark tabs to save them for later. They\'ll sync across all your devices!';
      }

      return;
    }

    this.bookmarksEmpty.classList.add('hidden');
    this.bookmarksGrid.classList.remove('hidden');

    this.bookmarksGrid.innerHTML = '';

    bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      this.bookmarksGrid.appendChild(card);
    });
  }

  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';

    // Favicon
    const favicon = document.createElement('div');
    favicon.className = 'bookmark-favicon';

    if (bookmark.favIconUrl && !bookmark.favIconUrl.includes('chrome://')) {
      const img = document.createElement('img');
      img.src = bookmark.favIconUrl;
      img.alt = '';
      img.onerror = () => {
        favicon.innerHTML = this.getDefaultIcon();
      };
      favicon.appendChild(img);
    } else {
      favicon.innerHTML = this.getDefaultIcon();
    }

    // Info section
    const info = document.createElement('div');
    info.className = 'bookmark-info';

    const title = document.createElement('div');
    title.className = 'bookmark-title';
    title.textContent = bookmark.title || 'Untitled';

    const urlRow = document.createElement('div');
    urlRow.className = 'bookmark-url';

    const domain = document.createElement('span');
    domain.className = 'bookmark-domain';
    domain.textContent = this.formatUrl(bookmark.url);

    const date = document.createElement('span');
    date.className = 'bookmark-date';
    date.textContent = this.formatDate(bookmark.timestamp);

    urlRow.appendChild(domain);
    urlRow.appendChild(date);

    info.appendChild(title);
    info.appendChild(urlRow);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'bookmark-actions';

    const openBtn = document.createElement('button');
    openBtn.className = 'bookmark-action-btn';
    openBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    `;
    openBtn.title = 'Open bookmark';
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: bookmark.url });
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'bookmark-action-btn remove';
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    `;
    removeBtn.title = 'Remove bookmark';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeBookmark(bookmark.id, card);
    });

    actions.appendChild(openBtn);
    actions.appendChild(removeBtn);

    card.appendChild(favicon);
    card.appendChild(info);
    card.appendChild(actions);

    // Click to open bookmark
    card.addEventListener('click', () => {
      chrome.tabs.create({ url: bookmark.url });
    });

    return card;
  }

  async removeBookmark(bookmarkId, cardElement) {
    try {
      const { bookmarks = [] } = await chrome.storage.sync.get('bookmarks');

      // Remove bookmark from array
      const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);

      // Save back to storage
      await chrome.storage.sync.set({ bookmarks: updatedBookmarks });

      // Animate removal
      cardElement.classList.add('removing');
      setTimeout(() => {
        // Reload bookmarks
        this.loadBookmarks();
      }, 350);

      this.showNotification('Bookmark removed');
    } catch (error) {
      console.error('Error removing bookmark:', error);
      this.showNotification('Failed to remove bookmark', 'error');
    }
  }

  async syncBookmarks() {
    // Add sync animation to button
    const syncBtn = document.getElementById('syncBtn');
    syncBtn.classList.add('syncing');

    try {
      // Reload bookmarks from sync storage
      await this.loadBookmarks();

      this.showNotification('Bookmarks synced!');
    } catch (error) {
      console.error('Error syncing bookmarks:', error);
      this.showNotification('Sync failed', 'error');
    } finally {
      setTimeout(() => {
        syncBtn.classList.remove('syncing');
      }, 1000);
    }
  }

  updateBookmarkStats(bookmarks) {
    // Total bookmarks
    document.getElementById('totalBookmarks').textContent = bookmarks.length;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Less than 1 week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }

    // More than 1 week - show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Avatar Management Methods
  async loadAvatar() {
    try {
      // Get avatar from chrome.storage.sync (syncs from web dashboard)
      const { userAvatar } = await chrome.storage.sync.get('userAvatar');

      if (userAvatar && typeof getAvatarById === 'function') {
        const avatarSVG = getAvatarById(userAvatar);
        if (avatarSVG) {
          this.updateAvatarDisplay(avatarSVG);
        }
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  }

  updateAvatarDisplay(avatarSVG) {
    // Replace the img with a div containing the SVG
    this.avatarContainer.innerHTML = `
      <div class="avatar pixel-avatar" style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(255, 255, 255, 0.1);">
        ${avatarSVG}
      </div>
    `;
  }

  setupAvatarSync() {
    // Listen for storage changes (from web dashboard)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.userAvatar) {
        const newAvatarId = changes.userAvatar.newValue;
        if (newAvatarId && typeof getAvatarById === 'function') {
          const avatarSVG = getAvatarById(newAvatarId);
          if (avatarSVG) {
            this.updateAvatarDisplay(avatarSVG);
          }
        }
      }
    });

    // Listen for messages from the dashboard (via BroadcastChannel simulation)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AVATAR_UPDATED' && message.avatarId) {
        // Store in chrome.storage.sync for persistence
        chrome.storage.sync.set({ userAvatar: message.avatarId });

        // Update display
        if (typeof getAvatarById === 'function') {
          const avatarSVG = getAvatarById(message.avatarId);
          if (avatarSVG) {
            this.updateAvatarDisplay(avatarSVG);
          }
        }
      }
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TabKeepPopup();
});
