// Cloudflare Pages Function: /api/create-checkout-session
// Creates a Stripe Checkout session for Pro plan purchase

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

// Handle OPTIONS (preflight) requests
export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: corsHeaders
    });
}

// Handle POST requests
export async function onRequestPost(context) {
    try {
        const { request, env } = context;

        // Parse request body
        const body = await request.json();
        const { priceId } = body;

        // Get auth token
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({
                error: 'Authentication required. Please log in first.'
            }), {
                status: 401,
                headers: corsHeaders
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Validate user with Supabase
        let userEmail = null;
        try {
            const supabaseResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': env.SUPABASE_SERVICE_ROLE_KEY
                }
            });

            if (supabaseResponse.ok) {
                const userData = await supabaseResponse.json();
                userEmail = userData.email;
            }
        } catch (error) {
            console.error('Supabase auth error:', error);
        }

        if (!userEmail) {
            return new Response(JSON.stringify({
                error: 'Authentication required. Please log in first.'
            }), {
                status: 401,
                headers: corsHeaders
            });
        }

        if (!priceId) {
            return new Response(JSON.stringify({
                error: 'Missing required field: priceId'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // Create Stripe Checkout Session using Stripe API
        const origin = request.headers.get('origin') || 'https://tabmangment.com';

        const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'payment_method_types[]': 'card',
                'line_items[0][price]': priceId,
                'line_items[0][quantity]': '1',
                'mode': 'subscription',
                'customer_email': userEmail,
                'client_reference_id': userEmail,
                'metadata[userEmail]': userEmail,
                'metadata[plan]': 'pro',
                'success_url': `${origin}/user-dashboard.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                'cancel_url': `${origin}/user-dashboard.html?payment=cancelled`,
                'billing_address_collection': 'auto',
                'tax_id_collection[enabled]': 'true',
                'automatic_tax[enabled]': 'true',
                'allow_promotion_codes': 'true',
                'subscription_data[metadata][userEmail]': userEmail,
                'subscription_data[metadata][plan]': 'pro'
            })
        });

        if (!stripeResponse.ok) {
            const errorData = await stripeResponse.text();
            console.error('Stripe API error:', errorData);
            return new Response(JSON.stringify({
                error: 'Failed to create checkout session'
            }), {
                status: 500,
                headers: corsHeaders
            });
        }

        const session = await stripeResponse.json();

        // Return session data
        return new Response(JSON.stringify({
            sessionId: session.id,
            url: session.url,
            customerId: session.customer,
            subscriptionId: session.subscription
        }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('❌ Stripe checkout session creation failed:', error);

        return new Response(JSON.stringify({
            error: 'Failed to create checkout session',
            details: error.message
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
