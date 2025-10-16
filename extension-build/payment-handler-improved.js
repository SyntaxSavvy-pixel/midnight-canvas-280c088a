// Improved payment handling with better persistence and your custom payment link
// This replaces the payment handling functions in popup.js

class ImprovedPaymentHandler {
    constructor() {
        this.CUSTOM_PAYMENT_URL = 'https://buy.stripe.com/dRm5kEgDE1R29cPgM84Rq00';
        this.API_BASE = 'https://tabmangment-extension-g0fzfah7b-kavon-hicks-projects.vercel.app/api';
        this.storageKeys = {
            PAYMENT_PENDING: 'payment_pending',
            PAYMENT_SUCCESS: 'payment_success',
            USER_EMAIL: 'userEmail',
            IS_PREMIUM: 'isPremium',
            SUBSCRIPTION_DATA: 'subscriptionData',
            CHECKOUT_SESSION: 'checkoutSession'
        };
    }

    // Enhanced payment initiation - works for ANY user (email or unique ID)
    async initiatePayment(userIdentifier) {
        try {

            // Store pending payment data for ANY user
            const pendingPayment = {
                userIdentifier: userIdentifier,
                email: userIdentifier, // Keep for backward compatibility
                initiatedAt: new Date().toISOString(),
                paymentUrl: this.CUSTOM_PAYMENT_URL,
                method: 'custom_stripe_link',
                status: 'pending',
                isAnonymousUser: !userIdentifier.includes('@')
            };

            await chrome.storage.local.set({
                [this.storageKeys.PAYMENT_PENDING]: pendingPayment,
                [this.storageKeys.USER_EMAIL]: userIdentifier,
                userIdentifier: userIdentifier
            });

            // Option 1: Use your custom payment link directly (Recommended)
            if (this.shouldUseCustomLink()) {
                const customUrl = await this.buildCustomPaymentURL(userIdentifier);

                // Open payment in new tab
                await chrome.tabs.create({
                    url: customUrl,
                    active: true
                });

                // Start monitoring for payment completion
                this.startPaymentMonitoring(userIdentifier);

                return {
                    success: true,
                    method: 'custom_link',
                    url: customUrl
                };
            }

            // Option 2: Use API to create session (Fallback)
            return await this.createCheckoutSession(userEmail);

        } catch (error) {
            throw error;
        }
    }

    // Build custom payment URL with user data (works for email or unique ID)
    async buildCustomPaymentURL(userIdentifier) {
        const url = new URL(this.CUSTOM_PAYMENT_URL);

        // Add email/identifier prefill (only if it looks like an email)
        if (userIdentifier.includes('@')) {
            url.searchParams.set('prefilled_email', userIdentifier);
        }

        // Add client reference for tracking - works with any identifier
        const clientRef = `ext_${Date.now()}_${userIdentifier.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`;
        url.searchParams.set('client_reference_id', clientRef);

        // Store client reference for later matching
        await chrome.storage.local.set({
            client_reference_id: clientRef,
            payment_client_ref: clientRef
        });

        return url.toString();
    }

    // Determine if we should use custom link vs API
    shouldUseCustomLink() {
        // Always prefer custom link for consistency
        return true;
    }

    // Fallback: Create checkout session via API
    async createCheckoutSession(userEmail) {
        try {
            const response = await fetch(`${this.API_BASE}/create-checkout-improved`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: userEmail,
                    useCustomLink: false, // Force API session creation
                    returnToExtension: true
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            // Store session data
            await chrome.storage.local.set({
                [this.storageKeys.CHECKOUT_SESSION]: {
                    sessionId: data.sessionId,
                    url: data.url,
                    customerId: data.customerId,
                    email: userEmail,
                    createdAt: new Date().toISOString()
                }
            });

            // Open checkout in new tab
            await chrome.tabs.create({
                url: data.url,
                active: true
            });

            // Start monitoring
            this.startPaymentMonitoring(userEmail);

            return {
                success: true,
                method: 'api_session',
                ...data
            };

        } catch (error) {
            throw error;
        }
    }

    // Enhanced payment monitoring with better persistence
    startPaymentMonitoring(userEmail) {

        // Check for payment success every 5 seconds
        const checkInterval = setInterval(async () => {
            try {
                const isComplete = await this.checkPaymentCompletion(userEmail);
                if (isComplete) {
                    clearInterval(checkInterval);
                    await this.handlePaymentSuccess(userEmail);
                }
            } catch (error) {
            }
        }, 5000);

        // Stop monitoring after 30 minutes
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 30 * 60 * 1000);

        // Also monitor for browser storage changes (from success page)
        this.monitorStorageChanges();
    }

