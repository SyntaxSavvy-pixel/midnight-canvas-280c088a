// Stripe Pro Plan Integration
// Handles checkout, webhooks, and Pro feature unlocking

class StripeProIntegration {
    constructor() {
        // Stripe configuration - values set via environment variables
        this.STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
        this.PRO_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_placeholder';
        this.API_BASE_URL = 'https://tabmangment.netlify.app';

        // Initialize Stripe
        this.stripe = null;

        // User identification
        this.userId = null;
        this.userEmail = null;

        this.init();
    }

    async init() {
        await this.identifyUser();
        await this.checkUserPlan();
        this.setupEventListeners();
    }

    // Identify the current user - simplified approach
    async identifyUser() {
        // Simple user ID generation - no complex email detection
        this.userId = this.generateUserId();
        this.userEmail = null; // Let user enter email during checkout

        // User ID generated silently for production
    }

    // Generate unique user ID
    generateUserId() {
        const stored = localStorage.getItem('tabmangment_user_id');
        if (stored) return stored;

        const newId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('tabmangment_user_id', newId);
        return newId;
    }

    // Setup event listeners for upgrade buttons
    setupEventListeners() {
        // Listen for upgrade button clicks
        const upgradeButtons = document.querySelectorAll('#premium-btn, .upgrade-btn, .pro-btn');
        upgradeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.initiateCheckout();
            });
        });

        // Listen for storage changes (Pro activation)
        if (chrome && chrome.storage) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.isPremium) {
                    this.handleProActivation(changes.isPremium.newValue);
                }
            });
        }
    }

    // Initiate Stripe checkout
    async initiateCheckout() {
        try {
            console.log('🚀 Starting Stripe checkout...');

            // Show loading state
            this.showCheckoutLoading(true);

            // Create checkout session with updated API
            console.log('🔗 Creating session with:', {
                priceId: this.PRO_PRICE_ID,
                userId: this.userId,
                userEmail: this.userEmail || '',
                apiUrl: `${this.API_BASE_URL}/api/create-checkout-session`
            });

            const sessionResponse = await fetch(`${this.API_BASE_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: this.PRO_PRICE_ID,
                    userId: this.userId,
                    userEmail: this.userEmail || '',
                    successUrl: `https://tabmangment.netlify.app/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `https://tabmangment.netlify.app/`
                })
            });

            if (!sessionResponse.ok) {
                const errorText = await sessionResponse.text();
                console.error('❌ API Error:', sessionResponse.status, errorText);
                throw new Error(`Failed to create checkout session: ${sessionResponse.status} - ${errorText}`);
            }

            const session = await sessionResponse.json();

            // Redirect directly to Stripe Checkout URL
            if (session.url) {
                console.log('✅ Redirecting to Stripe checkout:', session.url);
                window.location.href = session.url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error) {
            console.error('❌ Checkout failed:', error);

            // Show more helpful error message
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Unable to connect to payment server. Please check your internet connection.';
            } else if (error.message.includes('404')) {
                errorMessage = 'Payment API not found. Please contact support.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Payment server error. Please try again later.';
            }

            this.showCheckoutError(errorMessage);
            this.showCheckoutLoading(false);
        }
    }

    // Check user's current plan status
    async checkUserPlan() {
        try {
            // Checking user plan status

            // Check with API first (uses KV database)
            const response = await fetch(`${this.API_BASE_URL}/api/me`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    userEmail: this.userEmail
                })
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('📊 User plan data from API:', userData);

                if (userData.plan === 'pro' && userData.active && userData.isPro) {
                    await this.activateProFeatures(userData);
                } else {
                    await this.deactivateProFeatures();
                }

                return userData;
            } else {
                console.warn('⚠️ API check failed, using local storage fallback');
                return await this.checkLocalProStatus();
            }

        } catch (error) {
            console.error('❌ Failed to check user plan:', error);
            // Fallback to local storage
            return await this.checkLocalProStatus();
        }
    }

    // Fallback: check local Pro status
    async checkLocalProStatus() {
        try {
            if (chrome && chrome.storage) {
                const result = await chrome.storage.local.get(['isPremium', 'subscriptionActive']);
                if (result.isPremium && result.subscriptionActive) {
                    await this.activateProFeatures({
                        plan: 'pro',
                        active: true,
                        source: 'local_storage'
                    });
                    return { plan: 'pro', active: true, source: 'local_storage' };
                }
            }
        } catch (error) {
            console.error('Local Pro status check failed:', error);
        }

        return { plan: 'free', active: false };
    }

    // Activate Pro features
    async activateProFeatures(userData = {}) {
        try {
            console.log('🎉 Activating Pro features...');

            const proData = {
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                activatedAt: new Date().toISOString(),
                userId: this.userId,
                userEmail: this.userEmail,
                customerId: userData.customerId,
                subscriptionId: userData.subscriptionId,
                subscriptionStatus: userData.subscriptionStatus,
                currentPeriodEnd: userData.currentPeriodEnd,
                nextBillingDate: userData.currentPeriodEnd,
                subscriptionData: userData,
                lastChecked: Date.now()
            };

            // Store in Chrome extension storage
            if (chrome && chrome.storage) {
                await chrome.storage.local.set(proData);
            }

            // Store in localStorage as backup
            localStorage.setItem('tabmangment_pro_status', JSON.stringify(proData));

            // Update UI
            this.updateUIForPro();

            // Show success notification
            this.showProActivatedNotification();

            console.log('✅ Pro features activated successfully');

        } catch (error) {
            console.error('❌ Failed to activate Pro features:', error);
        }
    }

    // Deactivate Pro features
    async deactivateProFeatures() {
        try {
            const freeData = {
                isPremium: false,
                subscriptionActive: false,
                planType: 'free'
            };

            if (chrome && chrome.storage) {
                await chrome.storage.local.set(freeData);
            }

            localStorage.removeItem('tabmangment_pro_status');
            this.updateUIForFree();

        } catch (error) {
            console.error('❌ Failed to deactivate Pro features:', error);
        }
    }

    // Update UI for Pro users
    updateUIForPro() {
        // Update plan indicator
        const planIndicator = document.getElementById('plan-indicator');
        if (planIndicator) {
            planIndicator.className = 'plan-indicator pro-plan';
            planIndicator.innerHTML = `
                <div class="plan-badge">PRO PLAN</div>
                <div class="plan-description">All features unlocked</div>
            `;
        }

        // Update premium button
        const premiumBtn = document.getElementById('premium-btn');
        if (premiumBtn) {
            const btnText = premiumBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Manage Pro';
            premiumBtn.classList.add('pro-active');
        }

        // Enable Pro features
        const proFeatures = document.querySelectorAll('.pro-feature, .premium-feature');
        proFeatures.forEach(feature => {
            feature.classList.remove('disabled');
            feature.classList.add('enabled');
        });

        // Remove Pro badges/locks
        const proBadges = document.querySelectorAll('.pro-badge, .premium-badge');
        proBadges.forEach(badge => badge.remove());
    }

    // Update UI for free users
    updateUIForFree() {
        const planIndicator = document.getElementById('plan-indicator');
        if (planIndicator) {
            planIndicator.className = 'plan-indicator free-plan';
            planIndicator.innerHTML = `
                <div class="plan-badge">FREE PLAN</div>
                <div class="plan-description">Limited features</div>
            `;
        }

        const premiumBtn = document.getElementById('premium-btn');
        if (premiumBtn) {
            const btnText = premiumBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Upgrade Pro';
            premiumBtn.classList.remove('pro-active');
        }
    }

    // Handle Pro activation event
    handleProActivation(isPremium) {
        if (isPremium) {
            this.updateUIForPro();
            this.showProActivatedNotification();
        } else {
            this.updateUIForFree();
        }
    }

    // Show checkout loading state
    showCheckoutLoading(loading) {
        const upgradeButtons = document.querySelectorAll('#premium-btn, .upgrade-btn');
        upgradeButtons.forEach(button => {
            if (loading) {
                button.disabled = true;
                button.textContent = 'Loading...';
            } else {
                button.disabled = false;
                const btnText = button.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Upgrade Pro';
            }
        });
    }

    // Show checkout error
    showCheckoutError(message) {
        alert('Checkout Error: ' + message);
    }

    // Show Pro activated notification
    showProActivatedNotification() {
        // Notification removed
    }

    // Public method to manually refresh user status
    async refreshUserStatus() {
        await this.checkUserPlan();
    }

    // Public method to check if user is Pro
    async isUserPro() {
        try {
            if (chrome && chrome.storage) {
                const result = await chrome.storage.local.get(['isPremium', 'subscriptionActive']);
                return result.isPremium && result.subscriptionActive;
            }

            const proStatus = localStorage.getItem('tabmangment_pro_status');
            if (proStatus) {
                const data = JSON.parse(proStatus);
                return data.isPremium && data.subscriptionActive;
            }

            return false;
        } catch (error) {
            console.error('Failed to check Pro status:', error);
            return false;
        }
    }
}

// Initialize Stripe integration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.stripeProIntegration = new StripeProIntegration();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.stripeProIntegration = new StripeProIntegration();
    });
} else {
    window.stripeProIntegration = new StripeProIntegration();
}