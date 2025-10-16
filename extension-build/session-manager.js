// Session Manager - Persistent Authentication
// Keeps users logged in across browser sessions until they explicitly log out

class SessionManager {
    constructor() {
        this.storageKey = 'tabmangment_session';
        this.userKey = 'tabmangment_user';
        this.tokenKey = 'tabmangment_token';
        this.rememberKey = 'tabmangment_remember';
        this.init();
    }

    async init() {
        console.log('🔐 Session Manager initialized');

        // Check if we have a valid session
        const hasSession = this.checkSession();

        if (hasSession) {
            console.log('✅ Valid session found');
            // Keep session alive
            this.keepAlive();
        } else {
            console.log('ℹ️ No active session');
        }

        // Set up periodic session check
        setInterval(() => this.checkSession(), 60000); // Check every minute
    }

    checkSession() {
        try {
            const user = localStorage.getItem(this.userKey);
            const token = localStorage.getItem(this.tokenKey);
            const remember = localStorage.getItem(this.rememberKey);

            // If user chose to be remembered or has valid token, keep them logged in
            if (user && token) {
                // Mark session as active
                localStorage.setItem(this.storageKey, JSON.stringify({
                    active: true,
                    lastCheck: Date.now(),
                    remember: remember === 'true'
                }));
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Session check error:', error);
            return false;
        }
    }

    saveSession(user, token, remember = true) {
        try {
            localStorage.setItem(this.userKey, JSON.stringify(user));
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.rememberKey, remember.toString());
            localStorage.setItem(this.storageKey, JSON.stringify({
                active: true,
                lastCheck: Date.now(),
                remember: remember
            }));

            console.log('✅ Session saved:', user.email, '- Remember:', remember);
        } catch (error) {
            console.error('❌ Save session error:', error);
        }
    }

    clearSession() {
        try {
            localStorage.removeItem(this.userKey);
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.rememberKey);
            localStorage.removeItem(this.storageKey);
            console.log('✅ Session cleared');
        } catch (error) {
            console.error('❌ Clear session error:', error);
        }
    }

    keepAlive() {
        // Update last check timestamp to keep session alive
        try {
            const session = JSON.parse(localStorage.getItem(this.storageKey));
            if (session) {
                session.lastCheck = Date.now();
                localStorage.setItem(this.storageKey, JSON.stringify(session));
            }
        } catch (error) {
            console.error('❌ Keep alive error:', error);
        }
    }

    isLoggedIn() {
        const user = localStorage.getItem(this.userKey);
        const token = localStorage.getItem(this.tokenKey);
        return !!(user && token);
    }

    getUser() {
        try {
            const userStr = localStorage.getItem(this.userKey);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('❌ Get user error:', error);
            return null;
        }
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }
}

// Initialize global session manager
if (typeof window !== 'undefined') {
    window.sessionManager = new SessionManager();

    // Expose helper functions
    window.isLoggedIn = () => window.sessionManager.isLoggedIn();
    window.getCurrentUser = () => window.sessionManager.getUser();
    window.logout = () => {
        window.sessionManager.clearSession();
        // Redirect to auth page with logout flag
        window.location.href = '/new-authentication?logout=true';
    };
}
