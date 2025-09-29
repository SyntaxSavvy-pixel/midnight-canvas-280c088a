# 🚀 TabManagement Extension - Deployment Guide

## Quick Deployment to Vercel

### Step 1: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import from GitHub: `WEBBULIDERPRO/tabmangment-extension`
5. Click "Deploy"

### Step 2: Set Environment Variables in Vercel Dashboard
After deployment, add these environment variables in your Vercel project settings:

```
NODE_ENV=production
APP_URL=https://your-project-name.vercel.app
API_BASE_URL=https://your-project-name.vercel.app/api

# Authentication
JWT_SECRET=tabmanagement_jwt_secret_prod_2024
SESSION_SECRET=tabmanagement_session_secret_prod_2024

# Stripe (add your real keys)
STRIPE_PUBLISHABLE_KEY=pk_live_your_real_stripe_key
STRIPE_SECRET_KEY=sk_live_your_real_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Optional - Vercel KV for user data
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
```

### Step 3: Test Your Deployment
1. Visit your Vercel URL
2. Test authentication at `/auth` or `/login`
3. Try API endpoints at `/api/me`

### Current Project Status ✅
- ✅ All files restored and ready
- ✅ API endpoints configured
- ✅ Vercel configuration (vercel.json) set up
- ✅ GitHub repository connected
- ✅ Environment variables template ready

## Chrome Extension Setup
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this project folder
5. Update `config.js` with your live Vercel URL

Your extension is ready to deploy! 🎉