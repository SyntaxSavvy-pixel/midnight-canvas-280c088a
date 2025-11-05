-- ================================================
-- STEP 1: Create Supabase Table for Search Tracking
-- ================================================
-- Run this SQL in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste & Run

-- Create search_usage table
CREATE TABLE IF NOT EXISTS search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_search_usage_email_time
ON search_usage(user_email, searched_at DESC);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_search_usage_searched_at
ON search_usage(searched_at);

-- Enable Row Level Security (RLS) for security
ALTER TABLE search_usage ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to access all rows
CREATE POLICY "Service role can manage all search_usage"
ON search_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to auto-cleanup old searches (runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_searches()
RETURNS void AS $$
BEGIN
  DELETE FROM search_usage
  WHERE searched_at < NOW() - INTERVAL '30 days';

  RAISE NOTICE 'Cleaned up old search records';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a cron job to run cleanup daily
-- Go to Supabase Dashboard -> Database -> Cron Jobs
-- Add: SELECT cleanup_old_searches(); (daily at 3 AM)

-- Verify table creation
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'search_usage'
ORDER BY ordinal_position;

-- Test insert (optional - to verify it works)
INSERT INTO search_usage (user_email)
VALUES ('test@example.com');

-- Verify insert worked
SELECT * FROM search_usage
WHERE user_email = 'test@example.com'
LIMIT 1;

-- Clean up test data
DELETE FROM search_usage
WHERE user_email = 'test@example.com';

-- ✅ Table setup complete!
-- Next: Set up environment variables and API endpoints
