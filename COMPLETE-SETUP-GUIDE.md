# 🚀 Complete Setup Guide - From Scratch

## Overview
We're going to set up:
1. ✅ Supabase database for user accounts
2. ✅ Stripe for payments
3. ✅ Netlify for hosting
4. ✅ Connect everything together

**Time needed:** ~15 minutes

Let's go step-by-step!

---

# PART 1: Create Supabase Project (5 minutes)

## Step 1.1: Sign Up / Login to Supabase

1. Open your browser
2. Go to: **https://supabase.com**
3. Click **"Start your project"** (green button, top right)
4. Sign in with GitHub (recommended) or email

## Step 1.2: Create New Project

1. After login, you'll see "Create a new project"
2. Click **"+ New project"**
3. Fill in:
   - **Name:** `tabmangment` (or whatever you want)
   - **Database Password:** Create a STRONG password
     - Example: `MySecurePass123!@#`
     - **WRITE THIS DOWN!** You'll need it later
   - **Region:** Choose closest to you (e.g., "US West")
   - **Pricing Plan:** Free (for now)
4. Click **"Create new project"**
5. Wait ~2 minutes for project to set up (green checkmark when done)

## Step 1.3: Get Your Credentials

Once project is ready:

1. Click **"Settings"** (gear icon) in left sidebar
2. Click **"API"** in the settings menu
3. You'll see these important values - **COPY THEM NOW:**

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon / public key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
   ```

   **service_role key:** (click "Reveal" to see it)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
   ```

4. **PASTE THESE 3 VALUES IN A NOTEPAD!** You'll need them in Part 3.

---

# PART 2: Create Database Table (3 minutes)

## Step 2.1: Open SQL Editor

1. In Supabase dashboard, click **"SQL Editor"** in left sidebar (icon looks like `</>`)
2. Click **"+ New query"** button (top right)
3. You'll see an empty SQL editor

## Step 2.2: Create Users Table

Copy this ENTIRE SQL code:

```sql
-- Create users table with ALL required columns
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  is_pro BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_payment_at TIMESTAMPTZ,
  last_failed_payment_at TIMESTAMPTZ,
  plan_updated_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_pro ON users(is_pro);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_plan_updated_at ON users(plan_updated_at);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Now:**
1. **Paste** the SQL code into the editor
2. Click **"Run"** button (or press **F5**)
3. You should see: **"Success. No rows returned"** (this is GOOD!)

## Step 2.3: Verify Table Was Created

Run this query:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

You should see **15 columns** listed:
- id, user_id, email, name, password_hash
- is_pro, subscription_status
- stripe_customer_id, stripe_subscription_id
- current_period_end, created_at, updated_at
- last_payment_at, last_failed_payment_at, plan_updated_at

✅ If you see all 15 columns, **DATABASE IS READY!**

---

# PART 3: Configure Netlify Environment Variables (3 minutes)

## Step 3.1: Open Netlify Dashboard

1. Go to: **https://app.netlify.com**
2. Sign in
3. Click on your **"tabmangment"** site

## Step 3.2: Add Environment Variables

1. Click **"Site settings"** (in top navigation)
2. Click **"Environment variables"** (in left sidebar, under "Build & deploy")
3. Click **"Add a variable"** button

Now add these **6 variables** one by one:

### Variable 1: SUPABASE_URL
- **Key:** `SUPABASE_URL`
- **Value:** Paste your Project URL from Step 1.3
  - Example: `https://xxxxxxxxxxxxx.supabase.co`
- Click **"Create variable"**

### Variable 2: SUPABASE_SERVICE_ROLE_KEY
- **Key:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Paste your service_role key from Step 1.3
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...`
- Click **"Create variable"**

### Variable 3: SUPABASE_ANON_KEY
- **Key:** `SUPABASE_ANON_KEY`
- **Value:** Paste your anon/public key from Step 1.3
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...`
- Click **"Create variable"**

### Variable 4: STRIPE_SECRET_KEY
- **Key:** `STRIPE_SECRET_KEY`
- **Value:** Get from Stripe Dashboard
  - Go to: https://dashboard.stripe.com/test/apikeys
  - Copy the **"Secret key"** (starts with `sk_test_...`)
  - If you don't see it, click **"Reveal test key"**
- Click **"Create variable"**

### Variable 5: STRIPE_PUBLISHABLE_KEY
- **Key:** `STRIPE_PUBLISHABLE_KEY`
- **Value:** From same Stripe page
  - Copy the **"Publishable key"** (starts with `pk_test_...`)
- Click **"Create variable"**

### Variable 6: STRIPE_PRICE_ID
- **Key:** `STRIPE_PRICE_ID`
- **Value:** Your Pro plan price ID from Stripe
  - Go to: https://dashboard.stripe.com/test/products
  - Find your Pro subscription product
  - Copy the Price ID (starts with `price_...`)
  - Example: `price_1Rzw2LLJKLfllJJD6HPKEDHK`
- Click **"Create variable"**

## Step 3.3: Redeploy Site

After adding all 6 variables:

1. Click **"Deploys"** (top navigation)
2. Click **"Trigger deploy"** dropdown
3. Click **"Clear cache and deploy site"**
4. Wait ~2 minutes for deployment to finish

✅ When deploy is done (green checkmark), **NETLIFY IS READY!**

---

# PART 4: Configure Stripe Webhook (2 minutes)

## Step 4.1: Create Webhook Endpoint

1. Go to: **https://dashboard.stripe.com/test/webhooks**
2. Click **"+ Add endpoint"** button
3. Fill in:
   - **Endpoint URL:** `https://tabmangment.netlify.app/api/stripe-webhook`
     (replace `tabmangment` with YOUR Netlify site name)
   - **Description:** "Tabmangment Subscription Webhook"
   - Click **"Select events"**

