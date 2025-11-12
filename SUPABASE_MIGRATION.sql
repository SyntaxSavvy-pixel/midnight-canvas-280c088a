-- ============================================
-- SUPABASE DATABASE MIGRATION
-- Subscription & Billing Fields
-- ============================================

-- Add new columns to users_auth table for subscription tracking
-- Run this in Supabase SQL Editor

ALTER TABLE users_auth
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_auth_is_pro ON users_auth(is_pro);
CREATE INDEX IF NOT EXISTS idx_users_auth_subscription_status ON users_auth(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_auth_stripe_customer_id ON users_auth(stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN users_auth.is_pro IS 'Whether user has active Pro subscription';
COMMENT ON COLUMN users_auth.subscription_status IS 'Subscription status: free, active, lifetime, canceled, past_due';
COMMENT ON COLUMN users_auth.current_period_start IS 'Start date of current billing period';
COMMENT ON COLUMN users_auth.current_period_end IS 'End date of current billing period (null for lifetime)';
COMMENT ON COLUMN users_auth.plan_type IS 'Plan type: pro_monthly, pro_yearly, pro_lifetime';
COMMENT ON COLUMN users_auth.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN users_auth.stripe_subscription_id IS 'Stripe subscription ID (null for lifetime)';

-- ============================================
-- VERIFICATION QUERY
-- Run this to check if columns were added
-- ============================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users_auth'
AND column_name IN (
    'is_pro',
    'subscription_status',
    'current_period_start',
    'current_period_end',
    'plan_type',
    'stripe_customer_id',
    'stripe_subscription_id'
)
ORDER BY column_name;
