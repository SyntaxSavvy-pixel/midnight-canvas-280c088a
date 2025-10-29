// Plain text configuration as required by Chrome Web Store
const API_BASE_URL = 'https://tabmangment.com';

export const CONFIG = {
    API: {
        BASE: `${API_BASE_URL}/api`,
        CREATE_CHECKOUT: `${API_BASE_URL}/api/create-checkout`,
        CHECK_STATUS: `${API_BASE_URL}/api/check-payment-status`,
        BILLING_PORTAL: `${API_BASE_URL}/api/billing-portal`,
        STRIPE_WEBHOOK: `${API_BASE_URL}/api/stripe-webhook`
    },
    PERPLEXITY: {
        API_KEY: 'YOUR_API_KEY_HERE',
        SEARCH_URL: 'https://api.perplexity.ai/search',
        MAX_RESULTS: 10,
        MAX_TOKENS: 25000,
        MAX_TOKENS_PER_PAGE: 2048,
        COUNTRY: 'US'
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
        "https://www.googleapis.com/*",
        "https://api.perplexity.ai/*"
    ],
    CONNECT_SRC: `'self' https://buy.stripe.com ${API_BASE_URL} https://api.emailjs.com https://billing.stripe.com https://api.perplexity.ai`
};