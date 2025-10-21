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


        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['subscription', 'customer']
        });


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


        // Get subscription period details
        let currentPeriodStart = null;
        let currentPeriodEnd = null;

        if (session.subscription) {
            const subscription = typeof session.subscription === 'object'
                ? session.subscription
                : await stripe.subscriptions.retrieve(session.subscription);

            currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }

        // IMMEDIATELY update Supabase - don't wait for webhook
        try {
            const updateData = {
                is_pro: true,
                plan_type: 'pro',
                subscription_status: subscriptionStatus,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                stripe_session_id: session_id,
                pro_activated_at: new Date().toISOString(),
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
                last_payment_date: new Date().toISOString(),
                last_payment_amount: session.amount_total / 100 // Convert from cents to dollars
            };

            console.log('📝 Updating Supabase for:', customerEmail);
            console.log('📝 Update data:', JSON.stringify(updateData, null, 2));

            const { data: updateResult, error: updateError } = await supabase
                .from('users_auth')
                .update(updateData)
                .eq('email', customerEmail)
                .select();

            if (updateError) {
                console.error('❌ Supabase update error:', updateError);
                console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
                // Don't fail the request - user still gets Pro based on session
            } else {
                console.log('✅ Supabase updated successfully!');
                console.log('✅ Updated rows:', updateResult);
            }
        } catch (dbError) {
            console.error('❌ Database error:', dbError);
            console.error('❌ Stack trace:', dbError.stack);
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
                currentPeriodStart: currentPeriodStart,
                currentPeriodEnd: currentPeriodEnd,
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
