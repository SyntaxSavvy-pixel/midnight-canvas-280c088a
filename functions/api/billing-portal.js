// Cloudflare Pages Function: /api/billing-portal
// Creates a Stripe billing portal session

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: corsHeaders
    });
}

export async function onRequestPost(context) {
    try {
        const { request, env } = context;

        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get authenticated user from token
        const authHeader = request.headers.get('authorization');
        let userEmail = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');

            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser(token);

                if (!authError && user) {
                    userEmail = user.email;
                }
            } catch (authError) {
                try {
                    const tokenData = JSON.parse(atob(token));
                    if (tokenData.email && tokenData.exp > Math.floor(Date.now() / 1000)) {
                        userEmail = tokenData.email;
                    }
                } catch (legacyError) {
                    console.error('Token decode error:', legacyError);
                }
            }
        }

        if (!userEmail) {
            return new Response(JSON.stringify({
                error: 'Authentication required'
            }), {
                status: 401,
                headers: corsHeaders
            });
        }

        // Get user data from database
        const { data, error } = await supabase
            .from('users_auth')
            .select('*')
            .eq('email', userEmail)
            .single();

        if (error || !data || !data.stripe_customer_id) {
            return new Response(JSON.stringify({
                error: 'No billing account found. Please make a purchase first.'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        const body = await request.json();
        const { returnUrl } = body;
        const origin = request.headers.get('origin') || 'https://tabmangment.com';

        const session = await stripe.billingPortal.sessions.create({
            customer: data.stripe_customer_id,
            return_url: returnUrl || `${origin}/user-dashboard.html`,
        });

        return new Response(JSON.stringify({
            url: session.url
        }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('❌ Billing portal error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to create billing portal session'
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
