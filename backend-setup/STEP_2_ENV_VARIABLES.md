# STEP 2: Configure Environment Variables

## For Cloudflare Pages

### Option A: Via Cloudflare Dashboard (Recommended)
1. Go to Cloudflare Dashboard
2. Select your `tabmangment.com` project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Option B: Via wrangler.toml (Local Development)
Create or update `wrangler.toml` in your project root:

```toml
name = "tabmangment"
compatibility_date = "2024-01-01"

[vars]
# Public variables (safe to commit)
SUPABASE_URL = "https://your-project.supabase.co"

[env.production.vars]
# Secrets (DO NOT commit - add via Cloudflare dashboard)
# SUPABASE_SERVICE_ROLE_KEY is set via dashboard
```

---

## Getting Your Supabase Credentials

### 1. Supabase Project URL
- Go to your Supabase project dashboard
- Click **Settings** (gear icon) → **API**
- Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)

### 2. Supabase Service Role Key
- In the same **API** settings page
- Scroll to **Project API keys**
- Copy **service_role** key (starts with `eyJ...`)
- ⚠️ **IMPORTANT**: This is a SECRET key - never commit to git!

---

## Security Notes
- ✅ Use `service_role` key (not `anon` key) for backend
- ✅ Never expose service role key in frontend code
- ✅ Add secrets via Cloudflare dashboard, not in code
- ✅ Use environment variables for all sensitive data

---

## Verify Setup
After adding environment variables, they'll be available in your Cloudflare Functions as:
```javascript
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
```

✅ Environment variables configured!
Next: Create API endpoints
