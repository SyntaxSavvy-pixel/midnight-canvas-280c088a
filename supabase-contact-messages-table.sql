-- ============================================
-- CONTACT MESSAGES TABLE
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Create the table
CREATE TABLE IF NOT EXISTS contact_messages (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
ON contact_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email
ON contact_messages(email);

-- Enable Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (anonymous users submitting contact messages)
CREATE POLICY "Allow anonymous insert on contact_messages"
ON contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to read all messages
CREATE POLICY "Allow authenticated read on contact_messages"
ON contact_messages
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to delete messages (admin only via client-side check)
CREATE POLICY "Allow authenticated delete on contact_messages"
ON contact_messages
FOR DELETE
TO authenticated
USING (true);

-- Grant permissions
GRANT INSERT ON contact_messages TO anon;
GRANT INSERT ON contact_messages TO authenticated;
GRANT SELECT ON contact_messages TO authenticated;
GRANT DELETE ON contact_messages TO authenticated;

-- Verify table was created
SELECT
    'Table created successfully!' as status,
    COUNT(*) as initial_count
FROM contact_messages;
