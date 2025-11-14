const API_BASE_URL = 'https://tabmangment.com';

export const CONFIG = {
    API: {
        BASE: `${API_BASE_URL}/api`,
        CREATE_CHECKOUT: `${API_BASE_URL}/api/create-checkout-session`,
        CHECK_STATUS: `${API_BASE_URL}/api/status`,
        BILLING_PORTAL: `${API_BASE_URL}/api/billing-portal`,
        STRIPE_WEBHOOK: `${API_BASE_URL}/api/stripe-webhook`,
        CHECK_SEARCH_USAGE: `${API_BASE_URL}/api/check-search-usage`,
        INCREMENT_SEARCH: `${API_BASE_URL}/api/increment-search`
    },
    PERPLEXITY: {
        SEARCH_URL: 'https://tabmangment.com/api/perplexity-search',
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
        "https://buy.stripe.com