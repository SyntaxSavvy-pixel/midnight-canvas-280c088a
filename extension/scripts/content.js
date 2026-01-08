// TabKeep - Content Script
// Runs on all web pages to track activity and communicate with background script

class TabKeepContent {
  constructor() {
    this.activityTimeout = null;
    this.lastActivityTime = Date.now();

    this.init();
  }

  init() {
    console.log('TabKeep content script loaded');

    // Track user activity
    this.trackActivity();

    // Initialize AI Price Comparison
    this.initPriceComparison();

    // Listen for messages from background or popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  initPriceComparison() {
    const shoppingSites = [
      'amazon', 'ebay', 'walmart', 'target', 'bestbuy',
      'etsy', 'aliexpress', 'alibaba', 'shopify', 'wayfair',
      'homedepot', 'lowes', 'macys', 'nordstrom', 'zappos',
      'nike', 'adidas', 'asos', 'shein', 'zara', 'hm.com'
    ];

    const isShoppingSite = shoppingSites.some(site =>
      window.location.hostname.includes(site)
    );

    if (isShoppingSite) {
      // Wait for page to load then show AI widget
      setTimeout(() => this.showAIPriceWidget(), 2000);
    }
  }

  showAIPriceWidget() {
    // Don't show if already exists
    if (document.getElementById('tabkeep-price-widget')) {
      return;
    }

    // Create floating widget
    const widget = document.createElement('div');
    widget.id = 'tabkeep-price-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      color: white;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      max-width: 320px;
      cursor: pointer;
      animation: slideInWidget 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      transition: all 0.2s ease;
    `;

    widget.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">
            TabKeep AI Found Deals!
          </div>
          <div style="font-size: 13px; opacity: 0.95;">
            We found cheaper options for this product
          </div>
        </div>
        <button id="tabkeep-close-widget" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          flex-shrink: 0;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    // Add animation styles
    if (!document.getElementById('tabkeep-widget-styles')) {
      const style = document.createElement('style');
      style.id = 'tabkeep-widget-styles';
      style.textContent = `
        @keyframes slideInWidget {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideOutWidget {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }

        #tabkeep-price-widget:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
        }

        #tabkeep-close-widget:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(widget);

    // Close button handler
    setTimeout(() => {
      document.getElementById('tabkeep-close-widget')?.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.style.animation = 'slideOutWidget 0.3s ease';
        setTimeout(() => widget.remove(), 300);
      });
    }, 100);

    // Widget click handler - open dashboard with AI
    widget.addEventListener('click', () => {
      window.open('https://tabkeep-app.vercel.app/dashboard', '_blank');
    });

    // Auto-hide after 8 seconds
    setTimeout(() => {
      if (widget.parentElement) {
        widget.style.animation = 'slideOutWidget 0.3s ease';
        setTimeout(() => widget.remove(), 300);
      }
    }, 8000);
  }

  trackActivity() {
    // Track various user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.onActivity();
      }, { passive: true });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.onActivity();
      }
    });
  }

  onActivity() {
    this.lastActivityTime = Date.now();

    // Clear existing timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    // Send activity update to background after 1 second of inactivity
    this.activityTimeout = setTimeout(() => {
      this.sendActivityUpdate();
    }, 1000);
  }

  sendActivityUpdate() {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.debug('Extension context invalidated, stopping activity tracking');
      return;
    }

    try {
      chrome.runtime.sendMessage({
        action: 'tabActivity',
        timestamp: this.lastActivityTime,
        url: window.location.href,
        title: document.title
      }).catch(error => {
        // Extension context might be invalidated, ignore
        console.debug('Could not send activity update:', error);
      });
    } catch (error) {
      // Handle synchronous errors
      console.debug('Extension context error:', error);
    }
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'getPageInfo':
        sendResponse({
          url: window.location.href,
          title: document.title,
          lastActivity: this.lastActivityTime
        });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// Initialize content script
new TabKeepContent();
