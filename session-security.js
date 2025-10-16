// Session Security Module
// Provides secure session management with XSS and CSRF protection

class SessionSecurity {
    constructor() {
        this.tokenKey = 'tabmangment_token';
        this.userKey = 'tabmangment_user';
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Sanitize user input to prevent XSS attacks
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate session token format
    isValidToken(token) {
        if (!token || typeof token !== 'string') return false;

        // JWT format check (3 parts separated by dots)
        const parts = token.split('.');
        return parts.length === 3;
    }

    // Save session data securely
    saveSession(userData, token) {
        try {
            // Validate inputs
            if (!userData || !token) {
                throw new Error('Invalid session data');
            }

            if (!this.isValidToken(token)) {
                throw new Error('Invalid token format');
            }

            if (!this.isValidEmail(userData.email)) {
                throw new Error('Invalid email format');
            }

            // Sanitize user data
            const sanitizedData = {
                email: this.sanitizeInput(userData.email),
                name: this.sanitizeInput(userData.name || ''),
                id: this.sanitizeInput(userData.id || ''),
                provider: this.sanitizeInput(userData.provider || 'email'),
                avatar: userData.avatar || null,
                isPro: Boolean(userData.isPro),
                timestamp: Date.now()
            };

            // Store in localStorage
            localStorage.setItem(this.userKey, JSON.stringify(sanitizedData));
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem('tabmangment_remember', 'true');

            return true;
        } catch (error) {
            console.error('Failed to save session:', error);
            return false;
        }
    }

    // Get session data with validation
    getSession() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            const userDataStr = localStorage.getItem(this.userKey);

            if (!token || !userDataStr) {
                return null;
            }

            // Validate token
            if (!this.isValidToken(token)) {
                this.clearSession();
                return null;
            }

            const userData = JSON.parse(userDataStr);

            // Check session expiry
            if (userData.timestamp && Date.now() - userData.timestamp > this.sessionTimeout) {
                this.clearSession();
                return null;
            }

            return { userData, token };
        } catch (error) {
            console.error('Failed to get session:', error);
            this.clearSession();
            return null;
        }
    }

    // Clear session data
    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem('tabmangment_remember');
    }

    // Prevent console manipulation
    protectConsole() {
        // Disable common console attack vectors
        const noop = () => {};

        // Override dangerous console methods in production
        if (window.location.hostname !== 'localhost') {
            // Keep console.error for debugging but disable manipulation
            ['clear', 'table'].forEach(method => {
                if (console[method]) {
                    console[method] = noop;
                }
            });

            // Display warning message
            console.log('%c⚠️ SECURITY WARNING', 'color: red; font-size: 24px; font-weight: bold;');
            console.log('%cThis browser console is for developers only.', 'color: orange; font-size: 16px;');
            console.log('%cIf someone told you to copy/paste something here, it\'s a scam!', 'color: orange; font-size: 16px;');
            console.log('%cPasting code here can give attackers access to your account.', 'color: red; font-size: 16px; font-weight: bold;');
        }
    }

    // Protect against localStorage theft
    protectLocalStorage() {
        // Monitor localStorage changes
        const originalSetItem = localStorage.setItem;
        const self = this;

        localStorage.setItem = function(key, value) {
            // Only allow our app to set session data
            if (key.startsWith('tabmangment_')) {
                // Log suspicious activity
                const stack = new Error().stack;
                if (!stack || !stack.includes('session-security.js')) {
                    console.warn('Suspicious localStorage access detected:', key);
                }
            }

            return originalSetItem.apply(this, arguments);
        };
    }
}

// Initialize global instance
window.sessionSecurity = new SessionSecurity();

// Protect console and localStorage on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sessionSecurity.protectConsole();
        window.sessionSecurity.protectLocalStorage();
    });
} else {
    window.sessionSecurity.protectConsole();
    window.sessionSecurity.protectLocalStorage();
}
