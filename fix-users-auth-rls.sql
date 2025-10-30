-- Fix RLS policies for users_auth table to prevent 403 errors
-- This allows authenticated users to read, insert, and update their own records

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own auth record" ON users_auth;
DROP POLICY IF EXISTS "Users can insert their own auth record" ON users_auth;
DROP POLICY IF EXISTS "Users can update their own auth record" ON users_auth;

-- Create policy to allow users to SELECT their own record
CREATE POLICY "Users can view their own auth record"
ON users_auth
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy to allow users to INSERT their own record
CREATE POLICY "Users can insert their own auth record"
ON users_auth
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to UPDATE their own record
CREATE POLICY "Users can update their own auth record"
ON users_auth
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verify RLS is enabled (should already be enabled)
ALTER TABLE users_auth ENABLE ROW LEVEL SECURITY;
