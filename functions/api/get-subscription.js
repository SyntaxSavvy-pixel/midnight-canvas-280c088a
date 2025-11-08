// Cloudflare Pages Function: /api/get-subscription
// Returns real subscription data from Stripe including accurate billing date

import { isAdmin } from './admin-config.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Check if user is admin first
    const adminStatus = isAdmin(email);

    if (adminStatus) {
      // Admin users get unlimited access with far-future billing date
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100);

      return new Response(JSON.stringify({
        success: true,
        isPro: true,
        isAdmin: true,
        subscriptionStatus: 'active',
        subscriptionType: 'admin',
        currentPeriodEnd: farFuture.toISOString(),
        nextBillingDate: farFuture.toISOString()
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Fetch user data from database
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users_auth?email=eq.${encodeURIComponent(email)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!userResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch user data'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const users = await userResponse.json();

    if (!users || users.length === 0) {
      // User not found - return free plan
      return new Response(JSON.stringify({
        success: true,
        isPro: false,
        subscriptionStatus: 'inactive',
        subscriptionType: 'free',
        currentPeriodEnd: null,
        nextBillingDate: null
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    const user = users[0];

    // Return user subscription data from database
    // The database is updated by Stripe webhooks, so this is the source of truth
    return new Response(JSON.stringify({
      success: true,
      isPro: user.is_pro || false,
      subscriptionStatus: user.subscription_status || 'inactive',
      subscriptionType: user.plan_type || 'free',
      currentPeriodEnd: user.current_period_end || user.next_billing_date,
      nextBillingDate: user.next_billing_date || user.current_period_end,
      stripeCustomerId: user.stripe_customer_id,
      stripeSubscriptionId: user.stripe_subscription_id
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
