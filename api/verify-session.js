// Vercel API Route: /api/verify-session
// Verifies Stripe checkout session and returns payment status

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                error: 'Missing sessionId',
                verified: false
            });
        }

        console.log('🔍 Verifying Stripe session:', sessionId);

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'customer', 'line_items']
        });

        if (!session) {
            return res.status(404).json({
                error: 'Session not found',
                verified: false
            });
        }

        console.log('📋 Session retrieved:', {
            id: session.id,
            payment_status: session.payment_status,
            status: session.status,
            customer: session.customer,
            subscription: session.subscription?.id
        });

        // Check if payment was completed
        const isPaid = session.payment_status === 'paid' && session.status === 'complete';

        // Get subscription details if it exists
        let subscriptionData = null;
        if (session.subscription) {
            const subscription = typeof session.subscription === 'string'
                ? await stripe.subscriptions.retrieve(session.subscription)
                : session.subscription;

            subscriptionData = {
                id: subscription.id,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end
            };
        }

        // Get customer details
        const customer = typeof session.customer === 'string'
            ? await stripe.customers.retrieve(session.customer)
            : session.customer;

        // Prepare response
        const response = {
            verified: isPaid,
            sessionId: session.id,
            paymentStatus: session.payment_status,
            sessionStatus: session.status,
            customerId: customer?.id,
            customerEmail: customer?.email,
            subscriptionId: subscriptionData?.id,
            subscriptionStatus: subscriptionData?.status,
            currentPeriodStart: subscriptionData?.current_period_start,
            currentPeriodEnd: subscriptionData?.current_period_end,
            cancelAtPeriodEnd: subscriptionData?.cancel_at_period_end,
            userId: session.client_reference_id || session.metadata?.userId,
            metadata: session.metadata,
            amountTotal: session.amount_total,
            currency: session.currency
        };

        console.log('✅ Session verification result:', {
            verified: response.verified,
            paymentStatus: response.paymentStatus,
            subscriptionStatus: response.subscriptionStatus,
            currentPeriodEnd: response.currentPeriodEnd
        });

        return res.status(200).json(response);

    } catch (error) {
        console.error('❌ Session verification failed:', error);

        // Handle specific Stripe errors
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                error: 'Invalid session ID',
                verified: false
            });
        }

        return res.status(500).json({
            error: 'Session verification failed',
            verified: false,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}