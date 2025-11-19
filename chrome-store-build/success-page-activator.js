
(function() {
  'use strict';

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
        setTimeout(() => {
          this.activateProFeatures();
        }, 2000);
      } catch (error) {
      }
    }

    async activateProFeatures() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const email = urlParams.get('email') || urlParams.get('customer_email');
        const userSession = urlParams.get('user_session');


        this.storeActivationData(email, sessionId, userSession);

        this.notifyExtension(email, sessionId, userSession);


      } catch (error) {
      }
    }

    storeActivationData(email, sessionId, userSession) {
      try {
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

        sessionStorage.setItem('tabmangment_payment_success', JSON.stringify(activationData));

        localStorage.setItem('tabmangment_user_email', email || '');
        localStorage.setItem('tabmangment_stripe_session', sessionId || '');
        localStorage.setItem('tabmangment_user_session', userSession || '');

      } catch (error) {
      }
    }

    notifyExtension(email, sessionId, userSession) {
      try {

        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'PAYMENT_SUCCESS',
            email: email,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          });
        }

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'TABMANGMENT_PAYMENT_SUCCESS',
            email: email,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          }, '*');
        }

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
        const pageText = document.body.textContent;
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        if (emailMatch) {
          const detectedEmail = emailMatch[0];

          this.storeActivationData(detectedEmail, null, null);
          this.notifyExtension(detectedEmail, null, null);
          return;
        }

        this.notifyExtension('unknown@payment.success', 'unknown_session', null);
        this.storeActivationData('unknown@payment.success', 'unknown_session', null);

      } catch (error) {
      }
    }
  }

  new SuccessPageActivator();

})();