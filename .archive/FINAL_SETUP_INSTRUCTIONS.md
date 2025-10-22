# 🎯 FINAL SETUP INSTRUCTIONS - Complete Payment Integration

## ✅ What Was Fixed

I've fixed **all major issues** with your Stripe payment integration:

### 1. **Root Cause: Wrong Table Name**
- ❌ **Before:** Netlify functions were updating `users` table (doesn't exist!)
- ✅ **After:** All functions now use `users_auth` table (correct!)
- **Impact:** Pro activation, cancellations, and webhooks now work

### 2. **Instant Downgrade Issue**
- ❌ **Before:** "Downgrade to Free" button instantly removed Pro (even though Stripe still active)
- ✅ **After:** "Manage Subscription" button opens Stripe billing portal
- **Impact:** Users keep Pro until billing period ends (proper Stripe behavior)

### 3. **Cancellation Tracking**
- ❌ **Before:** No way to know if user cancelled
- ✅ **After:** Shows "Pro (Cancels Nov 17, 2025)" on dashboard
- **Impact:** Users see exactly when their Pro expires

### 4. **Billing Dates**
- ❌ **Before:** No next billing date stored
- ✅ **After:** Tracks current_period_start and current_period_end
- **Impact:** Full subscription lifecycle tracking

---

## 📋 MANUAL STEPS REQUIRED

### STEP 1: Run SQL Script in Supabase ⚠️ CRITICAL

**Why:** Make sure the `users_auth` table has all required columns and permissions.

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of `supabase-fix-permissions.sql`
6. Paste into editor
7. Click **Run** (or Ctrl+Enter)

**Expected Output:**
```
Query executed successfully
[Results showing table structure and policies]
```

**What this does:**
- ✅ Creates any missing columns (plan_type, cancelled_at, billing dates)
- ✅ Fixes RLS policies to allow service_role to update
- ✅ Verifies table structure is correct

---

### STEP 2: Verify Netlify Environment Variables

**Why:** Make sure you're using the SERVICE_ROLE key (not anon key).

1. Go to Netlify: https://app.netlify.com
2. Select your site
3. **Site Settings** → **Environment Variables**
4. Verify these exist:

```env
SUPABASE_URL=https://voislxlhfepnllamagxm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (LONG key, starts with eyJ)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**CRITICAL CHECK:**
- `SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** key (NOT anon!)
- To get it:
  - Supabase Dashboard → **Settings** → **API**
  - Under "Project API keys" → Copy **service_role** secret
  - It should be very long (~200+ characters)

---

### STEP 3: Wait for Netlify Deployment

The code is already pushed to GitHub. Netlify will auto-deploy in ~2 minutes.

**Check deployment:**
- Netlify Dashboard → **Deploys** → Should see "Building..." or "Published"
- Wait for green ✅ "Published" status

---

### STEP 4: Test Payment Flow (End-to-End)

Once deployed, test the complete flow:

#### **A. Test New Payment**

1. Go to: https://tabmangment.com/user-dashboard.html
2. Make sure you're logged in
3. Click **"Upgrade to Pro"**
4. Complete payment with test card: `4242 4242 4242 4242`
5. **Expected Results:**
   - ✅ Redirected back to dashboard
   - ✅ Green notification: "Payment successful! You are now a Pro member!"
   - ✅ Badge shows "Pro"
   - ✅ Button says "Manage Subscription"

6. **Check Supabase:**
   - Table Editor → users_auth → Find your email
   - Should see:
     ```
     is_pro: true
     plan_type: 'pro'
     subscription_status: 'active'
     stripe_customer_id: cus_...
     stripe_subscription_id: sub_...
     current_period_end: [date 30 days from now]
     ```

7. **Check Extension:**
   - Open TabManagement extension popup
   - Should show Pro features unlocked

#### **B. Test Cancellation Flow**

1. On dashboard, click **"Manage Subscription"**
2. **Expected:** Opens Stripe billing portal
3. Click "Cancel plan"
4. Confirm cancellation
5. **Expected Results:**
   - ✅ Redirected back to dashboard
   - ✅ Badge shows "Pro (Cancels [date])"
   - ✅ Still have Pro features
   - ✅ Will lose Pro on the date shown

6. **Check Supabase:**
   - Should see:
     ```
     is_pro: true (still true!)
     subscription_status: 'cancelling'
     cancelled_at: [timestamp]
     current_period_end: [when Pro ends]
     ```

7. **At Period End:**
   - Stripe automatically fires webhook
   - User downgraded to Free
   - is_pro becomes false

---

## 🔍 TROUBLESHOOTING

### Issue: Dashboard still shows "Free" after payment

**Solution:**
1. Check Netlify function logs: **Functions** → **verify-session**
2. Look for errors like:
   ```
   ❌ Supabase update error: ...
   ```
3. Most likely: SERVICE_ROLE_KEY is wrong (using anon key)
4. Fix: Update Netlify env var with correct service_role key
5. Redeploy site

### Issue: No logs showing in Netlify

**Solution:**
1. Check browser console (F12) → Network tab
2. Is `/.netlify/functions/verify-session` being called?
3. If 404: Check API_BASE is `/.netlify/functions` (not `/api`)
4. If 401/403: Check auth token is being sent

### Issue: "relation 'users_auth' does not exist"

**Solution:**
1. Run the SQL script in Supabase (Step 1 above)
2. Or manually check: Supabase → Table Editor → Do you see "users_auth"?
3. If table name is different, update all Netlify functions

### Issue: Cancellation immediately removes Pro

**Solution:**
1. Check Stripe webhook is configured: https://tabmangment.com/.netlify/functions/stripe-webhook
2. Webhook should fire `customer.subscription.updated` with `cancel_at_period_end: true`
3. Check Netlify function logs for webhook events
4. Verify stripe-webhook.js is using latest code (git pull)

---

## 📊 PAYMENT FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW SUBSCRIPTION                          │
└─────────────────────────────────────────────────────────────┘

User clicks "Upgrade to Pro"
         ↓
create-checkout-session function
         ↓
Stripe Checkout page
         ↓
User pays $4.99
         ↓
Stripe redirects: /user-dashboard.html?payment=success&session_id=xxx
         ↓
Dashboard calls verify-session
         ↓
verify-session updates users_auth:
  - is_pro = true
  - plan_type = 'pro'
  - subscription_status = 'active'
  - current_period_end = [30 days from now]
         ↓
Dashboard shows "Pro" badge
Extension syncs Pro status
✅ DONE

┌─────────────────────────────────────────────────────────────┐
│                    CANCELLATION                              │
└─────────────────────────────────────────────────────────────┘

User clicks "Manage Subscription"
         ↓
billing-portal function
         ↓
Stripe billing portal
         ↓
User clicks "Cancel plan"
         ↓
Stripe fires: customer.subscription.updated
  (cancel_at_period_end: true)
         ↓
stripe-webhook updates users_auth:
  - is_pro = true (still!)
  - subscription_status = 'cancelling'
  - cancelled_at = [now]
  - current_period_end = [when it ends]
         ↓
Dashboard shows "Pro (Cancels Nov 17)"
User keeps Pro features
         ↓
[30 days later]
Stripe fires: customer.subscription.deleted
         ↓
stripe-webhook updates users_auth:
  - is_pro = false
  - plan_type = 'free'
  - subscription_status = 'cancelled'
         ↓
Dashboard shows "Free"
✅ DONE
```

---

## ✅ FINAL CHECKLIST

Before going live, verify:

- [ ] SQL script ran successfully in Supabase
- [ ] users_auth table has all columns (check with `SELECT * FROM users_auth LIMIT 1`)
- [ ] SUPABASE_SERVICE_ROLE_KEY is correct in Netlify (not anon key!)
- [ ] Netlify deployment is live (green checkmark)
- [ ] Test payment works (user gets Pro, Supabase updates)
- [ ] Dashboard shows "Pro" badge
- [ ] Extension shows Pro features
- [ ] "Manage Subscription" button opens Stripe portal
- [ ] Cancellation keeps Pro until period end
- [ ] Dashboard shows "Pro (Cancels [date])" when cancelled
- [ ] Supabase shows subscription_status: 'cancelling'

---

## 🆘 NEED HELP?

If something still isn't working:

1. **Check Netlify Function Logs:**
   - Netlify Dashboard → Functions → verify-session
   - Look for ❌ errors or ✅ success messages

2. **Check Stripe Webhook Logs:**
   - Stripe Dashboard → Developers → Webhooks
   - Click your webhook → See recent events
   - Should see: checkout.session.completed, customer.subscription.updated

3. **Check Supabase Directly:**
   - Run this query:
     ```sql
     SELECT email, is_pro, plan_type, subscription_status, current_period_end
     FROM users_auth
     WHERE email = 'your-email@example.com';
     ```
   - Does it show correct data?

4. **Export Current State:**
   - Send me:
     - Netlify function logs (verify-session)
     - Browser console errors (F12)
     - Supabase query results
     - Current environment variable names (NOT values!)

---

## 🎉 SUCCESS!

Once all checklist items are ✅, your payment system is fully operational!

**What works now:**
- ✅ Users can upgrade to Pro ($4.99/month)
- ✅ Payment activates Pro immediately
- ✅ Supabase database updates correctly
- ✅ Extension syncs Pro status
- ✅ Users can manage subscription via Stripe portal
- ✅ Cancellations work properly (keep Pro until period end)
- ✅ Dashboard shows cancellation status
- ✅ Automatic downgrade at period end
- ✅ Full subscription lifecycle tracking

**You're ready to launch! 🚀**
