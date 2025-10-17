/**
 * Enhanced Authentication System for Tabmangment
 * Handles user registration, login, and session management
 */

class AuthSystem {
    constructor() {
        this.baseURL = 'https://tabmangment.netlify.app/api';
        this.currentUser = null;
        this.authToken = localStorage.getItem('tabmangment_token');
        this.init();
    }

    async init() {
        // Check if user is already logged in
        if (this.authToken) {
            await this.validateSession();
        }
        this.updateUI();
    }

    /**
     * Register a new user
     */
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userData.email,
                    password: userData.password,
                    name: userData.name,
                    plan: userData.plan || 'free'
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.authToken = result.token;
                this.currentUser = result.user;
                localStorage.setItem('tabmangment_token', this.authToken);
                localStorage.setItem('tabmangment_user', JSON.stringify(this.currentUser));

                this.updateUI();
                this.showNotification('Registration successful! Welcome to Tabmangment.', 'success');

                // Redirect based on plan
                if (userData.plan === 'pro' || userData.plan === 'enterprise') {
                    window.location.href = '/payment-checkout.html?plan=' + userData.plan;
                } else {
                    window.location.href = '/user-dashboard.html';
                }

                return { success: true, user: this.currentUser };
            } else {
                throw new Error(result.message || 'Registration failed');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * Login existing user
     */
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                this.authToken = result.token;
                this.currentUser = result.user;
                localStorage.setItem('tabmangment_token', this.authToken);
                localStorage.setItem('tabmangment_user', JSON.stringify(this.currentUser));

                this.updateUI();
                this.showNotification('Login successful! Welcome back.', 'success');

                // Redirect to dashboard
                window.location.href = '/user-dashboard.html';

                return { success: true, user: this.currentUser };
            } else {
                throw new Error(result.message || 'Login failed');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            if (this.authToken) {
                await fetch(`${this.baseURL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`,
                    }
                });
            }
        } catch (error) {
        } finally {
            this.authToken = null;
            this.currentUser = null;
            localStorage.removeItem('tabmangment_token');
            localStorage.removeItem('tabmangment_user');
            this.updateUI();
            window.location.href = '/landing.html';
        }
    }

    /**
     * Validate current session
     */
    async validateSession() {
        try {
            const response = await fetch(`${this.baseURL}/validate-session`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.currentUser = result.user;
                localStorage.setItem('tabmangment_user', JSON.stringify(this.currentUser));
                return true;
            } else {
                // Invalid session
                this.logout();
                return false;
            }
        } catch (error) {
            this.logout();
            return false;
        }
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        if (!this.currentUser && localStorage.getItem('tabmangment_user')) {
            this.currentUser = JSON.parse(localStorage.getItem('tabmangment_user'));
        }
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.authToken && !!this.currentUser;
    }

    /**
     * Get user's subscription status
     */
    getSubscriptionStatus() {
        const user = this.getCurrentUser();
        return user ? user.subscription || 'free' : 'free';
    }

    /**
     * Check if user has pro features
     */
    hasPro() {
        const status = this.getSubscriptionStatus();
        return status === 'pro' || status === 'enterprise';
    }

    /**
     * Update UI based on authentication status
     */
    updateUI() {
        const authButtons = document.querySelector('.auth-buttons');
        const userMenu = document.querySelector('.user-menu');

        if (this.isAuthenticated()) {
            if (authButtons) {
                authButtons.innerHTML = `
                    <div class="user-menu">
                        <span class="user-name">Welcome, ${this.currentUser.name}</span>
                        <div class="dropdown">
                            <button class="btn btn-outline dropdown-toggle">
                                ${this.currentUser.name}
                            </button>
                            <div class="dropdown-menu">
                                <a href="/user-dashboard.html">Dashboard</a>
                                <a href="/profile.html">Profile</a>
                                <a href="/subscription.html">Subscription</a>
                                <hr>
                                <a href="#" onclick="authSystem.logout()">Logout</a>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            if (authButtons) {
                authButtons.innerHTML = `
                    <a href="/new-authentication" class="btn btn-outline">Sign In</a>
                    <a href="/new-authentication?mode=signup" class="btn btn-primary">Get Started</a>
                `;
            }
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.auth-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `auth-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Password reset functionality
     */
    async requestPasswordReset(email) {
        try {
            const response = await fetch(`${this.baseURL}/request-password-reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('Password reset email sent! Check your inbox.', 'success');
                return { success: true };
            } else {
                throw new Error(result.message || 'Password reset failed');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    /**
     * Social login (Google, GitHub, etc.)
     */
    async socialLogin(provider) {
        try {
            window.location.href = `${this.baseURL}/auth/${provider}`;
        } catch (error) {
            this.showNotification(`${provider} login failed`, 'error');
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userData) {
        try {
            const response = await fetch(`${this.baseURL}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                this.currentUser = { ...this.currentUser, ...result.user };
                localStorage.setItem('tabmangment_user', JSON.stringify(this.currentUser));
                this.updateUI();
                this.showNotification('Profile updated successfully!', 'success');
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(result.message || 'Profile update failed');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }
}

// Initialize global auth system
const authSystem = new AuthSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}

// Add CSS for notifications and user menu
const authStyles = `
<style>
.auth-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease-out;
}

.notification-success {
    background: #10b981;
    color: white;
}

.notification-error {
    background: #ef4444;
    color: white;
}

.notification-info {
    background: #3b82f6;
    color: white;
}

.notification-content {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notification-content button {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    margin-left: 16px;
}

.user-menu {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
}

.dropdown {
    position: relative;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    min-width: 200px;
    display: none;
    z-index: 1000;
}

.dropdown:hover .dropdown-menu {
    display: block;
}

.dropdown-menu a {
    display: block;
    padding: 12px 16px;
    text-decoration: none;
    color: #374151;
    border-bottom: 1px solid #f3f4f6;
}

.dropdown-menu a:hover {
    background: #f9fafb;
    color: #3b82f6;
}

.dropdown-menu hr {
    margin: 0;
    border: none;
    border-top: 1px solid #e5e7eb;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@media (max-width: 768px) {
    .auth-notification {
        left: 20px;
        right: 20px;
        max-width: none;
    }

    .user-menu {
        flex-direction: column;
        gap: 0.5rem;
    }

    .user-name {
        display: none;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', authStyles);