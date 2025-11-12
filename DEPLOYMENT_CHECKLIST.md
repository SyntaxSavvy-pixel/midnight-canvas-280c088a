# 🚀 Deployment & Security Checklist

## ✅ 1. Supabase Database Schema

### Required Fields in `users_auth` Table:
Run the SQL migration in `SUPABASE_MIGRATION.sql` to add:

- [x] `is_pro` (BOOLEAN) - Whether user has Pro access
- [x] `subscription_status` (TEXT) - free/active/lifetime/canceled/past_due
- [x] `current_period_start` (TIMESTAMPTZ) - Billing period start
- [x] `current_period_end` (TIMESTAMPTZ) - Billing period end (null for lifetime)
- [x] `plan_type` (TEXT) - pro_monthly/pro_yearly/pro_lifetime
- [x] `stripe_customer_id` (TEXT) - Stripe customer ID
- [x] `stripe_subscription_id` (TEXT) - Stripe subscription ID (null for lifetime)

**To Apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `SUPABASE_MIGRATION.sql`
3. Click "Run"
4. Verify with the verification query at the bottom

---

## ✅ 2. Cloudflare Environment Variables

### Required Environment Variables in Cloudflare Pages:
Go to: Cloudflare Dashboard → Pages → Your Project → Settings → Environment Variables

