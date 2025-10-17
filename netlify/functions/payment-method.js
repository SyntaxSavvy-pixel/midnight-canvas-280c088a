// Netlify Function to get payment method from Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const email = event.queryStringParameters?.email;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }


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
          hasPaymentMethod: false,
          message: 'No customer found'
        })
      };
    }

    const customer = customers.data[0];

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
      limit: 1
    });

    if (paymentMethods.data.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasPaymentMethod: false,
          message: 'No payment method found'
        })
      };
    }

    const pm = paymentMethods.data[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasPaymentMethod: true,
        card: {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year
        }
      })
    };

  } catch (error) {
    console.error('Payment method error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        hasPaymentMethod: false
      })
    };
  }
};
