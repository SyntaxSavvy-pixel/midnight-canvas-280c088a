// Cloudflare Pages Function: /api/billing-portal
// Creates a Stripe billing portal session

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

        // Get authenticated user from token
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({
                error: 'Authentication required'
            }), {
                status: 401,
                headers: corsHeaders
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Get user email from Supabase
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
                error: 'Authentication required'
            }), {
                status: 401,
                headers: corsHeaders
            });
        }

        // Get user data from Supabase database
        const userDataResponse = await fetch(
            `${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`,
            {
                headers: {
                    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!userDataResponse.ok) {
            return new Response(JSON.stringify({
                error: 'User not found'
            }), {
                status: 404,
                headers: corsHeaders
            });
        }

        const users = await userDataResponse.json();
        if (!users || users.length === 0 || !users[0].stripe_customer_id) {
            return new Response(JSON.stringify({
                error: 'No billing account found. Please make a purchase first.'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        const customerId = users[0].stripe_customer_id;
        const origin = request.headers.get('origin') || 'https://tabmangment.com';
        const body = await request.json();
        const returnUrl = body.returnUrl || `${origin}/user-dashboard.html`;

        // Create billing portal session using Stripe API
        const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'customer': customerId,
                'return_url': returnUrl
            })
        });

        if (!stripeResponse.ok) {
            const errorData = await stripeResponse.text();
            console.error('Stripe API error:', errorData);
            return new Response(JSON.stringify({
                error: 'Failed to create billing portal session'
            }), {
                status: 500,
                headers: corsHeaders
            });
        }

        const session = await stripeResponse.json();

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