**Supabase:**
- [ ] `SUPABASE_URL` - Your Supabase project URL (https://xxx.supabase.co)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has admin access)
- [ ] `SUPABASE_ANON_KEY` - Anonymous key (public, safe for client)

**Stripe:**
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key (sk_live_xxx or sk_test_xxx)
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (whsec_xxx)

**How to Get These:**
- Supabase: Project Settings → API → Project URL & API Keys
- Stripe: Dashboard → Developers → API Keys & Webhooks

---

## ✅ 3. Stripe Configuration

### Webhook Setup:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://tabmangment.com/api/stripe-webhook`
3. Select events to listen for:
   - [x] `checkout.session.completed`
   - [x] `customer.subscription.created`
   - [x] `customer.subscription.updated`
   - [x] `customer.subscription.deleted`
   - [x] `invoice.payment_succeeded`
   - [x] `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET` env var

### Product & Price IDs Configured:
- [x] Pro Monthly: `price_1SSSuDLJKLfllJJDX7FiWkR4` ($1.87/month)
- [x] Pro Yearly: `price_1SSSvzLJKLfllJJDtwitkXHh` ($18.99/year)
- [x] Pro Lifetime: `price_1SSSwwLJKLfllJJDlgxqyram` ($39.99 one-time)

---

## ✅ 4. Authentication Flow Testing

### Google OAuth:
- [ ] Click "Sign in with Google" button
- [ ] Redirects to Google consent screen
- [ ] After approval, redirects back to dashboard
- [ ] User is logged in and sees their email
- [ ] Avatar shows Google profile picture
- [ ] Can log out and log back in

### GitHub OAuth:
- [ ] Click "Sign in with GitHub" button
- [ ] Redirects to GitHub authorization
- [ ] After approval, redirects back to dashboard
- [ ] User is logged in and sees their email
- [ ] Avatar shows GitHub profile picture
- [ ] Can log out and log back in

### Email/Password:
- [ ] Can sign up with email/password
- [ ] Receives verification email
- [ ] Can verify email
- [ ] Can log in with credentials
- [ ] Can reset password if forgotten

---

## ✅ 5. Subscription Checkout Testing

### Monthly Plan ($1.87/month):
- [ ] Click "Get Pro Monthly" button
- [ ] Redirects to Stripe Checkout
- [ ] Shows correct price ($1.87/month)
- [ ] Can complete test payment (use test card: 4242 4242 4242 4242)
- [ ] After payment, redirects to dashboard with success message
- [ ] Dashboard shows "Pro Plan Active"
- [ ] Check database: `is_pro=true`, `plan_type=pro_monthly`
- [ ] Check database: `current_period_end` is ~30 days from now

### Yearly Plan ($18.99/year):
- [ ] Click "Get Pro Yearly" button
- [ ] Redirects to Stripe Checkout
- [ ] Shows correct price ($18.99/year)
- [ ] Can complete test payment
- [ ] After payment, redirects to dashboard
- [ ] Dashboard shows "Pro Plan Active"
- [ ] Check database: `is_pro=true`, `plan_type=pro_yearly`
- [ ] Check database: `current_period_end` is ~365 days from now

### Lifetime Plan ($39.99 one-time):
- [ ] Click "Get Lifetime Access" button
- [ ] Redirects to Stripe Checkout
- [ ] Shows correct price ($39.99 one-time)
- [ ] Can complete test payment
- [ ] After payment, redirects to dashboard
- [ ] Dashboard shows "Pro Plan Active"
- [ ] Check database: `is_pro=true`, `plan_type=pro_lifetime`
- [ ] Check database: `subscription_status=lifetime`
- [ ] Check database: `current_period_end=null`

---

## ✅ 6. Webhook Event Handling

### Test Webhooks in Stripe Dashboard:
1. Go to Stripe Dashboard → Developers → Webhooks → Your Endpoint
2. Click "Send test webhook"

**Test Events:**
- [ ] `checkout.session.completed` (subscription) → User gets Pro access
- [ ] `checkout.session.completed` (payment) → User gets lifetime access
- [ ] `invoice.payment_succeeded` → Billing period updates
- [ ] `invoice.payment_failed` → User loses Pro access (`is_pro=false`)
- [ ] `customer.subscription.updated` → Billing dates update
- [ ] `customer.subscription.deleted` → User loses Pro access

**Verify in Cloudflare Logs:**
- [ ] Webhook receives events successfully
- [ ] No errors in function logs
- [ ] Database updates correctly after each event

---

## ✅ 7. Device Management & Security

### Device Authorization:
- [ ] User can authorize new device
- [ ] Shows device name in dashboard
- [ ] Can remove device
- [ ] Removed device can't access Pro features
- [ ] Max device limit enforced (Pro: 3 devices)

### Data Security:
- [ ] Can't access other users' data by changing email in URL
- [ ] Authentication token required for all API calls
- [ ] Invalid tokens return 401 Unauthorized
- [ ] Can't bypass Pro check by manipulating client-side code
- [ ] Extension verifies Pro status from server, not local storage

### SQL Injection Protection:
- [ ] Email parameter is URL encoded in queries
- [ ] Uses parameterized queries via Supabase REST API
- [ ] No direct SQL string concatenation

---

## ✅ 8. Dashboard Pages Testing

### Navigation:
- [ ] All sidebar links work
- [ ] Page transitions smooth
- [ ] Active page highlighted in sidebar

### Overview Page:
- [ ] Shows correct tab count
- [ ] Analytics load correctly
- [ ] Charts display data
- [ ] Stats update in real-time

### Subscription Page:
- [ ] Toggle switches between plans
- [ ] Shows correct pricing for each plan
- [ ] Free users see upgrade buttons
- [ ] Pro users see "Manage Subscription" button
- [ ] Manage button opens Stripe billing portal

### Themes Page:
- [ ] Can select preset themes
- [ ] Custom theme editor works
- [ ] Live preview updates in real-time
- [ ] Can save custom theme
- [ ] Theme syncs to extension

### Profile Page:
- [ ] Can update display name
- [ ] Avatar displays correctly
- [ ] Shows provider badge (Google/GitHub/Email)
- [ ] OAuth users can't change password (section hidden)
- [ ] Email users can change password

### Analytics Page:
- [ ] Shows usage statistics
- [ ] Graphs render correctly
- [ ] Data accurate and updates

---

## ✅ 9. Extension Integration

### Extension ↔ Dashboard Sync:
- [ ] Changes in dashboard reflect in extension
- [ ] Changes in extension reflect in dashboard
- [ ] Real-time sync works
- [ ] Bridge connection established

### Pro Features Gating:
- [ ] Free users limited to 5 AI searches/day
- [ ] Pro users have unlimited searches
- [ ] Auto-close timer requires Pro
- [ ] Custom themes require Pro
- [ ] Upgrade prompts shown to Free users

---

## ✅ 10. Links & Buttons

### Landing Page:
- [ ] "Get Started Free" → Authentication page
- [ ] "Get Pro Monthly" → Authentication page with plan param
- [ ] "Get Pro Yearly" → Authentication page with plan param
- [ ] "Get Lifetime Access" → Authentication page with plan param
- [ ] Toggle switches between plans correctly

### Dashboard:
- [ ] All upgrade buttons work
- [ ] Stripe checkout opens in new window
- [ ] Billing portal button works
- [ ] Support link works
- [ ] Privacy policy link works

---

## ✅ 11. Error Handling

### Payment Failures:
- [ ] Failed payment shows error message
- [ ] User remains on Free plan
- [ ] Can retry payment
- [ ] Error logged in Cloudflare

### Network Errors:
- [ ] Dashboard shows offline message if API down
- [ ] Extension gracefully handles connection loss
- [ ] Retry mechanism works

### Invalid States:
- [ ] Expired subscription revokes Pro access
- [ ] Canceled subscription revokes access immediately
- [ ] Past due subscription revokes access immediately

---

## 🔒 Security Verification

### Authentication:
- [x] All API endpoints require valid auth token
- [x] Tokens expire and refresh properly
- [x] Can't access API without login

### Authorization:
- [x] Users can only access their own data
- [x] Admin-only endpoints protected
- [x] Service role key only on server-side

### Data Protection:
- [x] Passwords hashed (handled by Supabase Auth)
- [x] OAuth tokens not exposed to client
- [x] Stripe keys server-side only
- [x] HTTPS everywhere

---

## 📊 Monitoring

### Cloudflare Analytics:
- [ ] Check function invocation counts
- [ ] Monitor error rates
- [ ] Review response times

### Stripe Dashboard:
- [ ] Monitor successful payments
- [ ] Check failed payment reasons
- [ ] Review webhook delivery success rate

### Supabase Logs:
- [ ] Monitor database queries
- [ ] Check for errors
- [ ] Review auth activity

---

## 🎯 Final Checks Before Going Live

1. [ ] Database migration applied successfully
2. [ ] All environment variables set in Cloudflare
3. [ ] Stripe webhook configured and receiving events
4. [ ] Test checkout completed successfully (all 3 plans)
5. [ ] Webhook events updating database correctly
6. [ ] Authentication working (all 3 methods)
7. [ ] Device management secure
8. [ ] All pages accessible and functional
9. [ ] No console errors in browser
10. [ ] Mobile responsive design works
11. [ ] All links functional
12. [ ] Security audit passed
13. [ ] Switch from Stripe Test Mode to Live Mode
14. [ ] Update Stripe price IDs to live versions (if different)
15. [ ] Test one real payment in production

---

## 🚨 If Something Breaks

### Webhook Not Working:
1. Check Cloudflare function logs
2. Verify webhook URL in Stripe
3. Check signing secret matches
4. Test webhook manually in Stripe dashboard

### Users Not Getting Pro Access:
1. Check Supabase database - is `is_pro` updating?
2. Check Cloudflare logs - is webhook firing?
3. Verify Stripe event in Stripe Dashboard
4. Check user's email matches in both systems

### Checkout Not Working:
1. Check browser console for errors
2. Verify Stripe keys in environment variables
3. Check if mode parameter is being sent correctly
4. Test with different browser/incognito mode

### Device Sync Issues:
1. Check extension bridge connection
2. Verify API endpoints responding
3. Check auth token validity
4. Clear extension storage and re-auth

---

## 📝 Notes

- All timestamps stored in UTC
- Use Stripe test mode during development
- Monitor Cloudflare function usage for costs
- Set up alerts for failed webhooks
- Regular database backups via Supabase
