-- Supabase Database Migration
-- Add missing columns to users table
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_plan_updated_at ON users(plan_updated_at);

-- Step 3: Verify the table structure
-- Uncomment and run this to check all columns:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- Step 4: Test query to check if Pro users can be saved
-- Uncomment to test:
-- UPDATE users
-- SET is_pro = true,
--     subscription_status = 'active',
--     plan_updated_at = NOW()
-- WHERE email = 'test@example.com';
