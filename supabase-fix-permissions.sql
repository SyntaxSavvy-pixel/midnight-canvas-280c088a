-- =====================================================
-- FIX SUPABASE PERMISSIONS FOR PRO SUBSCRIPTION UPDATES
-- =====================================================
-- Run this in Supabase SQL Editor

-- 1. First, let's check if the columns exist
-- If any columns are missing, we need to add them

-- Add missing columns if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS pro_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2);

-- 2. DROP existing RLS policies that might be blocking updates
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can update all users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;

-- 3. Create a policy that allows SERVICE ROLE to update ANY user
-- This is what your Netlify function uses
CREATE POLICY "Service role can update all users"
ON users
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Create a policy for authenticated users to update their own data
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id OR auth.email() = email)
WITH CHECK (auth.uid()::text = id OR auth.email() = email);

-- 5. Make sure service role can SELECT (needed for .select() in update)
DROP POLICY IF EXISTS "Service role can read all users" ON users;
CREATE POLICY "Service role can read all users"
ON users
FOR SELECT
TO service_role
USING (true);

-- 6. Test the update manually (replace with your email)
-- This simulates what the Netlify function does
UPDATE users
SET
    is_pro = true,
    plan_type = 'pro',
    subscription_status = 'active',
    stripe_customer_id = 'test_cus_123',
    stripe_subscription_id = 'test_sub_123',
    stripe_session_id = 'test_session_123',
    pro_activated_at = NOW(),
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days',
    last_payment_date = NOW(),
    last_payment_amount = 4.99
WHERE email = 'heyitskhq@gmail.com';

-- 7. Verify the update worked
SELECT
    email,
    is_pro,
    plan_type,
    subscription_status,
    current_period_end,
    stripe_customer_id
FROM users
WHERE email = 'heyitskhq@gmail.com';

-- 8. If you see the updated data above, the permissions are fixed!
-- Now reset the test data back to free
UPDATE users
SET
    is_pro = false,
    plan_type = 'free',
    subscription_status = 'inactive',
    stripe_customer_id = NULL,
    stripe_subscription_id = NULL,
    stripe_session_id = NULL,
    pro_activated_at = NULL,
    current_period_start = NULL,
    current_period_end = NULL
WHERE email = 'heyitskhq@gmail.com';

-- =====================================================
-- VERIFICATION CHECKLIST:
-- =====================================================
-- ✅ All columns exist
-- ✅ RLS policies allow service_role to update
-- ✅ Test update works
-- ✅ Ready for real payments!
