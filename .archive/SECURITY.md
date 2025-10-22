# TabManagement Security Documentation

## 🔒 Security Architecture

### Overview
TabManagement implements enterprise-grade security across all layers:
- **Frontend**: XSS protection, input sanitization, secure session management
- **Backend**: Netlify Functions with authentication, rate limiting
- **Database**: Supabase with Row Level Security (RLS)
- **Payments**: Stripe with webhook verification
- **Extension**: Content Security Policy, isolated execution contexts

---

## 🛡️ Security Layers

### 1. Authentication & Authorization

**Supabase Authentication:**
- JWT tokens with automatic expiration
- Secure token storage with validation
- Email/password + OAuth (Google, GitHub)
- Session timeout: 24 hours

**Token Security:**
- Tokens are validated on every request
- Invalid/expired tokens trigger auto-logout
- No sensitive data in tokens (only user ID, email)

**What's Safe to Expose:**
- ✅ Supabase URL (public)
- ✅ Supabase Anon Key (public, RLS-protected)
- ✅ Stripe Publishable Key (public)
- ✅ Logo.dev API Key (public)

**What Must Stay Secret:**
- ❌ Supabase Service Role Key (backend only)
- ❌ Stripe Secret Key (backend only)
- ❌ Stripe Webhook Secret (backend only)

### 2. Frontend Security

**XSS Protection:**
```javascript
// All user input is sanitized before display
sessionSecurity.sanitizeInput(userInput)
```

**Input Validation:**
- Email format validation
- Password strength requirements (6+ chars)
- Token format validation (JWT structure)

**Console Protection:**
- Warning messages for users
- Disabled dangerous console methods
- Stack trace monitoring for suspicious activity

**LocalStorage Protection:**
- Session data encrypted with timestamps
- Automatic expiry after 24 hours
- Monitored for unauthorized access

### 3. Backend Security (Netlify Functions)

**Environment Variables:**
All sensitive keys stored in Netlify environment:
```bash
SUPABASE_URL                  # Database URL
SUPABASE_SERVICE_ROLE_KEY     # Admin access (never exposed)
STRIPE_SECRET_KEY             # Payment processing
STRIPE_WEBHOOK_SECRET         # Webhook verification
```

**Request Validation:**
- CORS properly configured
- Method validation (GET/POST only)
- Authentication required for sensitive endpoints
- Input sanitization on all inputs

**Rate Limiting:**
Implemented at Netlify edge level to prevent:
- Brute force attacks
- DDoS attacks
- API abuse

### 4. Payment Security

**Stripe Integration:**
- Never handle raw card data (Stripe.js handles it)
- Webhook signature verification on all events
- Customer IDs stored securely in Supabase
- Subscription status verified server-side

**Payment Flow:**
1. User clicks "Upgrade"
2. Backend creates Stripe Checkout session
3. User redirected to Stripe (secure, PCI-compliant)
4. Stripe processes payment
5. Webhook notifies our backend
6. Backend updates Supabase (verified)
7. User sees Pro features

**Never Stored:**
- Credit card numbers
- CVV codes
- Expiration dates

### 5. Chrome Extension Security

**Manifest V3 Security:**
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  },
  "permissions": [
    "tabs",           // Required for tab management
    "storage",        // Required for settings
    "activeTab"       // Required for current tab access
  ]
}
```

**Isolated Execution:**
- Content scripts run in isolated world
- No access to page JavaScript variables
- Messages validated before processing

**Host Permissions:**
Limited to specific domains:
- tabmangment.com
- *.netlify.app (for deployment)
- stripe.com (for payments)

### 6. Database Security (Supabase)

**Row Level Security (RLS):**
```sql
-- Users can only read/update their own data
CREATE POLICY "Users can only access own data"
ON users FOR ALL
USING (auth.uid() = id);
```

**Protected Data:**
- User emails (indexed, encrypted at rest)
- Stripe customer IDs
- Subscription status
- Payment history

**Public Data:**
- None (all data requires authentication)

---

## 🚨 Security Best Practices

### For Developers

**Never Commit:**
- ❌ Real API keys (use .env with placeholders)
- ❌ Stripe secret keys
- ❌ Database credentials
- ❌ User passwords or tokens

**Always:**
- ✅ Use environment variables
- ✅ Validate all user inputs
- ✅ Sanitize data before display
- ✅ Verify authentication on sensitive operations
- ✅ Test with security tools (OWASP ZAP, etc.)

### For Users

**Protect Your Account:**
- Use strong, unique passwords
- Enable 2FA on Google/GitHub for OAuth
- Never share authentication links
- Log out on public computers

**Spot Scams:**
- We will NEVER ask for your password in email
- We will NEVER ask you to run code in console
- We will NEVER ask for payment outside Stripe
- Verify URL is always tabmangment.com

---

## 🔍 Security Monitoring

**What We Monitor:**
- Failed login attempts
- Unusual payment activity
- API rate limit violations
- Webhook signature failures

**Automatic Responses:**
- Account lockout after 5 failed logins
- Payment verification delays for suspicious activity
- IP blocking for DDoS attempts
- Webhook rejection for invalid signatures

---

## 🐛 Reporting Security Issues

**Found a vulnerability?**

1. **DO NOT** create a public GitHub issue
2. **DO** email: security@tabmangment.com (if available)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (optional)

**We will:**
- Respond within 48 hours
- Fix critical issues within 7 days
- Credit you in our security acknowledgments (if desired)

---

## 📋 Security Checklist

**Before Each Release:**
- [ ] No hardcoded secrets in code
- [ ] All API keys in environment variables
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] CSP headers configured
- [ ] Authentication tested
- [ ] Payment flow verified
- [ ] Extension permissions minimal
- [ ] Error messages don't leak sensitive info
- [ ] Security audit completed

---

## 🔐 Compliance

**Standards:**
- GDPR compliant (EU data protection)
- PCI-DSS Level 1 (via Stripe)
- OWASP Top 10 protected
- Chrome Web Store security requirements

**Data Storage:**
- US-based servers (Netlify + Supabase)
- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.3)
- Regular backups (Supabase automated)

---

## 📚 Additional Resources

- [Supabase Security Docs](https://supabase.com/docs/guides/auth/managing-user-data)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated:** 2025-10-16
**Version:** 5.5.0
**Security Contact:** TBD
