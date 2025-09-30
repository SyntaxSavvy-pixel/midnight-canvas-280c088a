// Netlify Function: Get user's payment method from Stripe
const Stripe = require('stripe');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get email from query params
        const email = event.queryStringParameters?.email;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email parameter required' })
            };
        }

        // Initialize Stripe
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.error('Stripe secret key not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Stripe not configured' })
            };
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16'
        });

        // Find customer by email
        const customers = await stripe.customers.list({
            email: email,
            limit: 1
        });

        if (customers.data.length === 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    paymentMethod: null,
                    message: 'No customer found'
                })
            };
        }

        const customer = customers.data[0];

        // Get default payment method
        let paymentMethod = null;

        if (customer.invoice_settings?.default_payment_method) {
            // Retrieve the default payment method
            paymentMethod = await stripe.paymentMethods.retrieve(
                customer.invoice_settings.default_payment_method
            );
        } else {
            // Try to get payment methods attached to customer
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customer.id,
                type: 'card',
                limit: 1
            });

            if (paymentMethods.data.length > 0) {
                paymentMethod = paymentMethods.data[0];
            }
        }

        if (!paymentMethod) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    paymentMethod: null,
                    message: 'No payment method on file'
                })
            };
        }

        // Return payment method details (safe fields only)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                paymentMethod: {
                    id: paymentMethod.id,
                    type: paymentMethod.type,
                    card: {
                        brand: paymentMethod.card.brand,
                        last4: paymentMethod.card.last4,
                        exp_month: paymentMethod.card.exp_month,
                        exp_year: paymentMethod.card.exp_year,
                        funding: paymentMethod.card.funding,
                        country: paymentMethod.card.country
                    },
                    created: paymentMethod.created
                }
            })
        };

    } catch (error) {
        console.error('Error fetching payment method:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch payment method',
                message: error.message
            })
        };
    }
};