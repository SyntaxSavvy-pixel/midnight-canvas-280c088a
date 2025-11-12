# ⚡ Cloudflare Environment Variables Setup

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your Perplexity API Key

The API key that was previously exposed in `config.js` is:
```
YOUR_API_KEY_HERE
```

**⚠️ SECURITY ALERT:**
This key is now removed from client code. You should consider **regenerating it** from Perplexity dashboard since it was previously exposed.

### Step 2: Add to Cloudflare

1. Open https://dash.cloudflare.com
2. Select **Pages** from the sidebar
3. Click on **tabmangment** project
4. Go to **Settings** tab
5. Click **Environment variables** in the left sidebar

### Step 3: Add PERPLEXITY_API_KEY

Click **Add variable** and enter:

```
Variable name:   PERPLEXITY_API_KEY
Value:          YOUR_API_KEY_HERE
Environment:    Production
```

Click **Save**.

### Step 4: Redeploy

After adding environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **...** menu on latest deployment
3. Select **Retry deployment**
4. Or push a new commit to trigger deployment

### Step 5: Test

Test the search functionality in your extension:
1. Open the extension
2. Click the Search button
3. Type a query
4. Should work without errors

---

## 🔍 Verify Setup

### Check if environment variable is set:

In Cloudflare Functions, add this temporary logging:

```javascript
console.log('PERPLEXITY_API_KEY exists:', !!env.PERPLEXITY_API_KEY);
console.log('PERPLEXITY_API_KEY length:', env.PERPLEXITY_API_KEY?.length);
```

Then check **Cloudflare → Pages → Functions → Real-time Logs**

---

## 🐛 Troubleshooting

### Error: "Server configuration error"

**Problem:** `PERPLEXITY_API_KEY` environment variable not set

**Solution:**
1. Double-check variable name is exactly `PERPLEXITY_API_KEY`
2. Verify it's set for **Production** environment
3. Redeploy the site

### Error: "Search service unavailable"

**Problem:** API key is invalid or request failed

**Solution:**
1. Check if API key is correct
2. Verify Perplexity API is working
3. Check Cloudflare function logs for details

### Error: "Failed to verify search limits"

**Problem:** Cannot reach check-search-usage endpoint

**Solution:**
1. Verify `/api/check-search-usage` endpoint exists
2. Check if it's deployed correctly
3. Test endpoint directly

---

## 📊 All Required Environment Variables

Here's the complete list for production:

```bash
# Perplexity AI
PERPLEXITY_API_KEY=pplx-your-actual-key-here

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_ANON_KEY=eyJxxx...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Environment variable added to Cloudflare
- [ ] Variable name is exactly `PERPLEXITY_API_KEY`
- [ ] Value is correct API key
- [ ] Environment is set to **Production**
- [ ] Site has been redeployed
- [ ] Search functionality works in extension
- [ ] No errors in browser console
- [ ] Cloudflare function logs show no errors

---

## 🔐 Security Best Practices

1. **Never commit API keys to git**
2. **Use different keys for development/production**
3. **Rotate keys periodically**
4. **Monitor API usage** for unusual activity
5. **Set up billing alerts** on Perplexity dashboard

---

## 📞 Need Help?

If you encounter issues:
1. Check Cloudflare function logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test the `/api/perplexity-search` endpoint directly

---

**Next Steps:** See `SECURITY.md` for complete security documentation
