// Netlify Function: /api/config
// Returns public configuration values

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Return public configuration values from environment
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                stripePriceId: process.env.STRIPE_PRICE_ID,
                stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
            })
        };
    } catch (error) {
        console.error('❌ Config fetch error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch configuration'
            })
        };
    }
};
