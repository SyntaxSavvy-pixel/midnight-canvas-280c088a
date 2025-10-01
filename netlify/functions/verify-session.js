// Netlify Function: /api/verify-session
// Verifies Stripe checkout session and returns subscription status IMMEDIATELY
// Called when user returns from Stripe with session_id

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { session_id } = JSON.parse(event.body || '{}');

        if (!session_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'session_id required'
                })
            };
        }

        console.log('🔍 Verifying session:', session_id);

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['subscription', 'customer']
        });

        console.log('📋 Session status:', session.payment_status, 'Subscription:', session.subscription?.id);

        if (session.payment_status !== 'paid') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: false,
                    paid: false,
                    message: 'Payment not completed'
                })
            };
        }

        // Payment is complete - get customer email
        const customerEmail = session.customer_email || session.customer?.email;

        if (!customerEmail) {
            console.error('❌ No customer email found in session');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'No customer email found'
                })
            };
        }

        // Get subscription details
        let subscriptionStatus = 'active';
        let subscriptionId = null;
        let customerId = session.customer?.id || session.customer;

        if (session.subscription) {
            const subscription = typeof session.subscription === 'object' 
                ? session.subscription 
                : await stripe.subscriptions.retrieve(session.subscription);
            
            subscriptionStatus = subscription.status;
            subscriptionId = subscription.id;
        }

        console.log('✅ Payment verified for:', customerEmail, 'Status:', subscriptionStatus);

        // IMMEDIATELY update Supabase - don't wait for webhook
        try {
            const updateData = {
                is_pro: true,
                subscription_status: subscriptionStatus,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                last_payment_at: new Date().toISOString(),
                plan_updated_at: new Date().toISOString()
            };

            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('email', customerEmail);

            if (updateError) {
                console.error('⚠️ Supabase update error:', updateError);
                // Don't fail the request - user still gets Pro based on session
            } else {
                console.log('✅ User updated to Pro in database:', customerEmail);
            }
        } catch (dbError) {
            console.error('⚠️ Database error:', dbError);
            // Continue anyway - user gets Pro based on valid session
        }

        // Return success with Pro status
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                paid: true,
                plan: 'pro',
                isPro: true,
                email: customerEmail,
                customerId: customerId,
                subscriptionId: subscriptionId,
                subscriptionStatus: subscriptionStatus,
                message: 'Payment verified - Pro activated'
            })
        };

    } catch (error) {
        console.error('❌ Session verification error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
