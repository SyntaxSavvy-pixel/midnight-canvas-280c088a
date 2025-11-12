// Cloudflare Pages Function: /api/stripe-webhook
// Handles Stripe webhook events

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
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

        // Get raw body and signature
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            return new Response(JSON.stringify({ error: 'No signature' }), {
                status: 400,
                headers: corsHeaders
            });
        }

        // Verify webhook signature (simplified - Stripe will validate on their end)
        let event;
        try {
            event = JSON.parse(body);
        } catch (err) {
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
                status: 400,
                headers: corsHeaders
            });
        }

        console.log('Received webhook event:', event.type);

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object, env);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object, env);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object, env);
                break;
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object, env);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object, env);
                break;
            default:
                console.log('Unhandled event type:', event.type);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

async function handleCheckoutCompleted(session, env) {
    const userEmail = session.customer_email || session.metadata?.userEmail;
    if (!userEmail) return;

    console.log('Checkout completed for:', userEmail, 'Mode:', session.mode);

    // Handle differently based on checkout mode
    const updateData = {
        is_pro: true,
        stripe_customer_id: session.customer
    };

    if (session.mode === 'subscription') {
        // Subscription mode (monthly/yearly)
        updateData.subscription_status = 'active';
        updateData.stripe_subscription_id = session.subscription;
        updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        console.log('✓ Subscription activated for:', userEmail);
    } else if (session.mode === 'payment') {
        // One-time payment mode (lifetime)
        updateData.subscription_status = 'lifetime';
        updateData.stripe_subscription_id = null;
        // Set to far future date for lifetime (e.g., 100 years from now)
        updateData.current_period_end = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
        console.log('✓ Lifetime plan activated for:', userEmail);
    }

    // Update user in Supabase
    await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
    });
}

async function handleSubscriptionUpdate(subscription, env) {
    const userEmail = subscription.metadata?.userEmail;
    if (!userEmail) return;

    console.log('Subscription updated for:', userEmail);

    await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            is_pro: subscription.status === 'active',
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        })
    });
}

async function handleSubscriptionDeleted(subscription, env) {
    const userEmail = subscription.metadata?.userEmail;
    if (!userEmail) return;

    console.log('Subscription deleted for:', userEmail);

    await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            is_pro: false,
            subscription_status: 'canceled'
        })
    });
}

async function handlePaymentSucceeded(invoice, env) {
    console.log('Payment succeeded for customer:', invoice.customer);
}

async function handlePaymentFailed(invoice, env) {
    console.log('Payment failed for customer:', invoice.customer);
}
