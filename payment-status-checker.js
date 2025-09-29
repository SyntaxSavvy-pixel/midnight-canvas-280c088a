// Payment Status Checker - Polls backend to check for Pro activation
// This runs in the extension and checks payment status periodically

class PaymentStatusChecker {
  constructor() {
    this.apiBaseUrl = 'https://tabmangment.netlify.app/api';
    this.isChecking = false;
    this.lastCheckTime = 0;
    this.checkInterval = 15000; // Check every 15 seconds initially
    this.maxCheckInterval = 300000; // Max 5 minutes between checks
    this.backoffMultiplier = 1.5;
    this.maxChecks = 40; // Stop after 40 checks (10 minutes)
    this.checkCount = 0;

    // Start checking immediately when extension loads
    this.startPolling();
  }

  async startPolling() {
    console.log('🔄 Starting payment status polling...');

    // Get user email/ID for checking
    const userIdentifier = await this.getUserIdentifier();
    if (!userIdentifier) {
      console.log('⚠️ No user identifier found, skipping payment polling');
      return;
    }

    // Check if already Pro
    const currentStatus = await this.getCurrentProStatus();
    if (currentStatus.isPro) {
      console.log('✅ User already has Pro features, stopping polling');
      return;
    }

    // Start polling loop
    this.pollPaymentStatus(userIdentifier);
  }

