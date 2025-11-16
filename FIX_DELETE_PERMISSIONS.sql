-- ============================================
-- FIX DELETE PERMISSIONS - Run this in Supabase SQL Editor
-- ============================================

-- First, drop existing delete policies if they exist
DROP POLICY IF EXISTS "Allow authenticated delete on contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Allow authenticated delete on uninstall_feedback" ON uninstall_feedback;

-- Recreate delete policies
CREATE POLICY "Allow authenticated delete on contact_messages"
ON contact_messages
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated delete on uninstall_feedback"
ON uninstall_feedback
FOR DELETE
TO authenticated
USING (true);

-- Grant DELETE permissions
GRANT DELETE ON contact_messages TO authenticated;
GRANT DELETE ON uninstall_feedback TO authenticated;
GRANT DELETE ON contact_messages TO anon;
GRANT DELETE ON uninstall_feedback TO anon;

-- Verify permissions
SELECT
    'contact_messages DELETE permissions' as check_type,
    has_table_privilege('authenticated', 'contact_messages', 'DELETE') as authenticated_can_delete,
    has_table_privilege('anon', 'contact_messages', 'DELETE') as anon_can_delete
UNION ALL
SELECT
    'uninstall_feedback DELETE permissions' as check_type,
    has_table_privilege('authenticated', 'uninstall_feedback', 'DELETE') as authenticated_can_delete,
    has_table_privilege('anon', 'uninstall_feedback', 'DELETE') as anon_can_delete;

-- This should show 'true' for all delete permissions
