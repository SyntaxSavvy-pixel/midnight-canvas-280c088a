# 🔧 STRIPE DASHBOARD CONFIGURATION GUIDE

## ⚠️ CRITICAL: You need to configure this MANUALLY in Stripe Dashboard

The code is correct, but Stripe needs to be configured to allow your redirect URLs.

---

## 🎯 STEP-BY-STEP STRIPE DASHBOARD SETUP:

### **Step 1: Login to Stripe Dashboard**

1. Go to: https://dashboard.stripe.com/
2. Login with your Stripe account
3. Make sure you're in **TEST MODE** (toggle in top right)

---

### **Step 2: Configure Allowed Redirect URLs**

1. In Stripe Dashboard, go to: **Settings** (bottom left)
2. Click: **Branding** (or **Customer Portal**)
3. Scroll to: **Redirect URLs** or **Allowed redirect URLs**
4. Add these URLs:

```
https://tabmangment.netlify.app/payment-success.html
https://tabmangment.netlify.app/user-dashboard.html
https://tabmangment.com/payment-success.html
https://tabmangment.com/user-dashboard.html
http://localhost:8888/payment-success.html (for testing)
```

5. Click **Save**

---

### **Step 3: Configure Checkout Settings** (MOST IMPORTANT!)

1. In Stripe Dashboard, go to: **Settings** → **Checkout settings**
2. OR go directly to: https://dashboard.stripe.com/settings/checkout
3. Find section: **After a customer completes their purchase**
4. Select: **Redirect to your website**
5. In the text box, enter:
   ```
   https://tabmangment.netlify.app/payment-success.html
   ```
6. Find section: **If a customer cancels their purchase**
7. Select: **Redirect to your website**
8. In the text box, enter:
   ```
   https://tabmangment.netlify.app/user-dashboard.html
   ```
9. Click **Save**

---

### **Step 4: Configure Webhook Endpoint**

1. In Stripe Dashboard, go to: **Developers** → **Webhooks**
2. Click: **Add endpoint**
3. Enter endpoint URL:
   ```
   https://tabmangment.netlify.app/.netlify/functions/stripe-webhook
   ```
4. Click: **Select events**
5. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Click: **Add endpoint**
7. **COPY the Webhook Signing Secret** (starts with `whsec_...`)
8. Save this secret - you'll need it for Netlify

---

### **Step 5: Get Your Stripe API Keys**

1. In Stripe Dashboard, go to: **Developers** → **API keys**
2. You should see:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)
3. Click **Reveal test key** to see the secret key
4. **COPY BOTH KEYS** - you'll need them for Netlify

---

### **Step 6: Configure Netlify Environment Variables**

1. Go to: https://app.netlify.com/
2. Select your site: **tabmangment**
3. Go to: **Site settings** → **Environment variables**
4. Add these variables:

```
STRIPE_SECRET_KEY = sk_test_... (from Step 5)
STRIPE_PUBLISHABLE_KEY = pk_test_... (from Step 5)
STRIPE_WEBHOOK_SECRET = whsec_... (from Step 4)
SUPABASE_URL = https://voislxlhfepnllamagxm.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [Your Supabase service role key]
```

5. Click **Save**
6. **Important:** Redeploy your site after adding env vars

---

### **Step 7: Create a Product and Price in Stripe**

1. In Stripe Dashboard, go to: **Products**
2. Click: **Add product**
3. Fill in:
   - **Name:** TabManagement Pro
   - **Description:** Pro plan with unlimited features
   - **Pricing model:** Recurring
   - **Price:** $9.99 (or your price)
   - **Billing period:** Monthly
4. Click: **Save product**
5. **COPY the Price ID** (starts with `price_...`)
6. You'll need this Price ID in your dashboard code

---

### **Step 8: Update Your Dashboard with Price ID**

Find in your code where you call Stripe checkout, update with your Price ID:

```javascript
// In user-dashboard.html, search for "createCheckoutSession"
const priceId = 'price_YOUR_PRICE_ID_HERE'; // Replace with your actual Price ID from Step 7
```

