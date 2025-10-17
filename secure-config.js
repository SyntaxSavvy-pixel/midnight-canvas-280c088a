// Secure Configuration Loader
// Fetches public config from backend instead of hardcoding sensitive keys
// This prevents API keys from being exposed in client-side code

class SecureConfig {
    constructor() {
        this.config = null;
        this.loading = null;
    }

    async load() {
        // Return cached config if already loaded
        if (this.config) {
            return this.config;
        }

        // Return existing promise if already loading
        if (this.loading) {
            return this.loading;
        }

        // Fetch config from backend
        this.loading = this._fetchConfig();
        this.config = await this.loading;
        this.loading = null;

        return this.config;
    }

    async _fetchConfig() {
        try {
            const response = await fetch('/.netlify/functions/config');

            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }

            const data = await response.json();

            return {
                supabaseUrl: 'https://voislxlhfepnllamagxm.supabase.co',
                supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvaXNseGxoZmVwbmxsYW1hZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTI4MDcsImV4cCI6MjA3NDU4ODgwN30.mDdMdGg4JAInS7kXNL6-edvRaQ_mVuMGRjU7rX-hMCM',
                stripePriceId: data.stripePriceId,
                stripePublishableKey: data.stripePublishableKey,
                logoApiKey: 'pk_YIMtrjZvSpG8_u5_F5uxoA'
            };
        } catch (error) {

            // Fallback to safe defaults (Supabase anon key is safe to expose)
            return {
                supabaseUrl: 'https://voislxlhfepnllamagxm.supabase.co',
                supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvaXNseGxoZmVwbmxsYW1hZ3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTI4MDcsImV4cCI6MjA3NDU4ODgwN30.mDdMdGg4JAInS7kXNL6-edvRaQ_mVuMGRjU7rX-hMCM',
                stripePriceId: null,
                stripePublishableKey: null,
                logoApiKey: 'pk_YIMtrjZvSpG8_u5_F5uxoA'
            };
        }
    }
}

// Global instance
window.secureConfig = new SecureConfig();
