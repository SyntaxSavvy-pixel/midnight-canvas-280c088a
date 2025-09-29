// Netlify Function: /api/stripe-webhook
// Handles Stripe webhook events for subscription updates

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
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

    const sig = event.headers['stripe-signature'];
    let stripeEvent;

    try {
        // Parse the raw body (Netlify automatically parses JSON, so we need the raw body)
        const body = event.body;
        stripeEvent = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
        console.error(`❌ Webhook signature verification failed:`, err.message);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Webhook signature verification failed' })
        };
    }

    console.log('📬 Received webhook event:', stripeEvent.type);

    try {
        // Handle the event
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(stripeEvent.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(stripeEvent.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(stripeEvent.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(stripeEvent.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(stripeEvent.data.object);
                break;

            default:
                console.log(`⚠️ Unhandled event type: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Webhook processing failed' })
        };
    }
};

async function handleCheckoutCompleted(session) {
    console.log('✅ Checkout completed for session:', session.id);

    const customerEmail = session.customer_email || session.metadata?.userEmail;

    if (!customerEmail) {
        console.error('❌ No customer email found in session');
        return;
    }

    try {
        // Update user as Pro in Supabase
        const { error } = await supabase
            .from('users')
            .update({
                is_pro: true,
                subscription_status: 'active',
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                last_payment_at: new Date().toISOString()
            })
            .eq('email', customerEmail);

        if (error) throw error;

        console.log('✅ User updated to Pro:', customerEmail);
    } catch (error) {
        console.error('❌ Error updating user after checkout:', error);
    }
}

async function handlePaymentSucceeded(invoice) {
    console.log('💳 Payment succeeded for invoice:', invoice.id);

    try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);

        const { error } = await supabase
            .from('users')
            .update({
                is_pro: true,
                subscription_status: 'active',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                last_payment_at: new Date().toISOString()
            })
            .eq('email', customer.email);

        if (error) throw error;

        console.log('✅ User subscription renewed:', customer.email);
    } catch (error) {
        console.error('❌ Error processing payment success:', error);
    }
}

async function handlePaymentFailed(invoice) {
    console.log('❌ Payment failed for invoice:', invoice.id);

    try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);

        const { error } = await supabase
            .from('users')
            .update({
                subscription_status: 'past_due',
                last_failed_payment_at: new Date().toISOString()
            })
            .eq('email', customer.email);

        if (error) throw error;

        console.log('⚠️ User marked as past due:', customer.email);
    } catch (error) {
        console.error('❌ Error processing payment failure:', error);
    }
}

async function handleSubscriptionUpdated(subscription) {
    console.log('🔄 Subscription updated:', subscription.id);

    try {
        const customer = await stripe.customers.retrieve(subscription.customer);

        const { error } = await supabase
            .from('users')
            .update({
                is_pro: subscription.status === 'active',
                subscription_status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq('email', customer.email);

        if (error) throw error;

        console.log('✅ User subscription status updated:', customer.email, subscription.status);
    } catch (error) {
        console.error('❌ Error updating subscription:', error);
    }
}

async function handleSubscriptionDeleted(subscription) {
    console.log('🗑️ Subscription deleted:', subscription.id);

    try {
        const customer = await stripe.customers.retrieve(subscription.customer);

        const { error } = await supabase
            .from('users')
            .update({
                is_pro: false,
                subscription_status: 'cancelled'
            })
            .eq('email', customer.email);

        if (error) throw error;

        console.log('✅ User subscription cancelled:', customer.email);
    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
    }
}