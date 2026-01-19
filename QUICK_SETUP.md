# Quick Setup Checklist - Get TabKeep Search Working in 15 Minutes

## ✅ Step 1: Database Setup (2 minutes)

1. Go to your Supabase project: https://supabase.com/dashboard/project/kfyzgqbnjvzemwivfcew
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of `supabase-search-schema.sql`
5. Click "Run" (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned" ✅

## ✅ Step 2: Get Remaining API Keys (10 minutes)

### YouTube API Key (Same Google Project - 2 minutes)
Your Google Search already works! Use the same project:

1. Go to https://console.cloud.google.com/apis/library
2. Search for "YouTube Data API v3"
3. Click it, then click "Enable"
4. Use your existing API key: `AIzaSyBddPxpEPNIrqtauaYMNmK8feRWzSpiMFA`
5. ✅ Update `.env.local`: Set `YOUTUBE_API_KEY` to the same key

### GitHub Token (2 minutes)
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "TabKeep Search"
4. Select scopes: ☑️ `public_repo`, ☑️ `read:user`
5. Click "Generate token"
6. Copy the token (starts with `ghp_...`)
7. ✅ Update `.env.local`: Set `GITHUB_TOKEN` to your token

### Spotify API (3 minutes)
1. Go to https://developer.spotify.com/dashboard
2. Log in with Spotify (or create free account)
3. Click "Create app"
4. App name: "TabKeep Search"
5. App description: "Multi-platform search"
6. Redirect URI: `http://localhost:8080` (not used but required)
7. Check "Web API" box
8. Click "Save"
9. You'll see Client ID and Client Secret
10. ✅ Update `.env.local`:
    - Set `SPOTIFY_CLIENT_ID` to Client ID
    - Set `SPOTIFY_CLIENT_SECRET` to Client Secret

### Supabase Service Role Key (1 minute)
1. Go to https://supabase.com/dashboard/project/kfyzgqbnjvzemwivfcew/settings/api
2. Scroll down to "Project API keys"
3. Find `service_role` key (⚠️ SECRET - never expose!)
4. Click the eye icon to reveal it
5. Copy the key (starts with `eyJhbG...`)
6. ✅ Update `.env.local`: Set `SUPABASE_SERVICE_ROLE_KEY` to the key

## ✅ Step 3: Restart Dev Server (30 seconds)

```bash
# Stop the server (Ctrl+C if running)

# Restart it
npm run dev
```

## ✅ Step 4: Test It! (2 minutes)

1. Open http://localhost:8080
2. Sign in with your account
3. Click the **"Search"** button (toggle at top)
4. Type: "best React tutorials"
5. Press Enter
6. Wait 5-10 seconds...
7. 🎉 You should see:
   - AI summary at top
   - Platform tabs (All, Google, YouTube, GitHub, Reddit, Spotify)
   - Result cards with thumbnails and links
   - Click any result to open it!

## 🎯 What to Test

Try these queries to test each platform:

```
"latest web development trends"     → Google results
"React tutorial 2025"               → YouTube videos
"awesome react projects"            → GitHub repos
"best programming advice"           → Reddit posts
"coding music"                      → Spotify tracks
```

## 🐛 Troubleshooting

### "Unauthorized" error
- Make sure all API keys are in `.env.local`
- Restart dev server after adding keys

### "Search failed" error
- Check browser console (F12) for specific error
- Verify each API key is correct
- Check you didn't hit API quotas (unlikely on first use)

### No results from a specific platform
- Check that platform's API key is correct
- For YouTube: Make sure API is enabled in Google Cloud Console
- For GitHub: Make sure token has correct scopes
- For Spotify: Make sure both Client ID and Secret are set

### Database error
- Go back to Step 1 and run the SQL schema again
- Make sure RLS policies are enabled

## 📊 Check Your Usage

After testing, check your API usage:

- **Google Search:** https://console.cloud.google.com/apis/dashboard
  - Should show ~1 request (you get 100/day FREE)

- **Supabase:** https://supabase.com/dashboard/project/kfyzgqbnjvzemwivfcew
  - Go to "Database" → "Tables"
  - Check `search_sessions` table - you should see 1 row with your search!
  - Check `platform_results` table - you should see 5 rows (one per platform)

## 🚀 You're Done!

Your multi-platform search is now working! The AI is actually searching across platforms and aggregating results.

**Cost:** $0/month (all FREE APIs) ✅
**Your $28 budget:** Saved for future premium features!

---

## 💡 Next Steps

Want to enhance your search?

1. **Deploy to production:** `vercel --prod`
   - Add all env vars in Vercel dashboard

2. **Add more platforms:** Follow SETUP_GUIDE.md to add TikTok, Twitter, etc. (requires $50/mo SerpAPI)

3. **Customize UI:** Edit `src/components/search/SearchResults.tsx` to change appearance

4. **Add filters:** Let users filter by date, content type, etc.

---

**Need help?** Check browser console (F12) for detailed error messages.
