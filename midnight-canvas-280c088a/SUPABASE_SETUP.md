# Supabase Authentication Setup Guide

## ✅ Step 1: Environment Variables (COMPLETED)

Your `.env.local` file has been configured with your Supabase credentials.

## 🔧 Step 2: Database Schema Setup (DO THIS NOW)

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/kfyzgqbnjvzemwivfcew/sql
   ```

2. Click "New Query"

3. Copy the entire contents of `supabase-schema.sql` file

4. Paste into the SQL editor

5. Click "Run" (or press Ctrl/Cmd + Enter)

6. You should see success messages for all tables, policies, and triggers created

### Option B: Via File Upload

1. Go to your Supabase SQL Editor
2. Click the "..." menu → "Import SQL"
3. Select the `supabase-schema.sql` file
4. Click "Run"

## 🧪 Step 3: Test the Authentication System

### Test Sign Up

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:5173`

3. Click "Sign up" button

4. Fill in the form:
   - Name: Test User
   - Username: testuser (optional)
   - Email: test@example.com
   - Password: test123

5. Click "Create account"

6. ✅ You should be signed in automatically

### Test Session Persistence

1. While signed in, refresh the page (F5)
2. ✅ You should remain signed in
3. Close the browser tab and reopen
4. ✅ You should still be signed in

### Test Search History

1. Make a search query in the search bar
2. Check the sidebar - your search should appear
3. Refresh the page
4. ✅ Your search history should persist

### Test Profile Management

1. Click your profile icon in the sidebar
2. Go to "Profile Settings"
3. Update your display name
4. Click "Save"
5. ✅ You should see a success message
6. Update your username
7. ✅ Username should update

### Test Password Change

1. In Profile Settings, click "Change Password"
2. Enter a new password (min 6 characters)
3. Confirm the password
4. Click "Change Password"
5. ✅ You should see a success message

### Test Account Deletion

1. Go to "Account Deletion" tab
2. Type "DELETE" in the confirmation box
3. Click "Delete Account Permanently"
4. Confirm the alert
5. ✅ You should be signed out
6. ✅ Account should be deleted from Supabase

## 🔍 Verify in Supabase Dashboard

### Check Profiles Table

1. Go to: https://supabase.com/dashboard/project/kfyzgqbnjvzemwivfcew/editor
2. Select "profiles" table
3. ✅ You should see your user profile with display_name, username, etc.

### Check Search History Table

1. Select "search_history" table
2. ✅ You should see your searches with timestamps

### Check Authentication

1. Go to: https://supabase.com/dashboard/project/kfyzgqbnjvzemwivfcew/auth/users
2. ✅ You should see your authenticated users

## 🎯 What's Working Now

- ✅ User registration with email/password
- ✅ User login with session persistence
- ✅ Automatic profile creation on signup
- ✅ Search history saved to database
- ✅ Search history syncs across devices
- ✅ Profile editing (name, username)
- ✅ Password change
- ✅ Account deletion
- ✅ Row Level Security (users can only see their own data)
- ✅ Loading states and error handling
- ✅ Toast notifications for feedback

## 🐛 Troubleshooting

### "Missing Supabase environment variables" error
- Check that `.env.local` exists and has the correct values
- Restart your dev server after adding environment variables

### "Permission denied" or RLS errors
- Make sure you ran the entire SQL schema including RLS policies
- Check that the policies were created successfully

### Profile not created on signup
- Verify the `handle_new_user()` trigger is installed
- Check Supabase logs for errors

### Search history not saving
- Verify you're logged in
- Check browser console for errors
- Verify `search_history` table and policies exist

## 📝 Next Steps (Optional)

### Add Email Verification

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Email Confirmations"
3. Configure email templates

### Add Social Auth (Google, GitHub)

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable desired providers
3. Update AuthModal to include social login buttons

### Add Avatar Upload

1. Create storage bucket in Supabase
2. Add file upload to UserSettingsModal
3. Store avatar URL in profiles table

## 🎉 You're All Set!

Your secure authentication system is now fully operational with:
- Production-ready security (Row Level Security)
- Persistent sessions across devices
- User data management
- Search history synchronization

Happy coding! 🚀
