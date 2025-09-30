// Netlify Function for payment status checks
// Accessible at: /.netlify/functions/status or /api/status (via redirect)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('📡 Status API called');

    // Get email from query params
    const email = event.queryStringParameters?.email || event.queryStringParameters?.user;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Email parameter required'
        })
      };
    }

    console.log('👤 Checking status for:', email);

    // Skip fallback emails - they're always free
    if (email.startsWith('fallback_')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          active: false,
          plan: 'free',
          email: email,
          message: 'Fallback email - free plan'
        })
      };
    }

    // Try to find customer in Stripe
    let stripeCustomer = null;
    let subscription = null;

    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomer.id,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
        }
      }
    } catch (stripeError) {
      console.error('Stripe error:', stripeError.message);
    }

    // Build response
    const response = {
      success: true,
      active: !!subscription,
      plan: subscription ? 'pro' : 'free',
      email: email,
      customerId: stripeCustomer?.id,
      subscriptionId: subscription?.id,
      currentPeriodEnd: subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null
    };

    console.log('📊 Status response:', { email, active: response.active, plan: response.plan });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Status API error:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        active: false,
        plan: 'free',
        error: error.message
      })
    };
  }
};
