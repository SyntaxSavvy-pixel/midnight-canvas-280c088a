// Production Stripe webhook handler
// Path: /api/stripe-webhook.js
// Updated to work with authenticated user system

import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
    const buf = await buffer(req);
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

    // Update user in our authentication system
    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');

        // Try to get existing user
        let existingUser = await kv.get(`user:${targetEmail}`);

        if (existingUser) {
          console.log('✅ Found existing user, updating to Pro');

          // Simple Pro activation - just update the key fields
          const updatedUser = {
            ...existingUser,
            isPro: true,
            planType: 'pro',
            proActivatedAt: new Date().toISOString(),
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            lastUpdatedAt: new Date().toISOString()
          };

          await kv.set(`user:${targetEmail}`, updatedUser);
          console.log(`✅ User ${targetEmail} upgraded to Pro via webhook`);

        } else {
          console.log(`⚠️ User ${targetEmail} not found - payment succeeded but no account exists`);
          // In the new flow, users MUST be logged in to pay, so this shouldn't happen
          // But we'll log it for debugging
        }
      }
    } catch (kvError) {
      console.error('❌ KV storage error:', kvError);
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

    await updateUserInKV(targetEmail, {
      isPro: true,
      subscriptionStatus: subscription.status,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      lastUpdatedAt: new Date().toISOString()
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

    await updateUserInKV(targetEmail, {
      isPro: isPro,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      lastUpdatedAt: new Date().toISOString()
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

    await updateUserInKV(targetEmail, {
      isPro: false,
      subscriptionStatus: 'cancelled',
      cancelledAt: new Date().toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      lastUpdatedAt: new Date().toISOString()
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

      await updateUserInKV(targetEmail, {
        isPro: true,
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        lastPaymentDate: new Date().toISOString(),
        lastPaymentAmount: paymentAmount,
        lastUpdatedAt: new Date().toISOString()
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
      await updateUserInKV(targetEmail, {
        subscriptionStatus: 'past_due',
        lastFailedPaymentAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      });

      console.log(`⚠️ Payment failed for user: ${targetEmail}`);
    }

  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
  }
}

// Helper function to update user in KV storage
async function updateUserInKV(email, updates) {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');

      // Get existing user
      let existingUser = await kv.get(`user:${email}`);

      if (existingUser) {
        // Update existing user
        const updatedUser = {
          ...existingUser,
          ...updates
        };

        await kv.set(`user:${email}`, updatedUser);
        console.log(`✅ User ${email} updated in KV`);
      } else {
        console.log(`⚠️ User ${email} not found for update`);
      }
    }
  } catch (error) {
    console.error('❌ KV update error:', error);
  }
}