
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);




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

export async function getUser(identifier) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`user_id.eq.${identifier},email.eq.${identifier}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return null;
    }


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

export async function updateUser(identifier, updates) {
  try {
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