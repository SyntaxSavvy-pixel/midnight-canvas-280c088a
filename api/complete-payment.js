// API endpoint to complete payment and activate Pro features
// This is called from payment-success.html after successful Stripe payment
// Updated to work with authenticated user system

const Stripe = require('stripe');

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { session_id, email, source } = req.body;

        console.log('🎯 Processing payment completion:', { session_id, email, source });

        if (!session_id && !email) {
            return res.status(400).json({
                error: 'Missing required fields: session_id or email required'
            });
        }

        let userToUpdate = null;
        let targetEmail = email;

        // If we have a session_id, verify it with Stripe first
        if (session_id) {
            try {
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                const session = await stripe.checkout.sessions.retrieve(session_id);

                if (session.payment_status === 'paid') {
                    // Get email from Stripe session
                    const stripeEmail = session.customer_email ||
                                      session.customer_details?.email ||
                                      session.metadata?.userEmail;

                    if (stripeEmail) {
                        targetEmail = stripeEmail;
                        console.log('💳 Stripe session verified, email:', targetEmail);
                    }
                } else {
                    console.log('⚠️ Stripe session payment not completed:', session.payment_status);
                    return res.status(400).json({
                        success: false,
                        error: 'Payment not completed'
                    });
                }
            } catch (stripeError) {
                console.error('❌ Stripe session verification failed:', stripeError);
                return res.status(400).json({
                    success: false,
                    error: 'Invalid session ID'
                });
            }
        }

        if (!targetEmail) {
            return res.status(400).json({
                success: false,
                error: 'Could not determine user email'
            });
        }

        // Try to find existing user in our auth system
        try {
            if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
                const { kv } = await import('@vercel/kv');
                userToUpdate = await kv.get(`user:${targetEmail}`);

                if (userToUpdate) {
                    console.log('✅ Found existing user:', targetEmail);

                    // Update user with Pro status
                    const updatedUser = {
                        ...userToUpdate,
                        isPro: true,
                        planType: 'pro',
                        proActivatedAt: new Date().toISOString(),
                        stripeSessionId: session_id,
                        paymentCompletedAt: new Date().toISOString(),
                        lastUpdatedAt: new Date().toISOString()
                    };

                    // Save updated user
                    await kv.set(`user:${targetEmail}`, updatedUser);
                    console.log('✅ User Pro status activated successfully');

                    return res.status(200).json({
                        success: true,
                        message: 'Pro features activated successfully',
                        user: {
                            email: updatedUser.email,
                            name: updatedUser.name,
                            isPro: updatedUser.isPro,
                            planType: updatedUser.planType,
                            proActivatedAt: updatedUser.proActivatedAt
                        }
                    });

                } else {
                    console.log('⚠️ User not found in auth system, creating temporary Pro user');

                    // Create a temporary Pro user for users who paid but aren't registered
                    const tempProUser = {
                        email: targetEmail,
                        name: targetEmail.split('@')[0],
                        isPro: true,
                        planType: 'pro',
                        isTemporary: true,
                        proActivatedAt: new Date().toISOString(),
                        stripeSessionId: session_id,
                        paymentCompletedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        lastUpdatedAt: new Date().toISOString(),
                        source: 'payment_without_registration'
                    };

                    await kv.set(`user:${targetEmail}`, tempProUser);
                    console.log('✅ Temporary Pro user created');

                    return res.status(200).json({
                        success: true,
                        message: 'Pro features activated successfully',
                        note: 'Create an account to fully manage your subscription',
                        user: {
                            email: tempProUser.email,
                            name: tempProUser.name,
                            isPro: tempProUser.isPro,
                            planType: tempProUser.planType,
                            proActivatedAt: tempProUser.proActivatedAt,
                            isTemporary: tempProUser.isTemporary
                        }
                    });
                }
            }
        } catch (error) {
            console.error('❌ Database error:', error);
        }

        // Fallback response if KV is not available
        console.log('⚠️ KV not available, returning success for Stripe webhook');

        return res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            note: 'Please contact support if Pro features are not activated',
            data: {
                email: targetEmail,
                stripeSessionId: session_id,
                processedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Payment completion error:', error);

        return res.status(500).json({
            success: false,
            error: 'Payment completion failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}