---

## 🧪 TEST THE COMPLETE FLOW:

### **After configuring everything above:**

1. Go to: https://tabmangment.netlify.app/user-dashboard.html
2. Click: "Upgrade to Pro"
3. Should redirect to Stripe Checkout
4. Use test card: **4242 4242 4242 4242**
5. Complete payment
6. **Should redirect back to:** payment-success.html ✅
7. Click "Go to Dashboard"
8. **Should show Pro badge** ✅

---

## 🔍 TROUBLESHOOTING:

### **Issue 1: "This redirect URL is not allowed"**

**Fix:**
- Go to Stripe Settings → Checkout settings
- Make sure `https://tabmangment.netlify.app/payment-success.html` is in allowed URLs
- Save and try again

### **Issue 2: "Webhook not firing"**

**Fix:**
- Check webhook endpoint is: `/.netlify/functions/stripe-webhook`
- Verify webhook secret is in Netlify env vars
- Check webhook status in Stripe Dashboard → Webhooks

### **Issue 3: "Invalid API key"**

**Fix:**
- Verify you copied the FULL secret key (starts with `sk_test_`)
- Make sure no spaces before/after in Netlify env vars
- Redeploy site after adding env vars

### **Issue 4: "Still not redirecting"**

**Fix:**
- Clear browser cache
- Try incognito mode
- Verify you saved Checkout settings in Stripe
- Check you're in TEST mode

---

## 📋 CHECKLIST - Did you do ALL of these?

- [ ] Added redirect URLs in Stripe Checkout settings
- [ ] Configured webhook endpoint in Stripe Webhooks
- [ ] Copied webhook signing secret
- [ ] Created product and price in Stripe
- [ ] Copied Price ID
- [ ] Added all env vars to Netlify:
  - [ ] STRIPE_SECRET_KEY
  - [ ] STRIPE_PUBLISHABLE_KEY
  - [ ] STRIPE_WEBHOOK_SECRET
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] Redeployed Netlify site
- [ ] Updated code with correct Price ID
- [ ] Tested in TEST mode
- [ ] Used test card 4242 4242 4242 4242

---

## 🎯 WHAT EACH COMPONENT DOES:

### **Checkout Settings in Stripe:**
- Controls where users go after payment
- MUST match your actual URLs
- Without this, Stripe won't redirect

### **Webhook Endpoint:**
- Stripe sends events here when payment completes
- Updates your database in background
- Backup system if redirect fails

### **Environment Variables:**
- Store sensitive API keys
- Code uses these to connect to Stripe
- Never commit these to GitHub!

### **Price ID:**
- Links your "Upgrade" button to Stripe product
- Tells Stripe what to charge
- Must match product you created

---

## 🚀 AFTER SETUP - SWITCHING TO LIVE MODE:

Once testing works, switch to LIVE mode:

1. In Stripe, toggle to **Live mode**
2. Create same product in Live mode
3. Get Live API keys (start with `pk_live_` and `sk_live_`)
4. Create webhook endpoint in Live mode
5. Update Netlify env vars with LIVE keys
6. Test with real card (then refund)
7. Launch! 🎉

---

## 💡 IMPORTANT NOTES:

- ⚠️ **Test mode cards don't charge real money**
- ⚠️ **Test/Live modes are separate** - configure both
- ⚠️ **Webhook secrets are different** for test/live
- ⚠️ **Price IDs are different** for test/live
- ⚠️ **Always test in TEST mode first**

---

## 📞 NEED HELP?

If you get stuck on any step:

1. Check Stripe Dashboard → Logs for errors
2. Check Netlify Functions → Logs for errors
3. Check browser console for errors
4. Verify ALL URLs match exactly (no trailing slashes)
5. Make sure you saved ALL changes in Stripe

---

## ✅ FINAL VERIFICATION:

Test payment → Should redirect to payment-success.html
- If YES: ✅ Setup complete!
- If NO: Check Stripe Checkout settings again

---

*This is a MANUAL configuration - the code can't do this for you!*
*Follow each step carefully and verify as you go.*
