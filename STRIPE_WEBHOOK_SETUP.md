# 🔧 Stripe Webhook & Extension Sync Setup

## ⚡ Quick Start: Stripe Webhook

### 1. Create Webhook in Stripe Dashboard

**URL**: `https://tabmangment.netlify.app/api/stripe-webhook`

**Events to select**:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 2. Add Webhook Secret to Netlify

Go to: https://app.netlify.com/sites/tabmangment/settings/deploys#environment

Add variable:
- **Key**: `STRIPE_WEBHOOK_SECRET`
- **Value**: `whsec_...` (from Stripe webhook page)

### 3. Test It

In Stripe Dashboard → Webhooks → Your webhook → "Send test webhook"

---

## 🔄 Extension-Website Sync

### How It Works:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Website   │────────▶│  Extension   │◀────────│  API Server │
│  (Login)    │ Message │ (Background) │  Polls  │ (/api/me)   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      ▼                        ▼                         ▼
localStorage           chrome.storage              Supabase DB
```

### Sync Points:

1. **Login**: Website → Extension
   - [New-authentication.html:736] sends `USER_LOGGED_IN`
   - Extension saves to `chrome.storage.local`

2. **Logout**: Website → Extension
   - [user-dashboard.html:1596] sends `USER_LOGGED_OUT`
   - Extension clears storage

3. **Pro Status Check**: Extension → API
   - Files: [extension-simple-auth.js], [extension-auth-sync.js]
   - Polls `/api/me?email=...` every 5 minutes
   - Updates Pro features based on response

### Files Already Updated:
✅ All API URLs point to `tabmangment.netlify.app`
✅ Extension config uses correct domain
✅ Webhook handler ready

---

## 🧪 Testing Steps

### Test 1: Login Sync
1. Open extension (chrome://extensions/ → Load unpacked)
2. Go to https://tabmangment.netlify.app/login
3. Sign in
4. Open extension popup → Should show your email

### Test 2: Pro Upgrade
1. Go to dashboard → Click "Upgrade to Pro"
2. Use test card: `4242 4242 4242 4242`
3. Complete checkout
4. Webhook fires → Database updates to `is_pro: true`
5. Extension polls API → Gets Pro status
6. Pro features unlock

### Test 3: Logout Sync
1. Click "Logout" in dashboard
2. Extension storage cleared
3. Extension shows logged out state

---

## 📋 Environment Variables Needed

In Netlify (https://app.netlify.com/sites/tabmangment/settings/deploys#environment):

| Variable | Status | Notes |
|----------|--------|-------|
| `SUPABASE_URL` | ✅ Set | Database URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | Database key |
| `STRIPE_SECRET_KEY` | ✅ Set | Stripe API key |
| `STRIPE_PUBLISHABLE_KEY` | ✅ Set | For checkout |
| `STRIPE_PRICE_ID` | ✅ Set | Pro plan price |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ **ADD THIS** | From webhook page |

---

## 🐛 Troubleshooting

### Webhook Returns 400
- Check webhook secret matches in Netlify env vars
- Verify endpoint URL is exactly: `/api/stripe-webhook`

### Extension Not Syncing
- Open DevTools → Console (look for errors)
- Check: `chrome.storage.local.get(console.log)`
- Verify extension has `tabmangment.netlify.app` permissions in manifest

### Pro Features Not Unlocking
1. Check database: `SELECT email, is_pro FROM users WHERE email='your@email.com'`
2. Check extension storage: `chrome.storage.local.get(['userEmail', 'isPro'], console.log)`
3. Manually trigger sync: Close and reopen extension

---

## 📚 Related Files

- Webhook: [netlify/functions/stripe-webhook.js](netlify/functions/stripe-webhook.js)
- User API: [netlify/functions/me.js](netlify/functions/me.js)
- Extension Auth: [extension-simple-auth.js](extension-simple-auth.js)
- Extension Sync: [extension-auth-sync.js](extension-auth-sync.js)
- Auth Page: [New-authentication.html](New-authentication.html)
- Dashboard: [user-dashboard.html](user-dashboard.html)

---

## ✅ Setup Complete!

Once webhook secret is added:
1. Extension syncs automatically on login
2. Pro upgrades processed via webhook
3. Extension polls for status updates
4. All data stays in sync between website and extension