// Success page activator - Runs on Stripe success pages to trigger Pro activation
// This handles immediate activation when users complete payment

(function() {
  'use strict';

  // Only run on payment success pages
  const url = window.location.href.toLowerCase();
  const isSuccessPage = (
    url.includes('success') ||
    url.includes('stripe.com') ||
    url.includes('payment') ||
    document.body?.textContent?.toLowerCase().includes('payment successful') ||
    document.body?.textContent?.toLowerCase().includes('thanks for subscribing')
  );

  if (!isSuccessPage) {
    return;
  }

  console.log('🎉 Payment success page detected, initiating Pro activation...');

  class SuccessPageActivator {
    constructor() {
      this.apiBaseUrl = 'https://tabmangment-extension-bz4chus0i-kavon-hicks-projects.vercel.app/api';
      this.init();
    }

    async init() {
      try {
        // Small delay to let page load
        setTimeout(() => {
          this.activateProFeatures();
        }, 2000);
      } catch (error) {
        console.error('Error initializing success page activator:', error);
      }
    }

    async activateProFeatures() {
      try {
        // Get payment details from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const email = urlParams.get('email') || urlParams.get('customer_email');
        const userSession = urlParams.get('user_session');

        console.log('💳 Payment details from URL:', { sessionId, email, userSession });

        // Method 1: Call new payment completion API
        await this.callPaymentCompletionAPI(sessionId, email, userSession);

        // Method 2: Call old activation APIs as fallback
        await this.callActivationAPI(email, sessionId);

        // Method 3: Store activation data for extension to pick up
        this.storeActivationData(email, sessionId, userSession);

        // Method 4: Notify extension directly if possible
        this.notifyExtension(email, sessionId, userSession);

        // Method 5: Show success message to user
        this.showSuccessMessage(email);

      } catch (error) {
        console.error('❌ Error activating Pro features:', error);
        this.showErrorMessage();
      }
    }

    async callPaymentCompletionAPI(sessionId, email, userSession) {
      try {
        console.log('🔄 Calling payment completion API...');

        const response = await fetch(`${this.apiBaseUrl}/complete-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: sessionId,
            email: email,
            user_session: userSession,
            timestamp: new Date().toISOString()
          })
        });

        const result = await response.json();

        if (result.success) {
          console.log('✅ Payment completion API successful:', result);
          return true;
        } else {
          console.log('⚠️ Payment completion API returned false:', result);
          return false;
        }
      } catch (error) {
        console.log('⚠️ Payment completion API failed:', error.message);
        return false;
      }
    }

    async callActivationAPI(email, sessionId) {
      // Try multiple activation endpoints
      const endpoints = [
        { url: `${this.apiBaseUrl}/activate`, name: 'activate' },
        { url: `${this.apiBaseUrl}/activate-pro`, name: 'activate-pro' }
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying activation endpoint: ${endpoint.name}`);

          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: email,
              sessionId: sessionId,
              timestamp: new Date().toISOString()
            })
          });

          const result = await response.json();

          if (result.success) {
            console.log(`✅ Backend Pro activation successful via ${endpoint.name}:`, result);
            return true;
          } else {
            console.log(`⚠️ Activation endpoint ${endpoint.name} returned false:`, result);
          }
        } catch (error) {
          console.log(`⚠️ Activation endpoint ${endpoint.name} failed:`, error.message);
          continue;
        }
      }

      console.error('❌ All activation endpoints failed');
      return false;
    }

    storeActivationData(email, sessionId, userSession) {
      try {
        // Store in localStorage for extension to pick up
        const activationData = {
          email: email,
          sessionId: sessionId,
          userSession: userSession,
          timestamp: new Date().toISOString(),
          activated: false,
          source: 'success_page',
          paymentCompleted: true
        };

        localStorage.setItem('tabmangment_payment_success', JSON.stringify(activationData));
        console.log('💾 Activation data stored in localStorage');

        // Also try sessionStorage
        sessionStorage.setItem('tabmangment_payment_success', JSON.stringify(activationData));

        // Store in multiple keys for better detection
        localStorage.setItem('tabmangment_user_email', email || '');
        localStorage.setItem('tabmangment_stripe_session', sessionId || '');
        localStorage.setItem('tabmangment_user_session', userSession || '');

      } catch (error) {
        console.error('❌ Error storing activation data:', error);
      }
    }

    notifyExtension(email, sessionId, userSession) {
      try {
        // Try multiple methods to notify the extension

        // Method 1: Chrome extension messaging (if available)
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'PAYMENT_SUCCESS',
            email: email,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          }).catch(e => console.log('Extension messaging not available'));
        }

        // Method 2: PostMessage to opener window
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'TABMANGMENT_PAYMENT_SUCCESS',
            email: email,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          }, '*');
        }

        // Method 3: BroadcastChannel
        try {
          const bc = new BroadcastChannel('tabmangment_payment');
          bc.postMessage({
            type: 'PAYMENT_SUCCESS',
            email: email,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          });
          bc.close();
        } catch (e) {
          console.log('BroadcastChannel not available');
        }

        console.log('📡 Extension notification attempts sent');

      } catch (error) {
        console.error('❌ Error notifying extension:', error);
      }
    }

    showSuccessMessage(email) {
      try {
        // Create success notification
        const notification = document.createElement('div');
        notification.id = 'tabmangment-success-notification';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 600;
          z-index: 999999;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
          max-width: 350px;
          cursor: pointer;
          transition: all 0.3s ease;
        `;

        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">🎉</div>
            <div>
              <div style="font-size: 16px; margin-bottom: 4px;">Pro Features Activated!</div>
              <div style="font-size: 13px; opacity: 0.9;">
                ${email ? `Welcome ${email.split('@')[0]}!` : 'Welcome!'}
                Open Tabmangment to use Pro features.
              </div>
            </div>
            <div style="margin-left: auto; font-size: 18px; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">×</div>
          </div>
        `;

        // Add hover effects
        notification.addEventListener('mouseenter', () => {
          notification.style.transform = 'scale(1.02)';
          notification.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.4)';
        });

        notification.addEventListener('mouseleave', () => {
          notification.style.transform = 'scale(1)';
          notification.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)';
        });

        document.body.appendChild(notification);

        // Auto-remove after 10 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
          }
        }, 10000);

        console.log('✅ Success notification displayed');

      } catch (error) {
        console.error('❌ Error showing success message:', error);
      }
    }

    showErrorMessage() {
      try {
        console.log('⚠️ Showing error message to user');

        // Simple error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px;
          border-radius: 8px;
          font-family: system-ui;
          z-index: 999999;
        `;

        notification.innerHTML = `
          <div>⚠️ Pro activation in progress... Please check the Tabmangment extension in a few moments.</div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);

      } catch (error) {
        console.error('❌ Error showing error message:', error);
      }
    }

    async alternativeActivation() {
      try {
        // Try to detect email from page content
        const pageText = document.body.textContent;
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        if (emailMatch) {
          const detectedEmail = emailMatch[0];
          console.log('📧 Email detected from page:', detectedEmail);

          await this.callActivationAPI(detectedEmail, null);
          this.storeActivationData(detectedEmail, null);
          this.notifyExtension(detectedEmail, null);
          this.showSuccessMessage(detectedEmail);
          return;
        }

        // If no email found, still try to notify extension
        console.log('🔄 No email found, notifying extension anyway...');
        this.notifyExtension('unknown@payment.success', 'unknown_session');
        this.storeActivationData('unknown@payment.success', 'unknown_session');

      } catch (error) {
        console.error('❌ Error in alternative activation:', error);
      }
    }
  }

  // Initialize the activator
  new SuccessPageActivator();

})();