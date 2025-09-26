const _cfg = {
    _b: ['dGFibWFuZ21lbnQtZXh0ZW5zaW9uLWJ6NGNodXMwaS1rYXZvbi1oaWNrcy1wcm9qZWN0cy52ZXJjZWwuYXBw'],
    _p: 'https://',
    _d: () => atob(_cfg._b[0])
};

const API_BASE_URL = _cfg._p + _cfg._d();

export const CONFIG = {
    API: {
        BASE: `${API_BASE_URL}/api`,
        CREATE_CHECKOUT: `${API_BASE_URL}/api/create-checkout`,
        CHECK_STATUS: `${API_BASE_URL}/api/check-payment-status`,
        BILLING_PORTAL: `${API_BASE_URL}/api/billing-portal`,
        STRIPE_WEBHOOK: `${API_BASE_URL}/api/stripe-webhook`
    },
    EXTENSION: {
        DEFAULT_TAB_LIMIT: 10,
        TIMER_CHECK_INTERVAL: 5000,
        STATUS_CHECK_INTERVAL: 300000,
        CACHE_TIMEOUT: 2000
    },
    FEATURES: {
        PRO_FEATURES: true,
        BILLING_PORTAL: true,
        REAL_TIME_SYNC: true
    }
};

export const MANIFEST_URLS = {
    HOST_PERMISSIONS: [
        "https://buy.stripe.com/*",
        `${API_BASE_URL}/*`,
        "https://api.emailjs.com/*",
        "https://billing.stripe.com/*",
        "https://www.googleapis.com/*"
    ],
    CONNECT_SRC: `'self' https://buy.stripe.com ${API_BASE_URL} https://api.emailjs.com https://billing.stripe.com`
};