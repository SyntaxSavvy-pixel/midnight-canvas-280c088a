# SerpAPI Search Worker Deployment

## Quick Deploy (Recommended)

### Option 1: Cloudflare Dashboard (Easiest)

1. Go to https://dash.cloudflare.com
2. Click **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it: `serpapi-search-worker`
4. Click **Deploy**
5. Click **Edit Code**
6. Copy/paste the contents of `serpapi-search-worker.js`
7. Click **Save and Deploy**

8. **Set Environment Variable (SECURE):**
   - Click **Settings** tab
   - Scroll to **Environment Variables**
   - Click **Add Variable**
   - Name: `SERPAPI_KEY`
   - Value: `fd9dce45e2dea0d9ebd0a0af21e007aa4ef1570a019bc3d9facb81e7ac636247`
   - Click **Encrypt** (important!)
   - Click **Save**

9. **Get your Worker URL:**
   - Will be: `https://serpapi-search-worker.YOUR-SUBDOMAIN.workers.dev`
   - Or set custom route: `https://tabmangment.com/api/serpapi-search`

### Option 2: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Navigate to workers directory
cd cloudflare-workers

# Set API key as secret (SECURE)
wrangler secret put SERPAPI_KEY
# Paste: fd9dce45e2dea0d9ebd0a0af21e007aa4ef1570a019bc3d9facb81e7ac636247

# Deploy worker
wrangler deploy

# Your worker will be live at:
# https://serpapi-search-worker.YOUR-SUBDOMAIN.workers.dev
```

## Configure Extension

After deploying, update `popup.js`:

```javascript
SERPAPI: {
    SEARCH_URL: 'https://serpapi-search-worker.YOUR-SUBDOMAIN.workers.dev',
    // OR if using custom route:
    // SEARCH_URL: 'https://tabmangment.com/api/serpapi-search',
}
```

## Testing

```bash
# Test the worker
curl -X POST https://YOUR-WORKER-URL \
  -H "Content-Type: application/json" \
  -d '{"query": "best gaming keyboard 2025"}'

# Should return product data with URLs
```

## Security Notes

✅ **SECURE:** API key stored as environment variable on Cloudflare (encrypted)
✅ **SECURE:** API key never exposed in extension code
✅ **SECURE:** CORS headers allow extension to call worker
❌ **NEVER:** Commit API key to git
❌ **NEVER:** Put API key in extension code

## Custom Domain (Optional)

To use `https://tabmangment.com/api/serpapi-search` instead of `.workers.dev`:

1. In Cloudflare Dashboard → Workers → `serpapi-search-worker`
2. Click **Triggers** tab
3. Click **Add Route**
4. Route: `tabmangment.com/api/serpapi-search`
5. Zone: `tabmangment.com`
6. Click **Save**

## Monitoring

View logs in Cloudflare Dashboard:
- Workers → `serpapi-search-worker` → **Logs** tab
- See all API requests and errors in real-time
