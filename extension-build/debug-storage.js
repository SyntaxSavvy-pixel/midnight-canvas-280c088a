// Add this to popup.js init to debug storage issues
async function debugStorage() {
    const allStorage = await chrome.storage.local.get(null);
}
