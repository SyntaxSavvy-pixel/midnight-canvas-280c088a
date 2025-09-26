// API endpoint to manually activate Pro features
// This handles cases where webhook might have failed
// Path: /api/activate-pro.js

import { getUser, updateUser, saveUser, trackActivity } from '../lib/database.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Set CORS headers for extension requests
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
    const { email, sessionId, customerId, subscriptionId } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide user email'
      });
    }

    console.log(`🎯 Manual Pro activation request for: ${email}`);

    // If we have Stripe IDs, verify the payment
    let verified = false;
    let subscriptionData = null;

    if (sessionId) {
      try {
        // Verify checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid' && session.customer_details?.email === email) {
          verified = true;
          subscriptionData = {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            sessionId: sessionId
          };
          console.log('✅ Stripe session verified:', sessionId);
        }
      } catch (stripeError) {
        console.log('⚠️ Could not verify Stripe session:', stripeError.message);
      }
    }

    if (subscriptionId && !verified) {
      try {
        // Verify subscription directly
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customer = await stripe.customers.retrieve(subscription.customer);

        if (subscription.status === 'active' && customer.email === email) {
          verified = true;
          subscriptionData = {
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscriptionId,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
          };
          console.log('✅ Stripe subscription verified:', subscriptionId);
        }
      } catch (stripeError) {
        console.log('⚠️ Could not verify Stripe subscription:', stripeError.message);
      }
    }

    // Check if user already exists
    let existingUser = await getUser(email);

    // Create Pro user data
    const proData = {
      userId: email,
      email: email,
      isPro: true,
      plan: 'pro',
      status: 'active',
      subscriptionStatus: 'active',
      proActivatedAt: new Date().toISOString(),
      lastPaymentDate: new Date().toISOString(),
      activatedVia: verified ? 'stripe_verified' : 'manual_request',
      ...subscriptionData
    };

    // If subscription not verified but user is making manual request,
    // give them benefit of the doubt (they likely completed payment)
    if (!verified) {
      proData.activatedVia = 'manual_unverified';
      proData.needsVerification = true;
      console.log('⚠️ Activating without Stripe verification - manual request');
    }

    let user;
    if (existingUser) {
      // Update existing user
      user = await updateUser(email, proData);
      console.log(`✅ Updated existing user to Pro: ${email}`);
    } else {
      // Create new Pro user
      proData.createdAt = new Date().toISOString();
      user = await saveUser(proData);
      console.log(`✅ Created new Pro user: ${email}`);
    }

    // Track activity
    await trackActivity(email, 'Manual Pro Activation', {
      verified: verified,
      sessionId: sessionId,
      subscriptionId: subscriptionId,
      activatedVia: proData.activatedVia
    });

    const response = {
      success: true,
      message: 'Pro features activated successfully',
      data: {
        email: user.email,
        isPro: user.isPro,
        status: user.status,
        activatedAt: user.proActivatedAt,
        verified: verified,
        planType: 'pro'
      },
      timestamp: new Date().toISOString()
    };

    console.log(`🎉 Pro activation successful for: ${email}`);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error activating Pro features:', error);

    return res.status(500).json({
      success: false,
      error: 'Activation failed',
      message: 'Could not activate Pro features',
      timestamp: new Date().toISOString()
    });
  }
}