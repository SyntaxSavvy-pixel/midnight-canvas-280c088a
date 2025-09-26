class TabIndicator {
    constructor() {
        this.container = null;
        this.timerId = null;
        this.init();
    }

    init() {

        if (!this.shouldInitialize()) return;

        this.createIndicatorContainer();
        this.setupMessageListener();
    }

    shouldInitialize() {
        const url = window.location.href;
        return !url.startsWith('chrome://') &&
               !url.startsWith('chrome-extension://') &&
               !url.startsWith('moz-extension://') &&
               !url.startsWith('about:') &&
               !url.includes('buy.stripe.com') &&
               !url.includes('checkout.stripe.com');
    }

    createIndicatorContainer() {

        const existing = document.getElementById('tabmangment-indicators');
        if (existing) {
            existing.remove();
        }

        try {
            this.container = document.createElement('div');
            if (!this.container) {

                return;
            }

            this.container.id = 'tabmangment-indicators';
            this.container.style.cssText = `
                position: fixed;
                top: 16px;
                right: 16px;
                z-index: 2147483647;
                pointer-events: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                font-size: 13px;
                line-height: 1;
            `;
        } catch (error) {

            return;
        }

        if (document.body) {
            document.body.appendChild(this.container);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    document.body.appendChild(this.container);
                }
            });
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                this.handleMessage(message, sender, sendResponse);
            } catch (error) {

                sendResponse({ success: false, error: error.message });
            }
            return true;
        });
    }

    handleMessage(message, sender, sendResponse) {
        const { action } = message;

        switch (action) {
            case 'showActiveIndicator':
                this.showActiveIndicator();
                sendResponse({ success: true });
                break;

            case 'hideActiveIndicator':
                this.hideActiveIndicator();
                sendResponse({ success: true });
                break;

            case 'showTimerIndicator':
                this.showTimerIndicator(message.duration, message.endTime);
                sendResponse({ success: true });
                break;

            case 'hideTimerIndicator':
                this.hideTimerIndicator();
                sendResponse({ success: true });
                break;

            case 'getPageInfo':
                const info = this.getPageInfo();
                sendResponse({ success: true, data: info });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action: ' + action });
        }
    }

    getPageInfo() {
        return {
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            favicon: this.getFaviconUrl()
        };
    }

    getFaviconUrl() {
        const links = document.querySelectorAll('link[rel*="icon"]');
        for (const link of links) {
            if (link.href && !link.href.includes('data:')) {
                return link.href;
            }
        }
        return `${window.location.origin}/favicon.ico`;
    }

    showActiveIndicator() {
        if (!this.container) return;

        this.hideActiveIndicator();

        const indicator = document.createElement('div');
        indicator.id = 'tabmangment-active';
        indicator.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            margin-bottom: 8px;
            opacity: 0;
            transform: translateX(24px) scale(0.95);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 8px; height: 8px; background: #34d399; border-radius: 50%; box-shadow: 0 0 4px rgba(52, 211, 153, 0.5);"></div>
                <span>Active Tab</span>
            </div>
        `;

        this.container.appendChild(indicator);

        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
            indicator.style.transform = 'translateX(0) scale(1)';
        });
    }

    hideActiveIndicator() {
        const indicator = document.getElementById('tabmangment-active');
        if (indicator) {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateX(24px) scale(0.95)';
            setTimeout(() => indicator.remove(), 150);
        }
    }

    showTimerIndicator(duration, endTime) {
        if (!this.container) return;

        this.hideTimerIndicator();

        const timer = document.createElement('div');
        timer.id = 'tabmangment-timer';
        timer.style.cssText = `
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            margin-bottom: 8px;
            opacity: 0;
            transform: translateX(24px) scale(0.95);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            min-width: 120px;
        `;

        this.container.appendChild(timer);

        this.startCountdown(timer, endTime || (Date.now() + duration));

        requestAnimationFrame(() => {
            timer.style.opacity = '1';
            timer.style.transform = 'translateX(0) scale(1)';
        });
    }

    hideTimerIndicator() {
        const timer = document.getElementById('tabmangment-timer');
        if (timer) {
            timer.style.opacity = '0';
            timer.style.transform = 'translateX(24px) scale(0.95)';
            setTimeout(() => timer.remove(), 150);
        }

        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    startCountdown(element, endTime) {
        const updateTimer = () => {
            const remaining = Math.max(0, endTime - Date.now());

            if (remaining <= 0) {
                element.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; animation: pulse 1s infinite;"></div>
                        <span>Closing...</span>
                    </div>
                `;

                if (!document.getElementById('tabmangment-pulse-style')) {
                    const style = document.createElement('style');
                    style.id = 'tabmangment-pulse-style';
                    style.textContent = `
                        @keyframes pulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.5; transform: scale(1.1); }
                        }
                    `;
                    document.head.appendChild(style);
                }

                clearInterval(this.timerId);
                return;
            }

            const timeText = this.formatTime(remaining);
            element.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 8px; height: 8px; background: #fbbf24; border-radius: 50%;"></div>
                    <span>Closes in ${timeText}</span>
                </div>
            `;
        };

        updateTimer();
        this.timerId = setInterval(updateTimer, 1000);
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const days = Math.floor(totalSeconds / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

const tabIndicator = new TabIndicator();

let currentUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;

        try {
            chrome.runtime.sendMessage({
                action: 'urlChanged',
                url: currentUrl,
                title: document.title
            });
        } catch (error) {

        }
    }
});

if (document.body) {
    urlObserver.observe(document.body, {
        subtree: true,
        childList: true
    });
}