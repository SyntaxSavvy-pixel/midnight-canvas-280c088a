// Netlify Function: /api/create-checkout-session
// Creates a Stripe Checkout session for Pro plan purchase

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    // Only allow POST requests
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
                // Decode simple token
                const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
                if (tokenData.email && tokenData.exp > Math.floor(Date.now() / 1000)) {
                    // Get user from Supabase
                    try {
                        const { getUser } = await import('../../lib/database-supabase.js');
                        authenticatedUser = await getUser(tokenData.email);
                    } catch (dbError) {
                        console.error('❌ Database error:', dbError);
                    }
                }
            } catch (authError) {
                console.log('⚠️ Auth token invalid:', authError.message);
            }
        }

        if (!authenticatedUser) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: 'Authentication required. Please log in first.'
                })
            };
        }

        const { priceId } = JSON.parse(event.body || '{}');

        if (!priceId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required field: priceId'
                })
            };
        }

        console.log('Creating checkout session for:', {
            email: authenticatedUser.email,
            name: authenticatedUser.name,
            priceId
        });

        // Get the current domain for success/cancel URLs
        const currentDomain = event.headers.origin || 'https://your-domain.netlify.app';

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            customer_email: authenticatedUser.email,
            client_reference_id: authenticatedUser.email, // Use email as reference
            metadata: {
                userEmail: authenticatedUser.email,
                userName: authenticatedUser.name,
                plan: 'pro'
            },
            success_url: `${currentDomain}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(authenticatedUser.email)}`,
            cancel_url: `${currentDomain}/dashboard.html`,
            billing_address_collection: 'auto',
            tax_id_collection: {
                enabled: true
            },
            automatic_tax: {
                enabled: true
            },
            allow_promotion_codes: true,
            subscription_data: {
                metadata: {
                    userEmail: authenticatedUser.email,
                    userName: authenticatedUser.name,
                    plan: 'pro'
                }
            }
        });

        console.log('✅ Checkout session created:', session.id);

        // Return session data
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url,
                customerId: session.customer,
                subscriptionId: session.subscription
            })
        };

    } catch (error) {
        console.error('❌ Stripe checkout session creation failed:', error);

        // Handle specific Stripe errors
        if (error.type === 'StripeCardError') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: error.message })
            };
        }

        if (error.type === 'StripeRateLimitError') {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ error: 'Too many requests. Please try again later.' })
            };
        }

        if (error.type === 'StripeInvalidRequestError') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid request parameters.' })
            };
        }

        if (error.type === 'StripeAPIError') {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Stripe API error. Please try again.' })
            };
        }

        if (error.type === 'StripeConnectionError') {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Network error. Please check your connection.' })
            };
        }

        if (error.type === 'StripeAuthenticationError') {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Authentication error.' })
            };
        }

        // Generic error
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to create checkout session',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};