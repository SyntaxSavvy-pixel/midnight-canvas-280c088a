// Manual Pro Activator - Run this in browser console after payment
// This will help activate Pro features when automatic detection fails

window.manuallyActivatePro = async function(email) {
  if (!email || !email.includes('@')) {
    return false;
  }

  try {

    const apiBaseUrl = 'https://tabmangment.netlify.app/api';

    // 1. Store the email in extension storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        userEmail: email,
        customerEmail: email,
        needsRealEmail: false
      });
    }

    // 2. Call activation API
    const response = await fetch(`${apiBaseUrl}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        sessionId: 'manual_' + Date.now(),
        userId: email
      })
    });

    const result = await response.json();

    if (result.success) {

      // 3. Store Pro data in extension
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          isPremium: true,
          subscriptionActive: true,
          planType: 'pro',
          userEmail: email,
          proActivatedAt: new Date().toISOString(),
          activatedVia: 'manual_console',
          paymentConfirmed: true
        });
      }


      // 5. Send message to extension to refresh UI
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'pro_activated',
          email: email
        }).catch(() => {}); // Ignore if no listeners
      }

      return true;

    } else {
      return false;
    }

  } catch (error) {
    return false;
  }
};

// Also add a function to check current status
window.checkProStatus = async function(email) {
  try {
    const apiBaseUrl = 'https://tabmangment.netlify.app/api';

    const response = await fetch(`${apiBaseUrl}/status?user=${encodeURIComponent(email || 'unknown')}`);
    const result = await response.json();

    return result;
  } catch (error) {
    return null;
  }
};

// Auto-run instructions
