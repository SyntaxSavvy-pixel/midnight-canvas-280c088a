# Password Reset Setup Guide

## 🚨 **Issue: Password Reset Emails Not Sending**

If users aren't receiving password reset emails, follow these steps to configure Supabase properly.

---

## ✅ **Step 1: Configure Supabase Email Settings**

### Go to Supabase Dashboard

1. Open [https://app.supabase.com](https://app.supabase.com)
2. Select your project: `voislxlhfepnllamagxm`
3. Go to **Authentication** → **Email Templates**

### Enable Password Recovery

1. Click on **"Reset Password"** template
2. Ensure the template is **enabled**
3. Default template should look like this:

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

4. Click **Save**

---

## ✅ **Step 2: Configure Email Provider**

Supabase needs an email provider to send emails. You have two options:

### **Option A: Use Supabase's Built-in SMTP (Recommended for Testing)**

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Supabase provides a default SMTP for testing (limited to 3 emails/hour)
4. For production, you MUST use your own SMTP

### **Option B: Use Custom SMTP (Recommended for Production)**

Popular options:
- **SendGrid** (99,000 emails/month free)
- **Mailgun** (5,000 emails/month free)
- **AWS SES** (62,000 emails/month free)
- **Resend** (3,000 emails/month free)

#### Example: Using SendGrid

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Verify your sender email
3. Generate API key
4. In Supabase Dashboard:
   - Go to **Project Settings** → **Auth** → **SMTP Settings**
   - Enable Custom SMTP
   - Fill in:
     ```
     Host: smtp.sendgrid.net
     Port: 587
     Username: apikey
     Password: [Your SendGrid API Key]
     Sender email: noreply@tabmangment.com
     Sender name: TabManagement
     ```
5. Click **Save**

---

## ✅ **Step 3: Configure Site URL**

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://tabmangment.com`
3. Add **Redirect URLs**:
   ```
   https://tabmangment.com/new-authentication
   https://tabmangment.com/new-authentication?type=recovery
   https://*.netlify.app/new-authentication
   ```
4. Click **Save**

---

## ✅ **Step 4: Test Password Reset**

### Test with Console Logs

1. Open your site: `https://tabmangment.com/new-authentication`
2. Open browser console (F12)
3. Click "Forgot Password"
4. Enter your email
5. Click "Send Reset Link"
6. Check console for:
   ```
   🔄 Attempting password reset for: you@email.com
   📧 Password reset response: { data: {...}, error: null }
   ✅ Password reset email sent successfully
   ```

### Check for Errors

If you see errors like:
- ❌ `Email rate limit exceeded` - Wait 1 hour or upgrade SMTP
- ❌ `Email not confirmed` - User needs to verify email first
- ❌ `Invalid email` - Email doesn't exist in database

---

## ✅ **Step 5: Verify Email Delivery**

### Check Spam Folder
Password reset emails often go to spam. Tell users to check:
- Spam/Junk folder
- Promotions tab (Gmail)
- Social tab (Gmail)

### Check Supabase Logs

1. Go to **Logs** → **Auth Logs** in Supabase Dashboard
2. Look for password reset requests
3. Check for delivery errors

---

## 🔧 **Common Issues & Solutions**

### Issue 1: "Email not sent"
**Solution:** Configure custom SMTP (Supabase default is limited)

### Issue 2: "Email goes to spam"
**Solution:**
- Set up SPF/DKIM records for your domain
- Use a verified sender email
- Use a custom domain email (not @gmail.com)

### Issue 3: "Invalid redirect URL"
**Solution:** Add all possible redirect URLs in Supabase Auth settings

### Issue 4: "User not found"
**Solution:** This is expected behavior - Supabase won't reveal if email exists (security feature)

### Issue 5: "Rate limit exceeded"
**Solution:**
- Wait 1 hour
- Upgrade to custom SMTP
- SendGrid gives 99k emails/month free

---

## 📧 **Recommended Email Setup for Production**

### 1. Get a Custom Domain Email
Instead of: `noreply@gmail.com`
Use: `noreply@tabmangment.com`

### 2. Set up SendGrid (Free Tier)

```bash
# 1. Create SendGrid account
# 2. Verify sender email: noreply@tabmangment.com
# 3. Generate API key
# 4. Add to Supabase SMTP settings
```

### 3. Configure DNS Records

Add these to your domain (tabmangment.com):

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:sendgrid.net ~all
```

**DKIM Records:**
SendGrid will provide these - add them to DNS

### 4. Test Email Deliverability

Use tools like:
- [mail-tester.com](https://www.mail-tester.com)
- [mxtoolbox.com](https://mxtoolbox.com)

---

## 🎯 **Quick Fix for Testing (5 minutes)**

If you just want to test immediately:

1. Go to Supabase Dashboard
2. **Authentication** → **Email Templates** → **Reset Password**
3. Make sure it's **enabled**
4. Use Supabase's default SMTP (3 emails/hour limit)
5. Test with your own email
6. Check spam folder
7. Wait 2-3 minutes for delivery

---

## 📝 **Current Implementation**

The password reset is already coded and working. The issue is Supabase email configuration.

**Code flow:**
1. User enters email → `handlePasswordReset()`
2. Calls `supabaseClient.auth.resetPasswordForEmail()`
3. Supabase generates secure token
4. Supabase sends email (if SMTP configured)
5. User clicks link → Redirects to `/new-authentication?type=recovery`
6. User enters new password
7. Password updated in database

**The code is correct - you just need to configure Supabase SMTP!**

---

## 🆘 **Still Not Working?**

Check browser console for exact error message and share it.

Common console messages:
- ✅ `Password reset email sent successfully` - Email sent (check spam)
- ❌ `Email rate limit exceeded` - Need custom SMTP
- ❌ `Failed to send reset email` - SMTP not configured

---

**Last Updated:** 2025-10-16
**Status:** Code implemented, awaiting Supabase SMTP configuration
