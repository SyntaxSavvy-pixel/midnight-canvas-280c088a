
function isExtensionUnavailableError(error) {
    if (!error || !error.message) return false;
    return error.message.includes('Extension context invalidated') ||
           error.message.includes('message port closed') ||
           error.message.includes('Receiving end does not exist');
}

window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    const message = event.data;
    if (!message || !message.type) return;

    if (message.type.startsWith('TABMANGMENT_')) {
        if (message.type === 'TABMANGMENT_RESPONSE') {
            return;
        }

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
            const response = await chrome.runtime.sendMessage({
                ...message,
                type: message.type.replace('TABMANGMENT_', '')
            });

            window.postMessage({
                type: 'TABMANGMENT_RESPONSE',
                requestId: message.requestId,
                success: true,
                data: response
            }, '*');

        } catch (error) {
            if (isExtensionUnavailableError(error)) {
                window.postMessage({
                    type: 'TABMANGMENT_RESPONSE',
                    requestId: message.requestId,
                    success: false,
                    error: 'EXTENSION_UNAVAILABLE'
                }, '*');
                return;
            }

            window.postMessage({
                type: 'TABMANGMENT_RESPONSE',
                requestId: message.requestId,
                success: false,
                error: error.message || 'Unknown error'
            }, '*');
        }
        return;
    }

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

    if (message.type === 'USER_LOGGED_OUT') {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'USER_LOGGED_OUT',
                confirmed: message.confirmed || false
            });
        } catch (error) {
            if (!isExtensionUnavailableError(error)) {
            }
        }
        return;
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATS_UPDATE' || message.type === 'EXTENSION_READY') {
        window.postMessage({
            type: 'TABMANGMENT_' + message.type,
            data: message.data || message
        }, '*');
    }

    return true;
});

window.TABMANGMENT_BRIDGE = {
    ready: true,
    extensionId: chrome.runtime.id
};

function sendBridgeReady() {
    const message = {
        type: 'TABMANGMENT_BRIDGE_READY',
        extensionId: chrome.runtime.id
    };

    window.postMessage(message, '*');

    window.dispatchEvent(new CustomEvent('TABMANGMENT_BRIDGE_READY', {
        detail: { extensionId: chrome.runtime.id }
    }));
}

sendBridgeReady();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendBridgeReady);
} else {
    setTimeout(sendBridgeReady, 100);
}

setTimeout(sendBridgeReady, 500);
setTimeout(sendBridgeReady, 1000);