// Simple test function for Netlify
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Netlify Functions are working! 🎉',
            timestamp: new Date().toISOString(),
            method: event.httpMethod,
            path: event.path,
            query: event.queryStringParameters,
            environment: {
                hasSupabase: !!process.env.SUPABASE_URL,
                hasStripe: !!process.env.STRIPE_SECRET_KEY,
                nodeEnv: process.env.NODE_ENV
            }
        })
    };
};