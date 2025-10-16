// Dashboard Bridge - Enables communication between web dashboard and extension
// This script runs in the context of the dashboard page and bridges messages
// Version: 2.1 - Prevent error before it happens

// Helper function to check if error is due to extension reload/unavailable
function isExtensionUnavailableError(error) {
    if (!error || !error.message) return false;
    return error.message.includes('Extension context invalidated') ||
           error.message.includes('message port closed') ||
           error.message.includes('Receiving end does not exist');
}

// Single consolidated message listener for all web page messages
window.addEventListener('message', async (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    const message = event.data;
    if (!message || !message.type) return;

    // Handle TABMANGMENT_ prefixed messages (dashboard requests)
    if (message.type.startsWith('TABMANGMENT_')) {
        // Don't forward RESPONSE messages - they're meant for the page only
        if (message.type === 'TABMANGMENT_RESPONSE') {
            return;
        }

        // Check if extension is available before trying to send message
        if (!chrome.runtime?.id) {
            window.postMessage({
                type: 'TABMANGMENT_RESPONSE',
                requestId: message.requestId,
                success: false,
                error: 'EXTENSION_UNAVAILABLE'
            }, '*');
            return;
        }

        try {
            // Forward the message to the background script
            const response = await chrome.runtime.sendMessage({
                ...message,
                type: message.type.replace('TABMANGMENT_', '') // Remove prefix
            });

            // Send response back to the web page
            window.postMessage({
                type: 'TABMANGMENT_RESPONSE',
                requestId: message.requestId,
                success: true,
                data: response
            }, '*');

        } catch (error) {
            // Silently handle extension unavailable errors
            if (isExtensionUnavailableError(error)) {
                window.postMessage({
                    type: 'TABMANGMENT_RESPONSE',
                    requestId: message.requestId,
                    success: false,
                    error: 'EXTENSION_UNAVAILABLE'
                }, '*');
                return;
            }

            // Log other errors only
            window.postMessage({
                type: 'TABMANGMENT_RESPONSE',
                requestId: message.requestId,
                success: false,
                error: error.message || 'Unknown error'
            }, '*');
        }
        return;
    }

    // Handle USER_LOGGED_IN event from authentication page
    if (message.type === 'USER_LOGGED_IN') {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'USER_LOGGED_IN',
                userData: message.userData,
                token: message.token
            });
        } catch (error) {
            if (!isExtensionUnavailableError(error)) {
            }
        }
        return;
    }

    // Handle USER_LOGGED_OUT event from dashboard
    if (message.type === 'USER_LOGGED_OUT') {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'USER_LOGGED_OUT',
                confirmed: message.confirmed || false  // Forward the confirmed flag
            });
        } catch (error) {
            if (!isExtensionUnavailableError(error)) {
            }
        }
        return;
    }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward messages from background to the web page
    if (message.type === 'STATS_UPDATE' || message.type === 'EXTENSION_READY') {
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