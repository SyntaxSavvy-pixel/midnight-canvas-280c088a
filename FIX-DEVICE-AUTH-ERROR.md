# Fix Device Authorization and 404 Errors

## Problem Summary
1. **500 Error**: `api/authorize-device` failing with "Device authorization failed: Failed to register device"
2. **404 Error**: Resource not found error with cache-busting parameter

## Root Causes
1. **UNIQUE Constraint Error**: The `user_devices` table has a global UNIQUE constraint on `device_id`, preventing different users from registering devices with the same ID
2. **Incorrect Schema**: The constraint should be scoped per user `(user_id, device_id)`, not globally unique
3. Profile photo loading issue (the 404 error)

## Fix Instructions

### Step 1: Fix the user_devices Table Schema in Supabase

**⚠️ WARNING**: This will drop and recreate the `user_devices` table, deleting all existing device registrations. Users will need to re-authorize their devices.

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of `fix-user-devices.sql`
6. Click **Run** (or press Ctrl/Cmd + Enter)

The script will:
- Drop the existing `user_devices` table (removes the incorrect global UNIQUE constraint)
- Create a new table with the correct composite UNIQUE constraint: `(user_id, device_id)`
- This allows different users to have devices with the same device_id
- Set up proper indexes for performance
- Configure Row Level Security (RLS) policies
- Grant permissions to the service role

### Step 2: Verify the Table Was Created

Run this query in the SQL Editor:
```sql
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_devices'
ORDER BY ordinal_position;
```

You should see these columns:
- id (uuid)
- user_id (uuid)
- device_id (text)
- device_fingerprint (text)
- browser_info (jsonb)
- last_seen (timestamp with time zone)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Step 3: Deploy Updated API Function

The `authorize-device.js` API has been updated with:
- Better error logging
- Updated CORS headers to include Authorization

**For Cloudflare Pages:**
1. Commit the changes:
   ```bash
   git add functions/api/authorize-device.js
   git commit -m "Fix authorize-device API error handling"
   git push
   ```
2. Cloudflare Pages will auto-deploy

**For other hosting:**
- Redeploy your API functions

### Step 4: Test Device Authorization

1. Open your dashboard: https://tabmangment.com/user-dashboard.html
2. Open browser console (F12)
3. Refresh the page
4. Look for the authorize-device API call
5. Check the response - should now return success instead of 500 error

Expected success response:
```json
{
  "success": true,
  "authorized": true,
  "isNew": true,
  "message": "New device registered successfully",
  "deviceCount": 1,
  "maxDevices": 2,
  "planType": "free"
}
```

For admin users:
```json
{
  "success": true,
  "authorized": true,
  "isNew": true,
  "message": "Admin device registered",
  "deviceCount": 1,
  "maxDevices": 999,
  "planType": "admin",
  "isAdmin": true
}
```

### Step 5: Fix 404 Profile Photo Error (If Applicable)

The 404 error is likely from loading a Google profile photo that doesn't exist or has permission issues.

**If you see this in console:**
```
Failed to load resource: the server responded with a status of 404 () latest?cb=20250211191039:1
```

This is caused by:
1. The profile photo URL being invalid
2. Google photo URL expiring
3. Image loading with onerror fallback

**Fix:**
The extension now properly handles missing photos by showing a default avatar SVG. If you still see 404s:

1. Clear browser cache
2. Reload the extension
3. Log out and log back in to refresh the photo URL

The profile photo system has been updated to:
- Use a neutral gray avatar SVG as default
- Only load Google photos when available
- Handle missing photos gracefully

## Verification Checklist

- [ ] SQL script executed successfully in Supabase
- [ ] `user_devices` table exists with correct schema
- [ ] API functions redeployed
- [ ] Device authorization working (no 500 error)
- [ ] Profile photo loading correctly
- [ ] Admin users see "Admin Plan" with "Unlimited Pro Access"
- [ ] No console errors on dashboard load

## Troubleshooting

### Still Getting 500 Error?

Check Cloudflare Pages logs:
1. Go to Cloudflare dashboard
2. Select your Pages project
3. Go to **Functions** → **Logs**
4. Look for error details

Common issues:
- `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` not set in environment variables
- Database connection issue
- RLS policies blocking access (should not happen with service role key)

### Still Getting 404 Error?

1. Check browser console for the full URL that's failing
2. If it's a profile photo:
   - Log out and back in
   - Photo will fall back to default avatar
3. If it's another resource:
   - Check the Network tab for the failing request
   - Look for the file path being requested

## Notes

- The service role key automatically bypasses RLS policies in Supabase
- Admin users (selfshios@gmail.com) get unlimited devices (999)
- Free users get 2 devices, Pro users get 3 devices
- Inactive devices (30+ days) are automatically cleaned up (if cleanup function is implemented)