    // Check payment completion via multiple methods
    async checkPaymentCompletion(userEmail) {
        try {
            // Method 1: Check local storage for success flag
            const localStorage = await chrome.storage.local.get([
                this.storageKeys.PAYMENT_SUCCESS,
                'tabmangment_payment_success'
            ]);

            if (localStorage[this.storageKeys.PAYMENT_SUCCESS] && !localStorage[this.storageKeys.PAYMENT_SUCCESS].processed) {
                return true;
            }

            // Method 2: Check API for subscription status
            const response = await fetch(`${this.API_BASE}/check-status?email=${encodeURIComponent(userEmail)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.isPro && data.status === 'active') {
                    return true;
                }
            }

            // Method 3: Check for Stripe webhook updates
            const webhookData = await chrome.storage.local.get(['stripe_webhook_received']);
            if (webhookData.stripe_webhook_received &&
                webhookData.stripe_webhook_received.email === userEmail) {
                return true;
            }

            return false;

        } catch (error) {
            return false;
        }
    }

    // Handle successful payment completion - IMMEDIATE PRO ACTIVATION
    async handlePaymentSuccess(userEmail) {
        try {

            // IMMEDIATE PRO ACTIVATION - Using the working formula
            const proActivationData = {
                isPremium: true,
                subscriptionActive: true,
                planType: 'pro',
                activatedAt: new Date().toISOString(),
                nextBillingDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
                subscriptionId: 'paid_' + Date.now(),
                paymentConfirmed: true,
                userEmail: userEmail,
                activatedBy: 'payment_handler',
                features: ['unlimited_tabs', 'advanced_management', 'premium_themes', 'export_features']
            };

            await chrome.storage.local.set({
                ...proActivationData,
                [this.storageKeys.SUBSCRIPTION_DATA]: proActivationData
            });

            // Mark payment as processed
            const paymentSuccess = await chrome.storage.local.get([this.storageKeys.PAYMENT_SUCCESS]);
            if (paymentSuccess[this.storageKeys.PAYMENT_SUCCESS]) {
                await chrome.storage.local.set({
                    [this.storageKeys.PAYMENT_SUCCESS]: {
                        ...paymentSuccess[this.storageKeys.PAYMENT_SUCCESS],
                        processed: true,
                        processedAt: new Date().toISOString()
                    }
                });
            }

            // Clean up pending payment data
            await chrome.storage.local.remove([this.storageKeys.PAYMENT_PENDING]);

            // Notify user
            this.showSuccessNotification();

            // Trigger UI update
            if (window.location.hash === '#popup') {
                window.location.reload();
            }


        } catch (error) {
        }
    }

    // Monitor storage changes from other contexts (like success page)
    monitorStorageChanges() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes[this.storageKeys.PAYMENT_SUCCESS]) {
                const newValue = changes[this.storageKeys.PAYMENT_SUCCESS].newValue;
                if (newValue && !newValue.processed) {
                    this.handlePaymentSuccess(newValue.email);
                }
            }
        });
    }

    // Calculate next billing date
    calculateNextBilling() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        return nextMonth.getTime();
    }

    // Show success notification
    showSuccessNotification() {
        // Notification removed
    }

    // Check for existing payment on extension startup
    async checkExistingPayment() {
        try {
            const storage = await chrome.storage.local.get([
                this.storageKeys.PAYMENT_PENDING,
                this.storageKeys.PAYMENT_SUCCESS,
                this.storageKeys.USER_EMAIL,
                this.storageKeys.IS_PREMIUM
            ]);

            // If payment is pending, resume monitoring
            if (storage[this.storageKeys.PAYMENT_PENDING]) {
                const pending = storage[this.storageKeys.PAYMENT_PENDING];
                const timeSince = Date.now() - new Date(pending.initiatedAt).getTime();

                // Resume monitoring if payment was initiated recently (within 1 hour)
                if (timeSince < 60 * 60 * 1000) {
                    this.startPaymentMonitoring(pending.email);
                }
            }

            // Process unprocessed successful payments
            if (storage[this.storageKeys.PAYMENT_SUCCESS] && !storage[this.storageKeys.PAYMENT_SUCCESS].processed) {
                await this.handlePaymentSuccess(storage[this.storageKeys.PAYMENT_SUCCESS].email);
            }

        } catch (error) {
        }
    }
}

// Export for use in popup.js
if (typeof window !== 'undefined') {
    window.ImprovedPaymentHandler = ImprovedPaymentHandler;
}

// Initialize on load
if (typeof chrome !== 'undefined' && chrome.storage) {
    const paymentHandler = new ImprovedPaymentHandler();
    paymentHandler.checkExistingPayment();
}