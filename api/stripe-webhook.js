// Production Stripe webhook handler
// Path: /api/stripe-webhook.js
// Updated to work with authenticated user system

import Stripe from 'stripe';
// Dynamic imports for Supabase functions

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_development_webhook_secret';

// Disable body parsing for raw webhook payload
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;

  try {
    // Verify webhook signature
    let buf;
    if (req.body) {
      buf = Buffer.from(JSON.stringify(req.body));
    } else {
      // Read raw body
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      await new Promise(resolve => req.on('end', resolve));
      buf = Buffer.concat(chunks);
    }

    const sig = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    console.log('✅ Webhook verified:', event.type);

  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // Handle different webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`⚪ Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handle successful checkout
async function handleCheckoutCompleted(session) {
  try {
    console.log('🎉 Checkout completed:', session.id);

    const customerEmail = session.customer_details?.email || session.customer_email;
    const userId = session.metadata?.userId;
    const userEmail = session.metadata?.userEmail;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Get email from session (prioritize metadata)
    const targetEmail = userEmail || customerEmail;

    if (!targetEmail) {
      throw new Error('No customer email found in session');
    }

    console.log('📧 Processing webhook for email:', targetEmail);

    // Get subscription details if available
    let subscription = null;
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    }

    // Update user in Supabase
    try {
      const { getUser, saveUser, updateUser } = await import('../lib/database-supabase.js');

      // Try to get existing user
      let existingUser = await getUser(targetEmail);

      if (existingUser) {
        console.log('✅ Found existing user, updating to Pro');

        // Update user with Pro status and Stripe details
        await updateUser(targetEmail, {
          isPro: true,
          subscriptionStatus: 'active',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPeriodEnd: subscription ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          lastPaymentAt: new Date().toISOString()
        });

        console.log(`✅ User ${targetEmail} upgraded to Pro via webhook`);

      } else {
        console.log(`⚠️ User ${targetEmail} not found - payment succeeded but no account exists`);
        // Create user if they don't exist (backup case)
        await saveUser({
          email: targetEmail,
          userId: targetEmail,
          isPro: true,
          subscriptionStatus: 'active',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPeriodEnd: subscription ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          lastPaymentAt: new Date().toISOString()
        });
        console.log(`✅ Created new Pro user ${targetEmail} via webhook`);
      }
    } catch (dbError) {
      console.error('❌ Supabase error:', dbError);
    }

    console.log(`✅ Webhook processed successfully for ${targetEmail}`);

  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
    throw error;
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
  try {
    console.log('📝 Subscription created:', subscription.id);

    const customer = await stripe.customers.retrieve(subscription.customer);
    const targetEmail = subscription.metadata?.userEmail || customer.email;

    if (!targetEmail) {
      console.log('⚠️ No email found for subscription creation');
      return;
    }

    const { updateUser } = await import('../lib/database-supabase.js');
    await updateUser(targetEmail, {
      isPro: true,
      subscriptionStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });

    console.log(`✅ Subscription created for user: ${targetEmail}`);

  } catch (error) {
    console.error('❌ Error handling subscription creation:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('🔄 Subscription updated:', subscription.id);

    const customer = await stripe.customers.retrieve(subscription.customer);
    const targetEmail = subscription.metadata?.userEmail || customer.email;

    if (!targetEmail) {
      console.log('⚠️ No email found for subscription update');
      return;
    }

    const isPro = subscription.status === 'active';

    const { updateUser } = await import('../lib/database-supabase.js');
    await updateUser(targetEmail, {
      isPro: isPro,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });

    console.log(`✅ Subscription updated for user: ${targetEmail}, status: ${subscription.status}`);

  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
  }
}

// Handle subscription cancellation/deletion
async function handleSubscriptionDeleted(subscription) {
  try {
    console.log('❌ Subscription deleted:', subscription.id);

    const customer = await stripe.customers.retrieve(subscription.customer);
    const targetEmail = subscription.metadata?.userEmail || customer.email;

    if (!targetEmail) {
      console.log('⚠️ No email found for subscription deletion');
      return;
    }

    const { updateUser } = await import('../lib/database-supabase.js');
    await updateUser(targetEmail, {
      isPro: false,
      subscriptionStatus: 'cancelled',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });

    console.log(`✅ Pro access revoked for user: ${targetEmail}`);

  } catch (error) {
    console.error('❌ Error handling subscription deletion:', error);
  }
}

// Handle successful payments (renewals)
async function handlePaymentSucceeded(invoice) {
  try {
    console.log('💰 Payment succeeded:', invoice.id);

    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const customer = await stripe.customers.retrieve(subscription.customer);
      const targetEmail = subscription.metadata?.userEmail || customer.email;

      if (!targetEmail) {
        console.log('⚠️ No email found for payment success');
        return;
      }

      const paymentAmount = (invoice.amount_paid || 0) / 100;

      const { updateUser } = await import('../lib/database-supabase.js');
      await updateUser(targetEmail, {
        isPro: true,
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        lastPaymentAt: new Date().toISOString()
      });

      console.log(`✅ Payment processed for user: ${targetEmail}`);
    }

  } catch (error) {
    console.error('❌ Error handling payment success:', error);
  }
}

// Handle failed payments
async function handlePaymentFailed(invoice) {
  try {
    console.log('💸 Payment failed:', invoice.id);

    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const customer = await stripe.customers.retrieve(subscription.customer);
      const targetEmail = subscription.metadata?.userEmail || customer.email;

      if (!targetEmail) {
        console.log('⚠️ No email found for payment failure');
        return;
      }

      // Don't immediately revoke Pro access - Stripe handles retry logic
      const { updateUser } = await import('../lib/database-supabase.js');
      await updateUser(targetEmail, {
        subscriptionStatus: 'past_due',
        lastFailedPaymentAt: new Date().toISOString()
      });

      console.log(`⚠️ Payment failed for user: ${targetEmail}`);
    }

  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
  }
}

