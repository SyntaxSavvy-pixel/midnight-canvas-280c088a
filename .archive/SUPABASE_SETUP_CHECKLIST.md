# 🔧 Supabase Setup Checklist - Fix Pro Subscription Updates

## Problem
Payments succeed but Supabase doesn't update with Pro status.

## Steps to Fix

### 1️⃣ Run SQL Script in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy ALL contents from `supabase-fix-permissions.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl+Enter)

**What this does:**
- ✅ Creates missing columns (if any)
- ✅ Fixes RLS policies to allow service_role updates
- ✅ Tests the update with your email
- ✅ Shows you the results
- ✅ Resets back to free for next test

### 2️⃣ Verify Environment Variables in Netlify

1. Go to Netlify Dashboard: https://app.netlify.com
2. Select your site
3. Go to **Site Settings** → **Environment Variables**
4. Verify these exist:

```
SUPABASE_URL=https://voislxlhfepnllamagxm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (MUST be service_role, NOT anon!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**CRITICAL:** Make sure `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key, not the **anon** key!

To get the correct key:
1. Go to Supabase Dashboard → Settings → API
2. Look for **Project API keys** section
3. Copy **service_role** key (the long one, starts with `eyJ...`)
4. Paste in Netlify (replace existing SUPABASE_SERVICE_ROLE_KEY)

### 3️⃣ Check Supabase RLS is Enabled

1. In Supabase Dashboard → **Table Editor**
2. Click on **users** table
3. Click the **shield icon** (top right) - should say "RLS enabled"
4. If RLS is disabled, click to enable it

### 4️⃣ Test the Update Flow

After running the SQL script:

1. Make a new test payment: https://tabmangment.com/user-dashboard.html
2. Complete Stripe checkout
3. After redirect, immediately check:
   - Dashboard badge (should show "Pro")
   - Supabase Table Editor → users table → your row
   - Should see `is_pro: true`, `plan_type: 'pro'`, billing dates filled

### 5️⃣ Check Netlify Function Logs

1. Go to Netlify Dashboard → **Functions** → **verify-session**
2. Click on recent invocations
3. Look for logs:
   ```
   📝 Updating Supabase for: your-email@example.com
   ✅ Supabase updated successfully!
   ```
4. If you see errors, they'll show exactly what's wrong

## Common Issues & Fixes

### Issue: "relation 'users' does not exist"
**Fix:** Your table might be named differently
- Check Supabase → Table Editor → what is your users table called?
- Update the function to use correct table name

### Issue: "new row violates row-level security policy"
**Fix:** RLS is blocking the service_role
- Run the SQL script above to fix policies

### Issue: "column 'plan_type' does not exist"
**Fix:** Missing columns
- The SQL script will add them automatically

### Issue: No logs showing up at all
**Fix:** Function isn't being called
- Check browser console for errors
- Verify API_BASE is set to `/.netlify/functions`
- Check Network tab - is verify-session being called?

## Success Checklist

✅ SQL script ran without errors
✅ Test update showed your data
✅ SERVICE_ROLE_KEY is correct in Netlify
✅ RLS is enabled on users table
✅ All columns exist in users table
✅ Made test payment
✅ Dashboard shows "Pro"
✅ Supabase shows `is_pro: true`
✅ Extension shows Pro features

## Need More Help?

If it's still not working after all these steps:

1. **Export your Supabase schema:**
   - Go to SQL Editor
   - Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';`
   - Send me the results

2. **Check actual error in Netlify logs:**
   - Functions → verify-session → Recent logs
   - Copy/paste any error messages

3. **Test the SERVICE_ROLE_KEY:**
   - Run this in SQL Editor:
   ```sql
   SELECT current_setting('request.jwt.claims')::json->>'role' as current_role;
   ```
   - Should return 'service_role' when using SERVICE_ROLE_KEY
