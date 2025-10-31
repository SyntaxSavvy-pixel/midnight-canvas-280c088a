# 🚀 Cloudflare Pages Deployment Guide for TabManagement

This guide will walk you through deploying TabManagement to Cloudflare Pages step by step.

## ✅ Prerequisites

- Cloudflare account (free tier works!)
- GitHub repository with your code
- Domain `tabmangment.com` already added to Cloudflare

---

## 📋 Step 1: Connect GitHub to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **"Workers & Pages"** in the left sidebar
3. Click **"Create application"**
4. Select **"Pages"** tab
5. Click **"Connect to Git"**
6. Select **GitHub** and authorize Cloudflare
7. Select your repository: **`WEBBULIDERPRO/tabmangment-extension`**
8. Click **"Begin setup"**

---

## 📋 Step 2: Configure Build Settings

On the build configuration page:

**Project name:** `tabmanagement` (or your preferred name)

**Production branch:** `main`

**Build settings:**
- **Framework preset:** `None`
- **Build command:** Leave empty (no build needed)
- **Build output directory:** `/` (root directory)

Click **"Save and Deploy"**

---

## 📋 Step 3: Set Up Environment Variables

After initial deployment (even if it fails), go to:

1. Click on your project name
2. Go to **"Settings"** tab
3. Click **"Environment variables"**
4. Add these variables for **"Production"** environment:

### Required Environment Variables:

```
SUPABASE_URL = https://YOUR_SUPABASE_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY = YOUR_SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY = sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY = pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_ID = price_YOUR_PRICE_ID
STRIPE_WEBHOOK_SECRET = whsec_YOUR_WEBHOOK_SECRET
```

### Where to find these values:

**Supabase:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to **Settings → API**
- Copy **"URL"** for `SUPABASE_URL`
- Copy **"service_role"** key for `SUPABASE_SERVICE_ROLE_KEY`

**Stripe:**
- Go to [Stripe Dashboard](https://dashboard.stripe.com/)
- Go to **Developers → API keys**
- Copy **"Secret key"** for `STRIPE_SECRET_KEY`
- Copy **"Publishable key"** for `STRIPE_PUBLISHABLE_KEY`
- Go to **Products** → Click your Pro plan product
- Copy the **Price ID** (starts with `price_`) for `STRIPE_PRICE_ID`

**Stripe Webhook Secret:**
- Go to **Developers → Webhooks**
- Click **"Add endpoint"**
- Endpoint URL: `https://tabmangment.com/api/stripe-webhook`
- Select events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Click **"Add endpoint"**
- Copy the **Signing secret** (starts with `whsec_`) for `STRIPE_WEBHOOK_SECRET`

---

## 📋 Step 4: Install Function Dependencies

Cloudflare Pages needs dependencies installed:

1. In your project root, make sure `/functions/package.json` exists (already created)
2. Cloudflare will automatically install dependencies from this file

---

## 📋 Step 5: Configure Custom Domain

1. In Cloudflare Pages project, go to **"Custom domains"** tab
2. Click **"Set up a custom domain"**
3. Enter: `tabmangment.com`
4. Click **"Continue"**
5. Cloudflare will automatically set up DNS (since domain is already on Cloudflare)
6. Wait 2-5 minutes for SSL certificate to be issued

---

## 📋 Step 6: Redeploy with Environment Variables

After adding environment variables:

1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click **"..."** menu → **"Retry deployment"**
4. Wait for deployment to complete (usually 1-2 minutes)

---

## 📋 Step 7: Verify Deployment

Test these endpoints:

1. **Homepage:** https://tabmangment.com
2. **Dashboard:** https://tabmangment.com/user-dashboard.html
3. **API Status:** https://tabmangment.com/api/status
4. **Privacy:** https://tabmangment.com/privacy.html

---

## 🧪 Step 8: Test Stripe Integration

1. Go to https://tabmangment.com/user-dashboard.html
2. Log in with your account
3. Click **"Upgrade to Pro"** button
4. Should redirect to Stripe Checkout (no more 503 errors!)
5. Use Stripe test card: `4242 4242 4242 4242`
6. Complete checkout
7. Should redirect back to dashboard with Pro features unlocked

---

## ⚡ Quick Commands Reference

### View Logs:
```bash
# In Cloudflare Dashboard
Workers & Pages → Your Project → Functions → Real-time logs
```

### Trigger Manual Deployment:
```bash
git commit -m "Deploy to Cloudflare"
git push origin main
# Cloudflare automatically deploys on push
```

### Roll Back Deployment:
```bash
# In Cloudflare Dashboard
Deployments → Find previous working deployment → Rollback
```

---

## 🔧 Troubleshooting

### Issue: 503 Errors on API Calls

**Solution:**
1. Check environment variables are set correctly
2. Make sure `/functions/package.json` exists
3. Redeploy after adding variables

### Issue: Stripe Checkout Not Loading

**Solution:**
1. Verify `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` are correct
2. Check Stripe Dashboard for any errors
3. Make sure Stripe webhook endpoint is configured

### Issue: Domain Not Working

**Solution:**
1. Ensure domain DNS is managed by Cloudflare
2. Check custom domain settings in Pages
3. Wait 5 minutes for SSL certificate

### Issue: Function Errors

**Solution:**
1. Check real-time logs in Cloudflare Dashboard
2. Ensure all dependencies are in `/functions/package.json`
3. Verify environment variables match your config

---

## 📊 Monitoring & Analytics

Cloudflare provides:
- **Real-time logs** for debugging
- **Analytics** for traffic monitoring
- **Web Analytics** for user insights

Enable these in your project settings.

---

## 🎉 Success Checklist

- [ ] Site deployed to Cloudflare Pages
- [ ] Environment variables configured
- [ ] Custom domain `tabmangment.com` working
- [ ] SSL certificate active (https://)
- [ ] API endpoints responding
- [ ] Stripe checkout working
- [ ] User dashboard accessible
- [ ] Pro features properly gated

---

## 🚀 You're Live!

Your site is now running on Cloudflare Pages with:
- ✅ **Global CDN** for fast loading
- ✅ **Free SSL** certificate
- ✅ **Serverless functions** for API
- ✅ **Unlimited bandwidth** (free tier: 500 builds/month)
- ✅ **No usage limits** like Netlify!

**Next Steps:**
1. Test all features thoroughly
2. Submit extension to Chrome Web Store
3. Monitor logs for any errors
4. Update documentation as needed

---

## 📞 Need Help?

- Cloudflare Docs: https://developers.cloudflare.com/pages/
- Cloudflare Community: https://community.cloudflare.com/
- Stripe Docs: https://stripe.com/docs

---

**Last Updated:** October 30, 2025
