// Vercel API Route: /api/create-checkout-session
// Creates a Stripe Checkout session for Pro plan purchase

const Stripe = require('stripe');
import { getUser } from '../lib/database-supabase.js';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get authenticated user from token
        const authHeader = req.headers.authorization;
        let authenticatedUser = null;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            try {
                // Decode simple token
                const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
                if (tokenData.email && tokenData.exp > Math.floor(Date.now() / 1000)) {
                    // Get user from Supabase
                    try {
                        authenticatedUser = await getUser(tokenData.email);
                    } catch (dbError) {
                        console.error('❌ Database error:', dbError);
                    }
                }
            } catch (authError) {
                console.log('⚠️ Auth token invalid:', authError.message);
            }
        }

        if (!authenticatedUser) {
            return res.status(401).json({
                error: 'Authentication required. Please log in first.'
            });
        }

        const { priceId } = req.body;

        if (!priceId) {
            return res.status(400).json({
                error: 'Missing required field: priceId'
            });
        }

        console.log('Creating checkout session for:', {
            email: authenticatedUser.email,
            name: authenticatedUser.name,
            priceId
        });

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            customer_email: authenticatedUser.email,
            client_reference_id: authenticatedUser.email, // Use email as reference
            metadata: {
                userEmail: authenticatedUser.email,
                userName: authenticatedUser.name,
                plan: 'pro'
            },
            success_url: `https://tabmangment-extension-bz4chus0i-kavon-hicks-projects.vercel.app/payment-success.html?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(authenticatedUser.email)}`,
            cancel_url: `https://tabmangment-extension-bz4chus0i-kavon-hicks-projects.vercel.app/dashboard.html`,
            billing_address_collection: 'auto',
            tax_id_collection: {
                enabled: true
            },
            automatic_tax: {
                enabled: true
            },
            allow_promotion_codes: true,
            subscription_data: {
                metadata: {
                    userEmail: authenticatedUser.email,
                    userName: authenticatedUser.name,
                    plan: 'pro'
                }
            }
        });

        console.log('✅ Checkout session created:', session.id);

        // Return session data
        res.status(200).json({
            sessionId: session.id,
            url: session.url,
            customerId: session.customer,
            subscriptionId: session.subscription
        });

    } catch (error) {
        console.error('❌ Stripe checkout session creation failed:', error);

        // Handle specific Stripe errors
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ error: error.message });
        }

        if (error.type === 'StripeRateLimitError') {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }

        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ error: 'Invalid request parameters.' });
        }

        if (error.type === 'StripeAPIError') {
            return res.status(500).json({ error: 'Stripe API error. Please try again.' });
        }

        if (error.type === 'StripeConnectionError') {
            return res.status(500).json({ error: 'Network error. Please check your connection.' });
        }

        if (error.type === 'StripeAuthenticationError') {
            return res.status(500).json({ error: 'Authentication error.' });
        }

        // Generic error
        res.status(500).json({
            error: 'Failed to create checkout session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}