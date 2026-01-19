# 🛠️ Development Server Setup

## The Problem

The project has:
- **Frontend**: Vite dev server (port 8080)
- **API**: Vercel serverless functions (`/api/search/*`)

When running `npm run dev`, only the frontend runs, causing 404 errors for API calls.

## The Solution

We've configured a proxy in Vite to forward API requests. Here's how to run everything:

### Option 1: Using Vercel Dev (Recommended for Production-like Environment)

```bash
# Install Vercel CLI globally (if not already)
npm install -g vercel

# From the root directory (/tabkeep-app)
cd ..
vercel dev --yes --listen 3000
```

Then in another terminal:
```bash
# Run frontend with proxy to Vercel dev
cd midnight-canvas-280c088a
npm run dev
```

The frontend (port 8080) will proxy `/api/*` requests to Vercel dev (port 3000).

### Option 2: Quick Development (Current Setup)

The Vite config is already updated with a proxy. Just make sure your API endpoints work:

```bash
# Run the frontend
npm run dev
```

The proxy will forward API requests to `http://localhost:3000/api/*`

### Option 3: Simple Local API Server (Alternative)

If Vercel dev isn't working, you can create a simple Express server:

```bash
# Install dependencies (in root)
cd ..
npm install express cors dotenv @vercel/node @supabase/supabase-js
```

Then create and run `dev-api-server.js` (we can create this if needed).

## Current Configuration

### Vite Config (`vite.config.ts`)

```typescript
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  // ... rest of config
});
```

### Environment Variables

Make sure these are set in `.env.local`:

```bash
# Supabase (Required for API)
VITE_SUPABASE_URL=https://kfyzgqbnjvzemwivfcew.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ✅ NOW CONFIGURED

# Google Search (Required for Google API)
GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_id

# AI (Choose one)
VITE_GROQ_API_KEY=your_key           # Free
VITE_OPENAI_API_KEY=your_key         # GPT-4 (recommended)
VITE_ANTHROPIC_API_KEY=your_key      # Claude
```

## Testing the Setup

### Test Frontend
```bash
npm run dev
# Visit http://localhost:8080
```

### Test API Endpoints

Using the browser console or curl:

```bash
# Test Google Search API
curl -X POST http://localhost:3000/api/search/google \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{"query": "test search"}'
```

Or from the app:
1. Sign in
2. Switch to "Search" mode
3. Enter a query
4. Check browser console for API calls

## Troubleshooting

### 404 on `/api/search/google`

**Problem**: API endpoints not being served

**Solutions**:
1. Make sure Vercel dev is running on port 3000
2. Check the Vite proxy configuration
3. Verify `.env.local` is in the correct location

### "Not authenticated" error

**Problem**: Missing or invalid Supabase token

**Solution**: Make sure you're signed in to the app before searching

### "Google Custom Search API not configured"

**Problem**: Missing Google API credentials

**Solution**: Add `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` to `.env.local`

### Vercel dev won't start

**Problem**: Project not linked or authentication issues

**Solutions**:
```bash
# Re-link the project
cd .. # to root directory
vercel link --yes

# Or skip Vercel dev and use alternative setup
```

## Production Deployment

When deploying to Vercel:

1. **Push to Git**:
   ```bash
   git add .
   git commit -m "feat: upgrade AI and fix API"
   git push
   ```

2. **Vercel will automatically**:
   - Build the frontend from `midnight-canvas-280c088a`
   - Deploy API functions from `api/search/*`
   - Use environment variables from Vercel dashboard

3. **Set Environment Variables** in Vercel Dashboard:
   - All the keys from `.env.local`
   - Important: Add `SUPABASE_SERVICE_ROLE_KEY` (keep it secret!)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run frontend (port 8080) |
| `vercel dev --listen 3000` | Run API + frontend (port 3000) |
| `npm run build` | Build for production |
| `vercel --prod` | Deploy to production |

## Files Modified

1. ✅ `vite.config.ts` - Added API proxy
2. ✅ `.env.local` - Added SUPABASE_SERVICE_ROLE_KEY
3. ✅ `src/services/ai/advanced-ai.service.ts` - New AI service
4. ✅ `src/hooks/useMultiPlatformSearch.ts` - Added thinking process
5. ✅ `src/components/search/SearchResults.tsx` - UI for thinking
6. ✅ `src/pages/Index.tsx` - Updated to show AI provider

## Next Steps

1. **Choose an AI provider** (OpenAI or Claude recommended)
2. **Add API key** to `.env.local`
3. **Restart dev server**
4. **Test a search!**

You should now see:
- ✨ AI thinking process displayed
- 🧠 Intelligent query analysis
- 🎯 Better search results
- 📊 "Powered by GPT-4" or "Powered by Claude" badge
