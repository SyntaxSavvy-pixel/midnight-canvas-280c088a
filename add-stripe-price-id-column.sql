-- ============================================
-- ADD STRIPE_PRICE_ID COLUMN TO users_auth
-- ============================================
-- This fixes the "400 Bad Request" error when querying users_auth
-- Run this in Supabase SQL Editor

-- Add stripe_price_id column to users_auth table
ALTER TABLE users_auth
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_auth_stripe_price_id
ON users_auth(stripe_price_id);

-- Add comment for documentation
COMMENT ON COLUMN users_auth.stripe_price_id IS 'Stripe Price ID for the users subscription plan (monthly/yearly/lifetime)';

-- ============================================
-- VERIFICATION QUERY
-- Run this to check if column was added
-- ============================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users_auth'
AND column_name = 'stripe_price_id';

-- ============================================
-- EXPECTED OUTPUT:
-- column_name      | data_type | is_nullable
-- stripe_price_id  | text      | YES
-- ============================================
