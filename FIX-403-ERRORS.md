# Fix 403 Forbidden Errors on users_auth Table

## Problem
You're getting 403 Forbidden errors when accessing the `users_auth` table because the Row Level Security (RLS) policies don't allow users to read or insert their own records.

## Solution
Run the SQL migration to add proper RLS policies that allow authenticated users to access their own records.

## Steps to Fix

### Option 1: Run in Supabase Dashboard (Recommended)

1. **Go to your Supabase SQL Editor**:
   - Open: https://supabase.com/dashboard/project/voislxlhfepnllamagxm/sql

2. **Create a new query** and paste the contents of `fix-users-auth-rls.sql`

3. **Click "Run"** to execute the migration

4. **Refresh your dashboard** - the 403 errors should be gone!

### Option 2: Run via Command Line (Alternative)

If you have your Supabase service role key:

```bash
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
node run-rls-migration.js
```

## What This Does

The migration creates three RLS policies on the `users_auth` table:

1. **SELECT Policy**: Allows users to view their own auth record
2. **INSERT Policy**: Allows users to create their own auth record
3. **UPDATE Policy**: Allows users to update their own auth record

All policies use `auth.uid() = id` to ensure users can only access their own records.

## After Running

Once the migration is complete:
- ✅ No more 403 Forbidden errors
- ✅ Users can read their own user_auth record
- ✅ Users can create their own user_auth record (via ensureUserInAuthTable)
- ✅ Users can update their own user_auth record

## Verification

After running the migration, check your browser console - you should no longer see:
```
Failed to load resource: the server responded with a status of 403 ()
voislxlhfepnllamagxm.supabase.co/rest/v1/users_auth:1
```
