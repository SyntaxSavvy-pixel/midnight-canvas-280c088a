-- ============================================
-- UNINSTALL FEEDBACK TABLE
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS uninstall_feedback (
    id BIGSERIAL PRIMARY KEY,
    reason TEXT NOT NULL,
    improvement TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_uninstall_feedback_submitted_at
ON uninstall_feedback(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_uninstall_feedback_rating
ON uninstall_feedback(rating);

-- Enable Row Level Security
ALTER TABLE uninstall_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (anonymous users submitting feedback)
CREATE POLICY "Allow anonymous insert on uninstall_feedback"
ON uninstall_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to read all feedback
CREATE POLICY "Allow authenticated read on uninstall_feedback"
ON uninstall_feedback
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to delete feedback (admin only via client-side check)
CREATE POLICY "Allow authenticated delete on uninstall_feedback"
ON uninstall_feedback
FOR DELETE
TO authenticated
USING (true);

-- Grant permissions
GRANT INSERT ON uninstall_feedback TO anon;
GRANT INSERT ON uninstall_feedback TO authenticated;
GRANT SELECT ON uninstall_feedback TO authenticated;
GRANT DELETE ON uninstall_feedback TO authenticated;

-- Verify table was created
SELECT
    'Table created successfully!' as status,
    COUNT(*) as initial_count
FROM uninstall_feedback;
