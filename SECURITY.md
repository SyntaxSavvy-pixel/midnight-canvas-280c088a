# 🔒 Security Architecture - Tabmangment Extension

## ⚠️ CRITICAL: Understanding Browser Extension Security

### The Fundamental Reality

**YOU CANNOT HIDE CLIENT-SIDE CODE IN A BROWSER EXTENSION**

All JavaScript files in a browser extension are:
- ✅ Downloaded to every user's computer
- ✅ Accessible via Chrome DevTools (Sources tab)
- ✅ Viewable via `chrome://extensions` (Developer Mode)
- ✅ Stored in plain text in filesystem
- ✅ Extractable from .crx files (just ZIP archives)

**Minification/Obfuscation does NOT help:**
- ❌ Can be de-obfuscated easily
- ❌ Source maps can reverse it
- ❌ Professional tools bypass this in minutes
- ❌ Provides false sense of security

### The ONLY Secure Solution

**Move all sensitive operations to a backend server** ✅

---

## 🛡️ Our Security Architecture

### Secure: Backend Handles Secrets

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│             │      │                  │      │                 │
│  Extension  │─────▶│  Cloudflare      │─────▶│  External API   │
│  (Client)   │      │  Functions       │      │  (Perplexity)   │
│             │      │  (Backend)       │      │                 │
└─────────────┘      └──────────────────┘      └─────────────────┘
                              │
                              │
                     Environment Variables
                     - PERPLEXITY_API_KEY
                     - STRIPE_SECRET_KEY
                     - SUPABASE_SERVICE_ROLE_KEY
```

**Benefits:**
- ✅ API keys never exposed to client
- ✅ Rate limiting enforced server-side
- ✅ User verification server-side
- ✅ Abuse prevention
- ✅ Cost control

---

## 🔑 Environment Variables Configuration

### Required Cloudflare Environment Variables

Go to: **Cloudflare Dashboard → Pages → tabmangment → Settings → Environment Variables**

Add these variables:

```bash
# Perplexity AI (for search functionality)
PERPLEXITY_API_KEY=pplx-your-actual-key-here

# Supabase (for database and authentication)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_ANON_KEY=eyJxxx...

# Stripe (for payment processing)
STRIPE_SECRET_KEY=sk_live_xxx  (or sk_test_xxx for testing)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### How to Add Environment Variables

1. Open Cloudflare Dashboard
2. Navigate to **Pages** → **tabmangment**
3. Go to **Settings** → **Environment Variables**
4. Click **Add variable**
5. Enter **Variable name** and **Value**
6. Select **Production** environment
7. Click **Save**
8. **Redeploy** your site for changes to take effect

---

## 🔒 Secure Endpoints

### 1. Perplexity Search - `/api/perplexity-search`

**File:** `functions/api/perplexity-search.js`

**Security Features:**
- ✅ API key stored as environment variable
- ✅ User email verification
- ✅ Search limit enforcement
- ✅ Rate limiting per user
- ✅ Usage tracking

**Client Usage:**
```javascript
const response = await fetch('https://tabmangment.com/api/perplexity-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: 'search query',
        userEmail: 'user@example.com'
    })
});
```

### 2. Stripe Checkout - `/api/create-checkout-session`

**File:** `functions/api/create-checkout-session.js`

**Security Features:**
- ✅ Stripe secret key server-side only
- ✅ Customer ID verification
- ✅ Email validation
- ✅ Metadata tracking

### 3. Stripe Webhook - `/api/stripe-webhook`

**File:** `functions/api/stripe-webhook.js`

**Security Features:**
- ✅ Webhook signature verification
- ✅ Event authentication
- ✅ Database updates server-side
- ✅ No client involvement

---

## 🚫 What NOT to Do

### ❌ NEVER expose these in client code:

```javascript
// ❌ BAD - API keys in client code
const API_KEY = 'YOUR_API_KEY_HERE';

// ❌ BAD - Secret keys in client
const STRIPE_SECRET = 'sk_live_xxxxx';

// ❌ BAD - Service role keys in client
const SUPABASE_SERVICE_ROLE = 'eyJxxx...';

// ❌ BAD - Direct API calls with secrets
fetch('https://api.perplexity.ai/search', {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
});
```

### ✅ CORRECT - Use backend proxy:

```javascript
// ✅ GOOD - Call your secure backend
fetch('https://tabmangment.com/api/perplexity-search', {
    method: 'POST',
    body: JSON.stringify({ query, userEmail })
});

// Backend handles the API key securely
```

---

## 🔍 Security Audit Checklist

### Client-Side Code (Extension Files)

- ✅ No API keys in `popup.js`
- ✅ No API keys in `config.js`
- ✅ No secret keys anywhere
- ✅ Only public/anonymous keys (if any)
- ✅ All sensitive calls go through backend

### Backend Code (Cloudflare Functions)

- ✅ Secrets in environment variables
- ✅ User verification on all endpoints
- ✅ Rate limiting implemented
- ✅ Error handling doesn't leak info
- ✅ CORS properly configured

### Database (Supabase)

- ✅ Row Level Security (RLS) enabled
- ✅ Service role key only on backend
- ✅ Anonymous key safe for client
- ✅ Proper access policies

---

## 🚨 Security Incident Response

### If an API Key is Exposed:

1. **Immediate Action:**
   - Revoke the exposed key immediately
   - Generate new key
   - Update environment variable on Cloudflare
   - Redeploy the application

2. **Investigation:**
   - Check API usage logs for abuse
   - Verify if key was actually accessed
   - Assess potential cost impact

3. **Prevention:**
   - Review code for other exposures
   - Run security audit
   - Update documentation

### Reporting Security Issues

If you find a security vulnerability:
- 📧 Email: security@tabmangment.com
- 🔒 Do NOT open public GitHub issues
- 🔒 Do NOT share details publicly

---

## 📋 Deployment Checklist

Before deploying to production:

### Code Review
- [ ] No hardcoded API keys in client code
- [ ] All secrets moved to environment variables
- [ ] All sensitive calls use backend endpoints
- [ ] Error messages don't leak sensitive data
- [ ] CORS headers properly configured

### Environment Variables
- [ ] PERPLEXITY_API_KEY set on Cloudflare
- [ ] STRIPE_SECRET_KEY set on Cloudflare
- [ ] STRIPE_WEBHOOK_SECRET set on Cloudflare
- [ ] SUPABASE_SERVICE_ROLE_KEY set on Cloudflare
- [ ] All variables in Production environment

### Testing
- [ ] Test search functionality (should work via backend)
- [ ] Test payment flows (should use backend)
- [ ] Verify rate limiting works
- [ ] Check error handling
- [ ] Confirm no console errors about missing keys

### Final Checks
- [ ] Extension .zip contains no secrets
- [ ] Source code review completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team informed of changes

---

## 📚 Additional Resources

- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Cloudflare Pages Functions Security](https://developers.cloudflare.com/pages/functions/)
- [Stripe API Security](https://stripe.com/docs/security)

---

## 🎓 Key Takeaways

1. **Browser extensions are client-side** - code is always accessible
2. **Never put secrets in client code** - even minified/obfuscated
3. **Use backend for sensitive operations** - Cloudflare Functions
4. **Environment variables for secrets** - never commit to git
5. **Verify users server-side** - don't trust client
6. **Rate limit everything** - prevent abuse
7. **Audit regularly** - security is ongoing

---

**Last Updated:** 2025-01-12
**Security Version:** 1.0
**Next Audit:** 2025-02-12
