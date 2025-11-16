# Supabase Delete Permissions Update

## IMPORTANT: You must run this SQL in Supabase to enable delete functionality

The delete buttons won't work until you add DELETE permissions to your Supabase tables.

## How to update:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Run the following SQL commands:

### For Contact Messages Table:

```sql
-- Add delete policy for contact_messages
CREATE POLICY "Allow authenticated delete on contact_messages"
ON contact_messages
FOR DELETE
TO authenticated
USING (true);

-- Grant delete permission
GRANT DELETE ON contact_messages TO authenticated;
```

### For Uninstall Feedback Table:

```sql
-- Add delete policy for uninstall_feedback
CREATE POLICY "Allow authenticated delete on uninstall_feedback"
ON uninstall_feedback
FOR DELETE
TO authenticated
USING (true);

-- Grant delete permission
GRANT DELETE ON uninstall_feedback TO authenticated;
```

## Verification:

After running the SQL, try deleting a feedback entry or contact message from your dashboard. The delete button should work and show a confirmation dialog.

## Note:

The updated SQL files (`supabase-contact-messages-table.sql` and `supabase-uninstall-feedback-table.sql`) already include these permissions for new installations.
