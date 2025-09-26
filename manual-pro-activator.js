// Manual Pro Activator - Run this in browser console after payment
// This will help activate Pro features when automatic detection fails

window.manuallyActivatePro = async function(email) {
  if (!email || !email.includes('@')) {
    console.error('❌ Please provide a valid email address');
    console.log('Usage: manuallyActivatePro("your-email@example.com")');
    return false;
  }

  try {
    console.log('🎯 Manually activating Pro for:', email);

    const apiBaseUrl = 'https://tabmangment-extension-bz4chus0i-kavon-hicks-projects.vercel.app/api';

    // 1. Store the email in extension storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        userEmail: email,
        customerEmail: email,
        needsRealEmail: false
      });
      console.log('✅ Email stored in extension');
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
      console.log('✅ Backend activation successful:', result);

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
        console.log('✅ Pro status stored in extension');
      }

      // 4. Notify user
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Tabmangment Pro Activated!',
          message: 'Pro features are now active. Thank you for upgrading!'
        });
      }

      // 5. Send message to extension to refresh UI
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'pro_activated',
          email: email
        }).catch(() => {}); // Ignore if no listeners
      }

      console.log('🎉 Pro activation complete!');
      return true;

    } else {
      console.error('❌ Backend activation failed:', result);
      return false;
    }

  } catch (error) {
    console.error('❌ Manual activation error:', error);
    return false;
  }
};

// Also add a function to check current status
window.checkProStatus = async function(email) {
  try {
    const apiBaseUrl = 'https://tabmangment-extension-bz4chus0i-kavon-hicks-projects.vercel.app/api';

    const response = await fetch(`${apiBaseUrl}/status?user=${encodeURIComponent(email || 'unknown')}`);
    const result = await response.json();

    console.log('📊 Current Pro Status:', result);
    return result;
  } catch (error) {
    console.error('❌ Status check failed:', error);
    return null;
  }
};

// Auto-run instructions
console.log('🔧 Manual Pro Activation Functions Available:');
console.log('1. manuallyActivatePro("your-email@example.com") - Activate Pro features');
console.log('2. checkProStatus("your-email@example.com") - Check current status');
console.log('');
console.log('💡 If you just completed payment, run:');
console.log('manuallyActivatePro("your-payment-email@example.com")');