# GitHub OAuth Setup Guide

## Step 1: Configure GitHub OAuth in Supabase Dashboard

1. **Go to your Supabase Dashboard**: https://app.supabase.com/project/voislxlhfepnllamagxm

2. **Navigate to Authentication > Providers**

3. **Find GitHub provider and click to configure**

4. **Enter your GitHub OAuth credentials**:
   - **Client ID**: `Ov23lizyBMWjXORgGIhY`
   - **Client Secret**: `17aff96cdd33b318e5075d2b322cf3f81311d70a`

5. **Copy the Callback URL from Supabase**
   - It should look like: `https://voislxlhfepnllamagxm.supabase.co/auth/v1/callback`

6. **Enable the GitHub provider** by toggling it ON

7. **Save the configuration**

## Step 2: Update GitHub OAuth App Settings

1. **Go to GitHub Developer Settings**: https://github.com/settings/developers

2. **Click on your OAuth App** (or create a new one if needed)

3. **Update the following settings**:
   - **Application name**: Tabmangment
   - **Homepage URL**: `https://tabmangment.netlify.app`
   - **Authorization callback URL**: `https://voislxlhfepnllamagxm.supabase.co/auth/v1/callback`

4. **Save changes**

## Step 3: Test GitHub Login

1. Go to your authentication page: https://tabmangment.netlify.app/new-authentication

2. Click the **"GitHub"** button

3. You should be redirected to GitHub to authorize the app

4. After authorization, you'll be redirected back to your app and logged in

## What's Already Configured

✅ Frontend code updated to support GitHub OAuth
✅ Auth state handler updated to parse GitHub user metadata
✅ User data extraction supports GitHub username and avatar
✅ Extension sync supports GitHub-authenticated users

## User Data Flow

When a user signs in with GitHub:

1. **GitHub provides**:
   - Email address
   - Username (`user_name`)
   - Name (if available)
   - Avatar URL

2. **We extract and store**:
   ```javascript
   {
     email: user.email,
     name: user.user_metadata.user_name || user.email.split('@')[0],
     id: user.id,
     provider: 'github',
     avatar: user.user_metadata.avatar_url
   }
   ```

3. **Extension receives**:
   - All user data via `USER_LOGGED_IN` message
   - Syncs to extension storage
   - User can access all features

## Troubleshooting

### Error: "Invalid OAuth callback URL"
- Make sure the callback URL in GitHub matches EXACTLY what Supabase provides
- No trailing slashes
- Use HTTPS

### Error: "Client ID or Secret invalid"
- Double-check the Client ID and Secret in Supabase dashboard
- Regenerate credentials in GitHub if needed

### Error: "User email not provided"
- GitHub users must have a public email or grant email scope
- The app requests `user:email` scope by default

### Users can't access Pro features
- GitHub OAuth users are treated the same as Google/email users
- Plan status is checked via backend API
- Make sure user is synced to database after login

## Next Steps

After setup:
1. Test GitHub login on https://tabmangment.netlify.app/new-authentication
2. Verify user data appears in Supabase Auth dashboard
3. Check that extension syncs properly with GitHub-authenticated users
4. Test Pro upgrade flow with GitHub users
