// Netlify Function: /api/billing-portal
// Creates a Stripe billing portal session

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get authenticated user from token
        const authHeader = event.headers.authorization;
        let authenticatedUser = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            try {
                const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
                if (tokenData.email && tokenData.exp > Math.floor(Date.now() / 1000)) {
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', tokenData.email)
                        .single();

                    if (!error) {
                        authenticatedUser = data;
                    }
                }
            } catch (authError) {
                console.log('⚠️ Auth token invalid:', authError.message);
            }
        }

        if (!authenticatedUser || !authenticatedUser.stripe_customer_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'No billing account found. Please make a purchase first.'
                })
            };
        }

        const { returnUrl } = JSON.parse(event.body || '{}');
        const currentDomain = event.headers.origin || 'https://tabmangment.netlify.app';

        const session = await stripe.billingPortal.sessions.create({
            customer: authenticatedUser.stripe_customer_id,
            return_url: returnUrl || `${currentDomain}/dashboard.html`,
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                url: session.url
            })
        };

    } catch (error) {
        console.error('❌ Billing portal error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create billing portal session'
            })
        };
    }
};