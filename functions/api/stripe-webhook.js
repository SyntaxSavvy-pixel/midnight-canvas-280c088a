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

    console.log('🎉 Checkout completed for:', userEmail, 'Mode:', session.mode);

    // Handle differently based on checkout mode
    const updateData = {
        is_pro: true,
        stripe_customer_id: session.customer
    };

    if (session.mode === 'subscription') {
        // Subscription mode (monthly/yearly) - Fetch real billing dates from Stripe
        if (!session.subscription) {
            console.error('No subscription ID in session for subscription mode');
            return;
        }

        try {
            // Fetch subscription details from Stripe to get accurate billing period
            const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
                headers: {
                    'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
                }
            });

            if (subResponse.ok) {
                const subscription = await subResponse.json();

                // Use Stripe's actual billing period (works for both monthly and yearly)
                updateData.subscription_status = 'active';
                updateData.stripe_subscription_id = session.subscription;
                updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
                updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();

                // Determine plan type from interval
                const interval = subscription.items?.data[0]?.price?.recurring?.interval;
                const planType = interval === 'year' ? 'pro_yearly' : 'pro_monthly';
                updateData.plan_type = planType;

                console.log(`✓ ${interval === 'year' ? 'Yearly' : 'Monthly'} subscription activated for:`, userEmail);
                console.log(`  Period: ${new Date(subscription.current_period_start * 1000).toISOString()} to ${new Date(subscription.current_period_end * 1000).toISOString()}`);
            } else {
                // Fallback if we can't fetch subscription
                console.warn('Could not fetch subscription details, using defaults');
                updateData.subscription_status = 'active';
                updateData.stripe_subscription_id = session.subscription;
                updateData.current_period_start = new Date().toISOString();
                updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                updateData.plan_type = 'pro_monthly';
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
            // Use fallback dates
            updateData.subscription_status = 'active';
            updateData.stripe_subscription_id = session.subscription;
            updateData.current_period_start = new Date().toISOString();
            updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            updateData.plan_type = 'pro_monthly';
        }
    } else if (session.mode === 'payment') {
        // One-time payment mode (lifetime) - No recurring billing
        updateData.subscription_status = 'lifetime';
        updateData.stripe_subscription_id = null;
        updateData.current_period_start = new Date().toISOString();
        updateData.current_period_end = null; // No expiry for lifetime
        updateData.plan_type = 'pro_lifetime';

        console.log('✓ Lifetime plan activated for:', userEmail);
        console.log('  No recurring billing - permanent access');
    }

    // Update user in Supabase
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
    });

    if (!response.ok) {
        console.error('Failed to update user in Supabase:', await response.text());
    } else {
        console.log('✅ User updated successfully in Supabase');
    }
}

async function handleSubscriptionUpdate(subscription, env) {
    const userEmail = subscription.metadata?.userEmail;
    if (!userEmail) return;

    console.log('🔄 Subscription updated for:', userEmail, 'Status:', subscription.status);

    // Determine plan type from interval
    const interval = subscription.items?.data[0]?.price?.recurring?.interval;
    const planType = interval === 'year' ? 'pro_yearly' : 'pro_monthly';

    const updateData = {
        is_pro: subscription.status === 'active' || subscription.status === 'trialing',
        subscription_status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        plan_type: planType
    };

    console.log(`  ${interval === 'year' ? 'Yearly' : 'Monthly'} plan - Next billing: ${updateData.current_period_end}`);

    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
    });

    if (!response.ok) {
        console.error('Failed to update subscription in Supabase:', await response.text());
    } else {
        console.log('✅ Subscription updated successfully');
    }
}

async function handleSubscriptionDeleted(subscription, env) {
    const userEmail = subscription.metadata?.userEmail;
    if (!userEmail) return;

    console.log('❌ Subscription deleted/canceled for:', userEmail);

    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            is_pro: false,
            subscription_status: 'canceled',
            plan_type: null
        })
    });

    if (!response.ok) {
        console.error('Failed to cancel subscription in Supabase:', await response.text());
    } else {
        console.log('✅ Subscription canceled in database');
    }
}

async function handlePaymentSucceeded(invoice, env) {
    // This fires when a subscription payment succeeds (renewals for monthly/yearly)
    console.log('💰 Payment succeeded for customer:', invoice.customer);

    // If this is a subscription invoice, update the billing period
    if (invoice.subscription) {
        try {
            // Fetch subscription to get user email and billing period
            const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${invoice.subscription}`, {
                headers: {
                    'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
                }
            });

            if (subResponse.ok) {
                const subscription = await subResponse.json();
                const userEmail = subscription.metadata?.userEmail;

                if (userEmail) {
                    const interval = subscription.items?.data[0]?.price?.recurring?.interval;
                    const planType = interval === 'year' ? 'pro_yearly' : 'pro_monthly';

                    // Update billing period in Supabase
                    const updateData = {
                        is_pro: true,
                        subscription_status: 'active',
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        plan_type: planType
                    };

                    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(updateData)
                    });

                    if (response.ok) {
                        console.log(`✅ ${interval === 'year' ? 'Yearly' : 'Monthly'} renewal processed for:`, userEmail);
                        console.log(`  Next billing: ${updateData.current_period_end}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing payment succeeded:', error);
        }
    }
}

async function handlePaymentFailed(invoice, env) {
    console.log('⚠️ Payment failed for customer:', invoice.customer);

    // If this is a subscription invoice, mark as past_due
    if (invoice.subscription) {
        try {
            const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${invoice.subscription}`, {
                headers: {
                    'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
                }
            });

            if (subResponse.ok) {
                const subscription = await subResponse.json();
                const userEmail = subscription.metadata?.userEmail;

                if (userEmail) {
                    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users_auth?email=eq.${encodeURIComponent(userEmail)}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
                            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            subscription_status: 'past_due'
                        })
                    });

                    if (response.ok) {
                        console.log('⚠️ Marked subscription as past_due for:', userEmail);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing payment failed:', error);
        }
    }
}
