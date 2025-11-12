# ⚡ Quick Start - Immediate Action Items

## 🔥 CRITICAL - Do These First (5 minutes)

### 1️⃣ Update Supabase Database Schema
```sql
-- Copy and paste this into Supabase SQL Editor and run:
ALTER TABLE users_auth
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

**Where:** Supabase Dashboard → SQL Editor → Paste → Run

---

### 2️⃣ Verify Cloudflare Environment Variables

**Go to:** Cloudflare Dashboard → Pages → tabmangment → Settings → Environment Variables

**Must have these 5 variables:**
```
✅ SUPABASE_URL              = https://xxx.supabase.co
✅ SUPABASE_SERVICE_ROLE_KEY = eyJxxx...
✅ SUPABASE_ANON_KEY         = eyJxxx...
✅ STRIPE_SECRET_KEY         = sk_live_xxx or sk_test_xxx
✅ STRIPE_WEBHOOK_SECRET     = whsec_xxx
```

**If missing any:** Add them now from your Supabase/Stripe dashboards

---

### 3️⃣ Configure Stripe Webhook

**Go to:** Stripe Dashboard → Developers → Webhooks → Add Endpoint

**Endpoint URL:** `https://tabmangment.com/api/stripe-webhook`

**Events to select:**
- ✅ checkout.session.completed
- ✅ customer.subscription.created
- ✅ customer.subscription.updated
- ✅ customer.subscription.deleted
- ✅ invoice.payment_succeeded
- ✅ invoice.payment_failed

**After creating:** Copy the "Signing secret" (whsec_xxx) and add to Cloudflare env vars as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Quick Test (2 minutes)

### Test Subscription Flow:
1. Open your site: `https://tabmangment.com`
2. Click "Get Pro Monthly"
3. Sign in (or sign up)
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout
6. Should redirect to dashboard with "Pro Plan Active"

**If it works:** ✅ Everything is configured correctly!

**If it fails:**
- Check browser console for errors
- Check Cloudflare function logs
- Verify database has new columns
- Verify env vars are set

---

## 🔍 Verify Database Updated

Run this query in Supabase SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users_auth'
AND column_name LIKE '%pro%' OR column_name LIKE '%stripe%';
```

**Should return 7 rows** (the new columns)

---

## 📋 Full Testing Checklist

See `DEPLOYMENT_CHECKLIST.md` for comprehensive testing guide.

---

## ❓ Common Issues

### "Failed to create checkout session"
→ Check `STRIPE_SECRET_KEY` in Cloudflare env vars

### "Authentication required"
→ Check `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare env vars

### Users not getting Pro after payment
→ Check webhook is configured in Stripe
→ Check `STRIPE_WEBHOOK_SECRET` matches in Cloudflare

### Database errors
→ Make sure you ran the SQL migration above

---

## 🎯 Next Steps After Setup

1. Test all 3 subscription plans (Monthly, Yearly, Lifetime)
2. Test webhook events using Stripe Dashboard test webhooks
3. Test device authorization and removal
4. Test Pro feature gating (AI search limits, etc.)
5. Switch Stripe from test mode to live mode when ready
6. Monitor Cloudflare function logs for errors

---

## 💡 Pro Tips

- Keep Stripe in **test mode** while testing
- Use test card `4242 4242 4242 4242` for successful payments
- Use test card `4000 0000 0000 0002` to test payment failures
- Check Cloudflare function logs: Cloudflare → Pages → Functions → Logs
- Check Stripe webhook delivery: Stripe → Developers → Webhooks → Click your endpoint

---

## 🆘 Need Help?

1. Check Cloudflare function logs first
2. Check Stripe webhook event details
3. Check Supabase database to see if data is updating
4. Check browser console for client-side errors

**Files to review:**
- `DEPLOYMENT_CHECKLIST.md` - Complete testing guide
- `SUPABASE_MIGRATION.sql` - Full database migration