  async pollPaymentStatus(userIdentifier) {
    if (this.isChecking) return;
    if (this.checkCount >= this.maxChecks) {
      console.log('⏹️ Max payment status checks reached, stopping');
      return;
    }

    this.isChecking = true;
    this.checkCount++;

    try {
      console.log(`🔍 Payment status check #${this.checkCount} for: ${userIdentifier}`);

      // Try endpoints in order of preference
      const endpoints = [
        { url: `${this.apiBaseUrl}/status?user=${encodeURIComponent(userIdentifier)}`, name: 'status' },
        { url: `${this.apiBaseUrl}/check-payment-status?user=${encodeURIComponent(userIdentifier)}`, name: 'check-payment-status' },
        { url: `${this.apiBaseUrl}/check-status-simple?user=${encodeURIComponent(userIdentifier)}`, name: 'check-status-simple' }
      ];

      let result = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint.name}`);

          const response = await fetch(endpoint.url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            result = await response.json();
            console.log(`✅ Endpoint ${endpoint.name} successful`);
            break;
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (endpointError) {
          console.log(`⚠️ Endpoint ${endpoint.name} failed:`, endpointError.message);
          lastError = endpointError;
          continue;
        }
      }

      if (!result) {
        throw new Error(`All endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`);
      }

      console.log('📊 Payment status response:', result);

      if (result.success && result.isPro) {
        // User has Pro features! Activate them
        await this.activateProFeatures(result);
        console.log('🎉 Pro features activated from payment status check!');
        return; // Stop polling
      }

      // If user not Pro but we're polling with a temp ID, check recent activations
      if (userIdentifier.startsWith('temp_') || userIdentifier.startsWith('fallback_')) {
        console.log('🔍 Checking recent activations for temp user...');
        const recentActivation = await this.checkRecentActivations();
        if (recentActivation) {
          console.log('🎉 Found recent activation! Activating Pro features...');
          await this.activateProFeatures(recentActivation);
          return; // Stop polling
        }
      }

      // User doesn't have Pro yet, continue polling
      console.log(`⏳ User not Pro yet, will check again in ${this.checkInterval/1000}s`);

    } catch (error) {
      console.error('❌ Error checking payment status:', error);
    }

    this.isChecking = false;

    // Schedule next check with backoff
    setTimeout(() => {
      this.checkInterval = Math.min(
        this.checkInterval * this.backoffMultiplier,
        this.maxCheckInterval
      );
      this.pollPaymentStatus(userIdentifier);
    }, this.checkInterval);
  }

  async getCurrentProStatus() {
    try {
      const result = await chrome.storage.local.get([
        'isPremium',
        'subscriptionActive',
        'planType'
      ]);

      return {
        isPro: result.isPremium === true || result.subscriptionActive === true,
        planType: result.planType || 'free'
      };
    } catch (error) {
      console.error('Error getting current Pro status:', error);
      return { isPro: false, planType: 'free' };
    }
  }

  async getUserIdentifier() {
    try {
      // Try to get user email from various sources
      let userIdentifier = null;

      // 1. Check extension storage
      const storage = await chrome.storage.local.get(['userEmail', 'userId']);
      if (storage.userEmail) {
        userIdentifier = storage.userEmail;
      } else if (storage.userId) {
        userIdentifier = storage.userId;
      }

      // 2. Check if there's a recent payment success event
      if (!userIdentifier) {
        console.log('🔍 Checking for payment success events...');

        try {
          // Check main payment success data
          const paymentSuccess = localStorage.getItem('tabmangment_payment_success');
          if (paymentSuccess) {
            const data = JSON.parse(paymentSuccess);
            console.log('💳 Found payment success data:', data);
            if (data.email && data.email.includes('@')) {
              userIdentifier = data.email;
              await chrome.storage.local.set({ userEmail: data.email });
              console.log('✅ Got email from payment success:', userIdentifier);
            }
          }

          // Check individual storage keys
          if (!userIdentifier) {
            const storedEmail = localStorage.getItem('tabmangment_user_email');
            if (storedEmail && storedEmail.includes('@')) {
              userIdentifier = storedEmail;
              await chrome.storage.local.set({ userEmail: storedEmail });
              console.log('✅ Got email from stored email:', userIdentifier);
            }
          }

          // Check sessionStorage as well
          if (!userIdentifier) {
            const sessionPayment = sessionStorage.getItem('tabmangment_payment_success');
            if (sessionPayment) {
              const data = JSON.parse(sessionPayment);
              console.log('💳 Found session payment data:', data);
              if (data.email && data.email.includes('@')) {
                userIdentifier = data.email;
                await chrome.storage.local.set({ userEmail: data.email });
                console.log('✅ Got email from session payment:', userIdentifier);
              }
            }
          }
        } catch (e) {
          console.log('⚠️ Error checking payment data:', e.message);
        }
      }

      // 3. Try to get email from current active tab URL (if on success/payment page)
      if (!userIdentifier) {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs.length > 0) {
            const url = new URL(tabs[0].url);
            const emailFromUrl = url.searchParams.get('email') || url.searchParams.get('customer_email');
            if (emailFromUrl && emailFromUrl.includes('@')) {
              userIdentifier = emailFromUrl;
              await chrome.storage.local.set({ userEmail: emailFromUrl });
              console.log('✅ Found email in current tab URL:', userIdentifier);
            } else {
              console.log('🔍 Current URL:', tabs[0].url);
              console.log('🔍 No email found in URL parameters');
            }
          }
        } catch (e) {
          console.log('⚠️ Cannot access tab URL:', e.message);
        }
      }

      // 4. Ask extension popup for user email if available
      if (!userIdentifier || !userIdentifier.includes('@')) {
        try {
          const response = await chrome.runtime.sendMessage({ type: 'GET_USER_EMAIL' });
          if (response && response.email && response.email.includes('@')) {
            userIdentifier = response.email;
            await chrome.storage.local.set({ userEmail: response.email });
            console.log('✅ Got email from extension popup:', userIdentifier);
          }
        } catch (e) {
          console.log('⚠️ Cannot get email from popup');
        }
      }

      // 5. Generate a temporary ID if no email found (but flag for manual input)
      if (!userIdentifier || !userIdentifier.includes('@')) {
        const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await chrome.storage.local.set({
          userId: tempId,
          needsRealEmail: true
        });
        userIdentifier = tempId;
        console.log('⚠️ Generated temporary ID - payment may not activate without real email:', tempId);
      }

      return userIdentifier;
    } catch (error) {
      console.error('Error getting user identifier:', error);
      return null;
    }
  }

  async activateProFeatures(paymentData) {
    try {
      const proFeatures = {
        isPremium: true,
        subscriptionActive: true,
        planType: 'pro',
        activatedAt: new Date().toISOString(),
        userEmail: paymentData.data?.email,
        stripeCustomerId: paymentData.data?.stripeCustomerId,
        stripeSubscriptionId: paymentData.data?.stripeSubscriptionId,
        currentPeriodEnd: paymentData.data?.currentPeriodEnd,
        activatedVia: 'payment_polling',
        paymentVerified: true
      };

      // Store Pro features in extension
      await chrome.storage.local.set(proFeatures);

      // Notify background script
      try {
        chrome.runtime.sendMessage({
          type: 'pro_activated',
          data: proFeatures
        });
      } catch (e) {
        // Background script might not be available
      }

      // Show success notification
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Tabmangment Pro Activated!',
          message: 'All Pro features are now available. Thank you for upgrading!'
        });
      } catch (e) {
        // Notifications might not be available
      }

      console.log('✅ Pro features activated successfully!');
      return true;

    } catch (error) {
      console.error('❌ Error activating Pro features:', error);
      return false;
    }
  }

  // Check recent activations (for when we have temp user IDs)
  async checkRecentActivations() {
    try {
      console.log('🔍 Checking recent Pro activations...');

      const response = await fetch(`${this.apiBaseUrl}/recent-activations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 Recent activations:', result);

        if (result.success && result.activations.length > 0) {
          // Get the most recent activation (first in array)
          const recentActivation = result.activations[0];

          // Create a Pro status response format
          return {
            success: true,
            isPro: true,
            data: {
              email: recentActivation.email,
              userId: recentActivation.userId,
              activatedAt: recentActivation.activatedAt,
              planType: 'pro'
            }
          };
        }
      }
    } catch (error) {
      console.log('⚠️ Error checking recent activations:', error.message);
    }

    return null;
  }

  // Manual activation method for testing
  async checkNow(userIdentifier) {
    if (!userIdentifier) {
      userIdentifier = await this.getUserIdentifier();
    }

    if (userIdentifier) {
      this.checkCount = 0; // Reset check count
      this.checkInterval = 5000; // Reset to fast checking
      await this.pollPaymentStatus(userIdentifier);
    }
  }

  // Stop polling (for cleanup)
  stop() {
    this.checkCount = this.maxChecks;
    console.log('⏹️ Payment status polling stopped');
  }
}

// Global instance for the extension
let paymentChecker = null;

// Initialize payment checker when extension loads
if (typeof chrome !== 'undefined' && chrome.runtime) {
  paymentChecker = new PaymentStatusChecker();

  // Add global functions for manual testing
  window.checkPaymentStatus = () => paymentChecker?.checkNow();
  window.stopPaymentChecking = () => paymentChecker?.stop();
}