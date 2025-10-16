// Add this to popup.js init to debug storage issues
async function debugStorage() {
    const allStorage = await chrome.storage.local.get(null);
    console.log('🔍 FULL STORAGE DUMP:', allStorage);
    console.log('📊 Storage Keys:', Object.keys(allStorage));
    console.log('✅ isPremium:', allStorage.isPremium);
    console.log('✅ planType:', allStorage.planType);
    console.log('✅ subscriptionActive:', allStorage.subscriptionActive);
    console.log('✅ subscriptionExpiry:', allStorage.subscriptionExpiry, 'Expired?', Date.now() > allStorage.subscriptionExpiry);
    console.log('✅ lastSyncTime:', allStorage.lastSyncTime);
}
