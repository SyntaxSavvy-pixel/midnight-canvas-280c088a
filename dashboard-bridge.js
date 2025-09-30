// Dashboard Bridge - Enables communication between web dashboard and extension
// This script runs in the context of the dashboard page and bridges messages

console.log('🌉 Dashboard Bridge loaded');

// Listen for messages from the web page
window.addEventListener('message', async (event) => {
    // Only accept messages from the same origin
    if (event.source !== window) return;

    const message = event.data;

    // Only handle messages with our specific type
    if (!message || !message.type || !message.type.startsWith('TABMANGMENT_')) return;

    // Don't forward RESPONSE messages - they're meant for the page only
    if (message.type === 'TABMANGMENT_RESPONSE') {
        return;
    }

    console.log('📨 Bridge received message from page:', message.type);

    try {
        // Forward the message to the background script
        const response = await chrome.runtime.sendMessage({
            ...message,
            type: message.type.replace('TABMANGMENT_', '') // Remove prefix
        });

        console.log('📬 Bridge received response from extension:', response);

        // Send response back to the web page
        window.postMessage({
            type: 'TABMANGMENT_RESPONSE',
            requestId: message.requestId,
            success: true,
            data: response
        }, '*');

    } catch (error) {
        console.error('❌ Bridge error:', error);

        // Send error back to the web page
        window.postMessage({
            type: 'TABMANGMENT_RESPONSE',
            requestId: message.requestId,
            success: false,
            error: error.message
        }, '*');
    }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Bridge received message from background:', message.type, message);

    // Forward messages from background to the web page
    if (message.type === 'STATS_UPDATE' || message.type === 'EXTENSION_READY') {
        console.log('📤 Forwarding to page:', message);
        window.postMessage({
            type: 'TABMANGMENT_' + message.type,
            data: message.data || message
        }, '*');
    }

    return true;
});

// Notify the page that the bridge is ready
// Send immediately AND when DOM is ready to ensure the message is received
function sendBridgeReady() {
    const message = {
        type: 'TABMANGMENT_BRIDGE_READY',
        extensionId: chrome.runtime.id
    };

    window.postMessage(message, '*');
    console.log('✅ Dashboard Bridge ready, extension ID:', chrome.runtime.id);
}

// Send immediately
sendBridgeReady();

// Send again when DOM is ready (in case page listener isn't set up yet)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendBridgeReady);
} else {
    // DOM already loaded, send again
    setTimeout(sendBridgeReady, 100);
}

// Send one more time after a delay to catch late listeners
setTimeout(sendBridgeReady, 500);
setTimeout(sendBridgeReady, 1000);