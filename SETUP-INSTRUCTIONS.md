# 🚀 Quick Setup Instructions - Fix Pro Plan Issue

## ⚠️ CRITICAL: Database Setup Required

Your Supabase database is **missing required columns**. Follow these steps **IN ORDER**:

---

## Step 1: Fix Supabase Database (REQUIRED)

### Open Supabase SQL Editor:
1. Go to [https://supabase.com](https://supabase.com)
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Run This SQL:
```sql
-- Add missing columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_plan_updated_at ON users(plan_updated_at);
```

### Verify It Worked:
```sql
-- Check all columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id`, `user_id`, `email`, `name`, `password_hash`
- `is_pro`, `subscription_status`
- `stripe_customer_id`, `stripe_subscription_id`
- `current_period_end`, `created_at`, `updated_at`
- `last_payment_at`, `last_failed_payment_at`, `plan_updated_at`

---

## Step 2: Reload Extension

1. Go to `chrome://extensions`
2. Find "Tabmangment" extension
3. Click the **reload** icon ⟳
4. Refresh any open dashboard tabs

---

## Step 3: Test Payment Flow

### Testing Checklist:
- [ ] Open dashboard → Should show your real email (not fallback_xxx)
- [ ] Click "Upgrade to Pro" → Redirects to Stripe
- [ ] Complete payment (use Stripe test card: `4242 4242 4242 4242`)
- [ ] Redirected back to dashboard → Should show "Pro" plan
- [ ] Open extension popup → Should show "Pro" (no flicker!)
- [ ] Close and reopen popup → Should STILL show "Pro"
- [ ] Wait 30 seconds → Should STILL show "Pro"
- [ ] Refresh dashboard → Should STILL show "Pro"

### Debug Queries:
```sql
-- Check if your Pro status is saved in database
SELECT email, is_pro, subscription_status, plan_updated_at
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- Should return:
-- is_pro = true
-- subscription_status = 'active'
-- plan_updated_at = [recent timestamp]
```

---

## Step 4: Check Webhook Configuration

### Stripe Webhook Setup:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Verify webhook endpoint: `https://tabmangment.netlify.app/api/stripe-webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### Test Webhook:
```bash
# Install Stripe CLI
# Then run:
stripe listen --forward-to https://tabmangment.netlify.app/api/stripe-webhook
stripe trigger checkout.session.completed
```

---

## Common Issues & Solutions

### Issue: "Extension still shows fallback email"
**Solution:** Dashboard needs to send USER_LOGIN to extension.
1. Refresh dashboard with extension installed
2. Check console for: `📧 Syncing user email to extension`
3. Extension should log: `📧 Received USER_LOGIN from dashboard: your@email.com`

### Issue: "Pro status disappears after refresh"
**Solution:** API is returning Free before webhook updates database.
1. Check database has `plan_updated_at` column (Step 1)
2. Verify webhook is configured (Step 4)
3. Check Netlify logs for webhook receipt
4. All API calls should now be disabled - storage is source of truth

### Issue: "Payment succeeds but Pro not activated"
**Solution:** Database column missing or webhook not firing.
1. Run Step 1 SQL migration
2. Check Stripe webhook configuration
3. Look at Netlify function logs: `netlify functions:log stripe-webhook`
4. Check Supabase logs for database errors

---

## What Changed?

### Code Changes:
✅ Disabled all API calls that overwrite Pro status
✅ Storage is now **absolute source of truth**
✅ API can only UPGRADE to Pro, never DOWNGRADE to Free
✅ Dashboard sends real user email to extension
✅ Removed periodic 5-minute API checks

### Database Changes:
✅ Added `name` column for user display
✅ Added `password_hash` column for authentication
✅ Added `plan_updated_at` column for tracking Pro activation

### Result:
🎉 Pro status **persists forever** until user cancels via Stripe!
🎉 No more flickering between Pro and Free!
🎉 Webhook updates database → Extension trusts storage → Works!

---

## Need Help?

### Check Console Logs:
- **Dashboard**: Look for `📡 Notifying extension of Pro activation`
- **Extension Background**: Look for `✅ Subscription data updated in storage`
- **Extension Popup**: Look for `✅ Pro plan found in storage - trusting it`

### Verify Storage:
```javascript
// In extension popup console:
chrome.storage.local.get(['isPremium', 'planType', 'userEmail'], console.log)

// Should show:
// isPremium: true
// planType: "pro"
// userEmail: "your@email.com" (not fallback_xxx)
```

### Check Database:
```sql
-- In Supabase SQL Editor:
SELECT * FROM users WHERE email = 'your@email.com';

-- Verify:
-- is_pro = true
-- plan_updated_at is not null
```

---

## Success Criteria

After running Step 1 (database migration), you should see:

✅ Payment succeeds in Stripe
✅ Dashboard immediately shows "Pro"
✅ Extension popup shows "Pro"
✅ Close/reopen popup → **STILL shows "Pro"**
✅ Refresh dashboard → **STILL shows "Pro"**
✅ No console errors about missing columns
✅ No "flickering" between Pro and Free

**If all checkboxes are ✅, the issue is fixed!** 🎉
