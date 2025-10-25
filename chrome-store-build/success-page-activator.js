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


  class SuccessPageActivator {
    constructor() {
      this.apiBaseUrl = 'https://tabmangment.netlify.app/api';
      this.init();
    }

    async init() {
      try {
        // Small delay to let page load
        setTimeout(() => {
          this.activateProFeatures();
        }, 2000);
      } catch (error) {
      }
    }

    async activateProFeatures() {
      try {
        // Get payment details from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const email = urlParams.get('email') || urlParams.get('customer_email');
        const userSession = urlParams.get('user_session');


        // Store activation data for extension to pick up
        this.storeActivationData(email, sessionId, userSession);

        // Notify extension directly if possible
        this.notifyExtension(email, sessionId, userSession);


      } catch (error) {
      }
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

        // Also try sessionStorage
        sessionStorage.setItem('tabmangment_payment_success', JSON.stringify(activationData));

        // Store in multiple keys for better detection
        localStorage.setItem('tabmangment_user_email', email || '');
        localStorage.setItem('tabmangment_stripe_session', sessionId || '');
        localStorage.setItem('tabmangment_user_session', userSession || '');

      } catch (error) {
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
          });
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
        }


      } catch (error) {
      }
    }


    async alternativeActivation() {
      try {
        // Try to detect email from page content
        const pageText = document.body.textContent;
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        if (emailMatch) {
          const detectedEmail = emailMatch[0];

          this.storeActivationData(detectedEmail, null, null);
          this.notifyExtension(detectedEmail, null, null);
          return;
        }

        // If no email found, still try to notify extension
        this.notifyExtension('unknown@payment.success', 'unknown_session', null);
        this.storeActivationData('unknown@payment.success', 'unknown_session', null);

      } catch (error) {
      }
    }
  }

  // Initialize the activator
  new SuccessPageActivator();

})();