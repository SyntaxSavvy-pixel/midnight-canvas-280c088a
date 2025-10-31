// Cloudflare Pages Function: /api/create-checkout-session
// Creates a Stripe Checkout session for Pro plan purchase

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

        // Initialize Stripe and Supabase
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get authenticated user from Supabase Auth token
        const authHeader = request.headers.get('authorization');
        let authenticatedUser = null;
        let userEmail = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');

            // Try Supabase Auth token first
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser(token);

                if (!authError && user) {
                    userEmail = user.email;
                    authenticatedUser = {
                        email: user.email,
                        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
                    };
                }
            } catch (authError) {
                // Fallback to legacy token format
                try {
                    const tokenData = JSON.parse(atob(token));
                    if (tokenData.email && tokenData.exp > Math.floor(Date.now() / 1000)) {
                        userEmail = tokenData.email;
                        authenticatedUser = { email: userEmail };
                    }
                } catch (legacyError) {
                    console.error('Token decode error:', legacyError);
                }
            }
        }

        if (!authenticatedUser) {
            console.error('❌ No authenticated user found');
            return new Response(JSON.stringify({
                error: 'Authentication required. Please log in first.'
            }), {
                status: 401,
                headers: corsHeaders
            });
        }

        // Parse request body
        const body = await request.json();
        const { priceId } = body;

        if (!priceId) {
            return new Response(JSON.stringify({
                error: 'Missing required field: priceId'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // Get the current domain for success/cancel URLs
        const origin = request.headers.get('origin') || 'https://tabmangment.com';

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
            client_reference_id: authenticatedUser.email,
            metadata: {
                userEmail: authenticatedUser.email,
                userName: authenticatedUser.name,
                plan: 'pro'
            },
            success_url: `${origin}/user-dashboard.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/user-dashboard.html?payment=cancelled`,
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

        // Handle specific Stripe errors
        let statusCode = 500;
        let errorMessage = 'Failed to create checkout session';

        if (error.type === 'StripeCardError') {
            statusCode = 400;
            errorMessage = error.message;
        } else if (error.type === 'StripeRateLimitError') {
            statusCode = 429;
            errorMessage = 'Too many requests. Please try again later.';
        } else if (error.type === 'StripeInvalidRequestError') {
            statusCode = 400;
            errorMessage = 'Invalid request parameters.';
        } else if (error.type === 'StripeAPIError') {
            statusCode = 500;
            errorMessage = 'Stripe API error. Please try again.';
        } else if (error.type === 'StripeConnectionError') {
            statusCode = 500;
            errorMessage = 'Network error. Please check your connection.';
        } else if (error.type === 'StripeAuthenticationError') {
            statusCode = 500;
            errorMessage = 'Authentication error.';
        }

        return new Response(JSON.stringify({
            error: errorMessage,
            details: error.message
        }), {
            status: statusCode,
            headers: corsHeaders
        });
    }
}
