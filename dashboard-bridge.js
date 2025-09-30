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

// Expose bridge on window object for direct access
window.TABMANGMENT_BRIDGE = {
    ready: true,
    extensionId: chrome.runtime.id
};

console.log('✅ Dashboard Bridge ready, extension ID:', chrome.runtime.id);
console.log('✅ window.TABMANGMENT_BRIDGE set:', window.TABMANGMENT_BRIDGE);

// Also send postMessage for backward compatibility
function sendBridgeReady() {
    const message = {
        type: 'TABMANGMENT_BRIDGE_READY',
        extensionId: chrome.runtime.id
    };

    window.postMessage(message, '*');

    // Fire custom event
    window.dispatchEvent(new CustomEvent('TABMANGMENT_BRIDGE_READY', {
        detail: { extensionId: chrome.runtime.id }
    }));
}

// Send immediately
sendBridgeReady();

// Send again when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendBridgeReady);
} else {
    setTimeout(sendBridgeReady, 100);
}

// Send multiple times to ensure it's caught
setTimeout(sendBridgeReady, 500);
setTimeout(sendBridgeReady, 1000);