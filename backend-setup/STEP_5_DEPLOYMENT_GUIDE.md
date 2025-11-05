# STEP 5: Deployment Guide

## Quick Start Checklist
- [ ] ✅ Step 1: Supabase table created
- [ ] ✅ Step 2: Environment variables configured
- [ ] ✅ Step 3: API endpoints created
- [ ] ✅ Step 4: Dependencies installed
- [ ] 🚀 Step 5: Deploy to Cloudflare

---

## Deployment Options

### Option A: Via Cloudflare Dashboard (Easiest)

1. **Go to Cloudflare Dashboard**
   - Navigate to `Pages` → Your project (`tabmangment.com`)

2. **Upload Function Files**
   - Create folder structure in your project:
     ```
     /functions
       /api
         check-search-usage.js
         increment-search.js
     ```

3. **Install Dependencies**
   - In your project root, run:
     ```bash
     npm install @supabase/supabase-js
     ```

4. **Deploy**
   - Commit and push to your connected Git repository
   - Cloudflare will auto-deploy on push
   - Or use manual deploy in dashboard

---

### Option B: Via Wrangler CLI (Advanced)

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Install Dependencies**
   ```bash
   cd /path/to/your/project
   npm install @supabase/supabase-js
   ```

4. **Deploy Functions**
   ```bash
   wrangler pages publish
   ```

---

## File Structure

Your project should look like this:

```
tabmangment.com/
├── functions/
│   └── api/
│       ├── check-search-usage.js
│       └── increment-search.js
├── package.json
├── wrangler.toml (optional)
└── ... (your other files)
```

---

## Testing After Deployment

### Test Check Search Usage
```bash
curl -X POST https://tabmangment.com/api/check-search-usage \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response:
```json
{
  "success": true,
  "searchCount": 0,
  "canSearch": true,
  "remaining": 5,
  "resetsAt": null,
  "isPro": false
}
```

### Test Increment Search
```bash
curl -X POST https://tabmangment.com/api/increment-search \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Search recorded successfully",
  "searchCount": 1,
  "remaining": 4,
  "limitReached": false,
  "isPro": false
}
```

---

## Troubleshooting

### Error: "SUPABASE_URL is not defined"
- Check environment variables in Cloudflare dashboard
- Ensure they're set for Production environment
- Redeploy after adding variables

### Error: "Failed to record search"
- Verify Supabase table exists (`search_usage`)
- Check service role key is correct
- Verify RLS policies allow service role access

### Error: "CORS blocked"
- Ensure `Access-Control-Allow-Origin: *` is in response headers
- Check OPTIONS handler is implemented

### Error: "Database error"
- Check Supabase connection string
- Verify service role key permissions
- Check table indexes exist

---

## Monitoring

### View Logs
- Cloudflare Dashboard → Workers & Pages → Your project → Logs
- Real-time log stream shows all API calls

### Monitor Usage
```sql
-- Run in Supabase SQL Editor
SELECT
  user_email,
  COUNT(*) as search_count,
  MAX(searched_at) as last_search
FROM search_usage
WHERE searched_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
ORDER BY search_count DESC
LIMIT 20;
```

---

## Rollback (If Needed)

If something goes wrong:
1. Go to Cloudflare Dashboard → Deployments
2. Click "Rollback" on previous working deployment
3. Fix issues and redeploy

---

## ✅ Deployment Complete!

Once deployed, the extension will automatically use the backend APIs.

### Verify End-to-End:
1. Open Chrome extension
2. Perform a search
3. Check Supabase dashboard → `search_usage` table
4. Verify record was created with correct email
5. Try logout/login → search count persists ✅

---

## Next Steps
- [ ] Monitor logs for first week
- [ ] Set up daily cleanup cron job
- [ ] Add rate limiting (optional)
- [ ] Set up alerts for errors
