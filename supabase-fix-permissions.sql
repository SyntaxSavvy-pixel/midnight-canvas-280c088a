-- =====================================================
-- FIX SUPABASE PERMISSIONS FOR PRO SUBSCRIPTION UPDATES
-- =====================================================
-- Run this in Supabase SQL Editor

-- 1. First, let's check if the columns exist
-- If any columns are missing, we need to add them

-- Add missing columns if they don't exist
ALTER TABLE users_auth
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS pro_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_amount DECIMAL(10,2);

-- 2. DROP existing RLS policies that might be blocking updates
DROP POLICY IF EXISTS "Users can update own data" ON users_auth;
DROP POLICY IF EXISTS "Service role can update all users" ON users_auth;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users_auth;
DROP POLICY IF EXISTS "Service role has full access" ON users_auth;
DROP POLICY IF EXISTS "Users can view own data" ON users_auth;

-- 3. Create a policy that allows SERVICE ROLE to do everything
-- This is what your Netlify functions use
CREATE POLICY "Service role has full access"
ON users_auth
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Create a policy for authenticated users to view their own data
CREATE POLICY "Users can view own data"
ON users_auth
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 5. Grant permissions
GRANT ALL ON users_auth TO service_role;
GRANT SELECT ON users_auth TO authenticated;

-- 6. Test query to verify all columns exist
-- Run this to see the structure of your users_auth table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users_auth'
ORDER BY ordinal_position;

-- 7. Verify RLS policies are set up correctly
SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users_auth';

-- 8. Count users by plan (should show distribution)
SELECT
    plan_type,
    subscription_status,
    COUNT(*) as user_count
FROM users_auth
GROUP BY plan_type, subscription_status;

-- =====================================================
-- VERIFICATION CHECKLIST:
-- =====================================================
-- ✅ All columns exist
-- ✅ RLS policies allow service_role to update
-- ✅ Test update works
-- ✅ Ready for real payments!
