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

    const customerEmail = session.customer_email || session.metadata?.userEmail;

    if (!customerEmail) {
        console.error('❌ No customer email found in session');
        return;
    }

    try {
        // Update user as Pro in Supabase
        const { error } = await supabase
            .from('users_auth')
            .update({
                is_pro: true,
                subscription_status: 'active',
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                last_payment_at: new Date().toISOString(),
                plan_updated_at: new Date().toISOString()
            })
            .eq('email', customerEmail);

        if (error) throw error;


        // Create notification for real-time updates
        await createSubscriptionNotification(customerEmail, 'activated', 'pro');
    } catch (error) {
        console.error('❌ Error updating user after checkout:', error);
    }
}

async function handlePaymentSucceeded(invoice) {

    try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);

        const { error } = await supabase
            .from('users_auth')
            .update({
                is_pro: true,
                subscription_status: 'active',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                last_payment_at: new Date().toISOString()
            })
            .eq('email', customer.email);

        if (error) throw error;

    } catch (error) {
        console.error('❌ Error processing payment success:', error);
    }
}

async function handlePaymentFailed(invoice) {

    try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);

        const { error } = await supabase
            .from('users_auth')
            .update({
                subscription_status: 'past_due',
                last_failed_payment_at: new Date().toISOString()
            })
            .eq('email', customer.email);

        if (error) throw error;

    } catch (error) {
        console.error('❌ Error processing payment failure:', error);
    }
}

async function handleSubscriptionUpdated(subscription) {

    try {
        const customer = await stripe.customers.retrieve(subscription.customer);
        const isPro = subscription.status === 'active';

        // Prepare update data
        const updateData = {
            is_pro: isPro,
            subscription_status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            plan_updated_at: new Date().toISOString()
        };

        // If user cancelled but still in billing period, track cancellation date
        // They keep Pro until period ends
        if (subscription.cancel_at_period_end) {
            updateData.cancelled_at = subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : new Date().toISOString();
            updateData.subscription_status = 'cancelling'; // Will end at period_end
        } else {
            // Re-activated subscription, clear cancellation
            updateData.cancelled_at = null;
        }

        const { error } = await supabase
            .from('users_auth')
            .update(updateData)
            .eq('email', customer.email);

        if (error) throw error;

        console.log(`✅ Subscription updated for ${customer.email}:`, {
            isPro,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: updateData.current_period_end
        });

        // Create notification for real-time updates
        await createSubscriptionNotification(customer.email, 'updated', isPro ? 'pro' : 'free');
    } catch (error) {
        console.error('❌ Error updating subscription:', error);
    }
}

async function handleSubscriptionDeleted(subscription) {

    try {
        const customer = await stripe.customers.retrieve(subscription.customer);

        const { error } = await supabase
            .from('users_auth')
            .update({
                is_pro: false,
                plan_type: 'free',
                subscription_status: 'cancelled',
                stripe_subscription_id: null,
                plan_updated_at: new Date().toISOString()
            })
            .eq('email', customer.email);

        if (error) throw error;

        console.log(`✅ Subscription ended for ${customer.email} - downgraded to Free`);

        // Create notification for real-time updates
        await createSubscriptionNotification(customer.email, 'cancelled', 'free');
    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
    }
}

// Create subscription update notification in Supabase for real-time polling
async function createSubscriptionNotification(email, action, plan) {
    try {
        const { error } = await supabase
            .from('subscription_updates')
            .insert({
                user_email: email,
                action: action,
                plan: plan,
                created_at: new Date().toISOString()
            });

        if (error) {
            // Table might not exist, which is ok - we'll use polling fallback
        } else {
        }
    } catch (error) {
    }
}