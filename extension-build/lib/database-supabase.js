// Database operations using Supabase
// Path: /lib/database.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

/*
First, create this table in Supabase:

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_pro BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_payment_at TIMESTAMPTZ,
  last_failed_payment_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_pro ON users(is_pro);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
*/

// Save or create user
export async function saveUser(userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        user_id: userData.userId || userData.email,
        email: userData.email,
        is_pro: userData.isPro || false,
        subscription_status: userData.subscriptionStatus || 'free',
        stripe_customer_id: userData.stripeCustomerId,
        stripe_subscription_id: userData.stripeSubscriptionId,
        current_period_end: userData.currentPeriodEnd,
        last_payment_at: userData.lastPaymentAt,
        last_failed_payment_at: userData.lastFailedPaymentAt
      })
      .select()
      .single();

    if (error) throw error;

    return data;

  } catch (error) {
    throw error;
  }
}

// Get user by ID or email
export async function getUser(identifier) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`user_id.eq.${identifier},email.eq.${identifier}`)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    if (!data) {
      return null;
    }


    // Convert to camelCase for consistency
    return {
      userId: data.user_id,
      email: data.email,
      isPro: data.is_pro,
      subscriptionStatus: data.subscription_status,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      currentPeriodEnd: data.current_period_end,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastPaymentAt: data.last_payment_at,
      lastFailedPaymentAt: data.last_failed_payment_at
    };

  } catch (error) {
    throw error;
  }
}

// Update user data
export async function updateUser(identifier, updates) {
  try {
    // Convert camelCase to snake_case for database
    const dbUpdates = {};
    if (updates.isPro !== undefined) dbUpdates.is_pro = updates.isPro;
    if (updates.subscriptionStatus) dbUpdates.subscription_status = updates.subscriptionStatus;
    if (updates.stripeCustomerId) dbUpdates.stripe_customer_id = updates.stripeCustomerId;
    if (updates.stripeSubscriptionId) dbUpdates.stripe_subscription_id = updates.stripeSubscriptionId;
    if (updates.currentPeriodEnd) dbUpdates.current_period_end = updates.currentPeriodEnd;
    if (updates.lastPaymentAt) dbUpdates.last_payment_at = updates.lastPaymentAt;
    if (updates.lastFailedPaymentAt) dbUpdates.last_failed_payment_at = updates.lastFailedPaymentAt;

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .or(`user_id.eq.${identifier},email.eq.${identifier}`)
      .select()
      .single();

    if (error) throw error;

    return data;

  } catch (error) {
    throw error;
  }
}

// Get all Pro users (for analytics)
export async function getProUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_pro', true);

    if (error) throw error;

    return data;

  } catch (error) {
    return [];
  }
}

// Get subscription analytics
export async function getSubscriptionStats() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status, is_pro')
      .not('subscription_status', 'eq', 'free');

    if (error) throw error;

    const stats = {
      totalUsers: data.length,
      activeSubscriptions: data.filter(u => u.subscription_status === 'active').length,
      cancelledSubscriptions: data.filter(u => u.subscription_status === 'cancelled').length,
      pastDueSubscriptions: data.filter(u => u.subscription_status === 'past_due').length
    };

    return stats;

  } catch (error) {
    return null;
  }
}

// Delete user (GDPR compliance)
export async function deleteUser(identifier) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .or(`user_id.eq.${identifier},email.eq.${identifier}`);

    if (error) throw error;


  } catch (error) {
    throw error;
  }
}