## Step 4.2: Select Events to Listen For

Find and CHECK these 4 events:

- ✅ `checkout.session.completed`
- ✅ `invoice.payment_succeeded`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

Click **"Add events"**

Click **"Add endpoint"**

## Step 4.3: Get Webhook Secret

1. After creating endpoint, click on it
2. Click **"Signing secret"** section
3. Click **"Reveal"** to see the secret (starts with `whsec_...`)
4. **COPY THIS SECRET!**

## Step 4.4: Add Webhook Secret to Netlify

1. Go back to Netlify → Site settings → Environment variables
2. Click **"Add a variable"**
3. Add:
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** Paste the webhook secret from Step 4.3
     - Example: `whsec_xxxxxxxxxxxxxxxxxxxxx`
4. Click **"Create variable"**

5. **Redeploy again:**
   - Deploys → Trigger deploy → Clear cache and deploy site

✅ **STRIPE WEBHOOK CONFIGURED!**

---

# PART 5: Test Everything (5 minutes)

## Step 5.1: Reload Extension

1. Open Chrome
2. Go to: `chrome://extensions`
3. Find "Tabmangment" extension
4. Click the **reload icon** ⟳

## Step 5.2: Open Dashboard

1. Go to: `https://tabmangment.netlify.app/auth`
   (replace `tabmangment` with your site name)
2. Create an account:
   - Enter your email
   - Enter password (at least 8 characters)
   - Enter your name
   - Click **"Sign Up"**

## Step 5.3: Check Database

Back in Supabase:

1. Click **"Table Editor"** (in left sidebar)
2. Click **"users"** table
3. You should see your newly created user!
4. Check the columns:
   - `email` = your email
   - `is_pro` = false
   - `subscription_status` = free

✅ If you see your user, **DATABASE CONNECTION WORKS!**

## Step 5.4: Test Pro Upgrade (TEST MODE)

1. In dashboard, click **"Upgrade to Pro"** button
2. You'll be redirected to Stripe checkout
3. Use TEST card number: `4242 4242 4242 4242`
4. Expiry: Any future date (e.g., `12/25`)
5. CVC: Any 3 digits (e.g., `123`)
6. ZIP: Any 5 digits (e.g., `12345`)
7. Click **"Subscribe"**

## Step 5.5: Verify Pro Activation

After payment:

1. **Dashboard** should show "Pro" badge
2. **Check Supabase:**
   - Go to Table Editor → users table
   - Find your user
   - `is_pro` should now be **true**
   - `subscription_status` should be **active**
   - `plan_updated_at` should have a timestamp

3. **Open Extension Popup:**
   - Click extension icon
   - Should show **"Pro"** plan

4. **Close and Reopen Popup:**
   - Close the popup
   - Click extension icon again
   - Should **STILL** show "Pro" (no flickering!)

5. **Check Console Logs:**
   - Right-click popup → Inspect → Console
   - You should see:
     ```
     ✅ Pro plan found in storage - trusting it permanently
     ```

✅ **If Pro persists after reopening, EVERYTHING WORKS!** 🎉

---

# Troubleshooting

## Problem: "Table doesn't exist" error

**Solution:**
1. Go back to Part 2
2. Make sure you ran the CREATE TABLE SQL
3. Check Table Editor - users table should be there

## Problem: "Environment variable not defined"

**Solution:**
1. Go back to Part 3
2. Make sure ALL 7 variables are added:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_ANON_KEY
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
   - STRIPE_PRICE_ID
   - STRIPE_WEBHOOK_SECRET
3. Redeploy site after adding them

## Problem: "Webhook not receiving events"

**Solution:**
1. Check webhook URL is correct:
   `https://YOUR-SITE.netlify.app/api/stripe-webhook`
2. Check webhook secret is added to Netlify
3. Test webhook in Stripe Dashboard:
   - Go to webhook → Send test event
   - Check Netlify function logs

## Problem: "Extension shows fallback email"

**Solution:**
1. Refresh dashboard page (F5)
2. Console should show: `📧 Syncing user email to extension`
3. Open extension popup
4. Console should show: `📧 Received USER_LOGIN from dashboard`

## Problem: "Pro status disappears"

**Solution:**
This should NOT happen anymore! If it does:
1. Check database has `plan_updated_at` column
2. Check Supabase logs for errors
3. Check Netlify function logs
4. Share error messages with me

---

# Success Checklist

✅ Supabase project created
✅ Users table created with 15 columns
✅ All 7 environment variables added to Netlify
✅ Stripe webhook configured
✅ Test payment completed
✅ Database shows `is_pro = true`
✅ Extension shows "Pro"
✅ Close/reopen popup → STILL shows "Pro"
✅ No "flickering" between Pro and Free

**If all checked, you're DONE!** 🎉

---

# What Happens After Setup?

## When User Pays:
1. Stripe charges card
2. Stripe sends webhook to Netlify
3. Webhook updates Supabase: `is_pro = true`
4. Dashboard calls `/api/verify-session`
5. Dashboard sends `SUBSCRIPTION_UPDATE` to extension
6. Extension saves Pro in `chrome.storage.local`
7. **Pro status persists forever** (until user cancels)

## Storage is Source of Truth:
- Extension NEVER queries API to overwrite Pro status
- API can only UPGRADE to Pro, never DOWNGRADE
- Only Stripe webhook can change subscription status
- Pro persists across browser restarts, extension reloads, etc.

**Everything is automatic from now on!** 🚀
