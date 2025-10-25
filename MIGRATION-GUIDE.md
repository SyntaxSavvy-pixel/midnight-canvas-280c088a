# localStorage to Supabase Migration Guide

This document outlines the migration from localStorage to Supabase for better data persistence, analytics, and subscription management.

## Overview

We're migrating all localStorage usage to Supabase to enable:
- Better data persistence across devices
- Real-time analytics and tab tracking
- Automatic subscription management (auto-suspend on payment failure)
- Device tracking for security
- Centralized user data management

## Step-by-Step Migration

### 1. Database Setup (REQUIRED FIRST)

Run the SQL migration script in your Supabase dashboard:

```bash
# File: supabase-migration.sql
```

This creates 9 tables:
- `users` - Enhanced user data with subscription info
- `user_devices` - Track devices per user
- `user_preferences` - Settings, themes, UI state
- `custom_themes` - User-created themes
- `theme_drafts` - Auto-saved theme work
- `tab_analytics` - Daily tab usage stats
- `user_activity` - Detailed activity log
- `payment_events` - Stripe webhook events
- `subscription_history` - Subscription change log

### 2. Functions Added

New Supabase storage functions added to [user-dashboard.html](user-dashboard.html:2695-3075):

**User Preferences:**
- `getUserPreferences()` - Get all user preferences
- `updateUserPreferences(updates)` - Update preferences
- `saveSidebarState(collapsed)` - Save sidebar state
- `saveUserSettings(settings)` - Save user settings
- `saveActiveTheme(themeName, themeConfig)` - Save active theme
- `saveExtensionId(extensionId)` - Save extension ID

**Device Tracking:**
- `registerDevice(deviceId, fingerprint, browserInfo)` - Register new device
- `updateDeviceLastSeen(deviceId)` - Update last seen timestamp
- `getUserDevices()` - Get all user devices

**Custom Themes:**
- `saveCustomTheme(name, themeData)` - Save custom theme
- `getCustomThemes()` - Get all custom themes
- `deleteCustomTheme(themeId)` - Delete a theme

**Theme Drafts:**
- `saveThemeDraft(draftData)` - Auto-save theme draft
- `getThemeDraft()` - Load theme draft

**Tab Analytics:**
- `recordTabEvent(deviceId, eventType, count)` - Record tab open/close/clean
- `getTabAnalytics(startDate, endDate)` - Get analytics data

**Activity Logging:**
- `logActivity(activityType, metadata)` - Log user actions

**Subscription Management:**
- `checkSubscriptionStatus()` - Check if subscription expired/suspended
- `autoSuspendSubscription(userId)` - Auto-suspend on payment failure
- `getSubscriptionHistory()` - Get subscription history

**User Data:**
- `updateUserData(updates)` - Update user record
- `updateNameWithCooldown(newName)` - Update name with 24h cooldown

### 3. Functions Already Updated

✅ **Sidebar Toggle** ([user-dashboard.html:3081-3105](user-dashboard.html:3081-3105))
- `toggleSidebar()` - Now uses `saveSidebarState()`
- `restoreSidebarState()` - Now uses `getUserPreferences()`

✅ **Device Tracking** ([user-dashboard.html:3179-3226](user-dashboard.html:3179-3226))
- `getDeviceId()` - Now uses Supabase instead of localStorage
- Registers device in database on first use
- Updates last_seen timestamp automatically

✅ **Theme Loading** ([user-dashboard.html:7615-7686](user-dashboard.html:7615-7686))
- `loadCustomThemeDraft()` - Now uses `getThemeDraft()`
- `loadActiveTheme()` - Now uses `getUserPreferences()`

### 4. Remaining localStorage Calls to Update

Search and replace these remaining localStorage calls:

#### Authentication Token (lines 3916, 3924, 3980, 3997, etc.)
```javascript
// OLD:
localStorage.getItem('tabmangment_token')
localStorage.setItem('tabmangment_token', token)
localStorage.removeItem('tabmangment_token')

// NEW: Keep these - auth tokens can stay in localStorage for security
// (Supabase handles auth separately)
```

#### User Data (lines 4206, 4893, 4907, etc.)
```javascript
// OLD:
localStorage.getItem('tabmangment_user')
localStorage.setItem('tabmangment_user', JSON.stringify(userData))

// NEW: Use Supabase users table instead
await updateUserData(updates)
```

#### Settings (lines 5283, 5289, etc.)
```javascript
// OLD:
localStorage.setItem('tabManagementSettings', JSON.stringify(settings))
localStorage.getItem('tabManagementSettings')

// NEW:
await saveUserSettings(settings)
const prefs = await getUserPreferences();
const settings = prefs?.settings || {};
```

#### Theme Storage (lines 7717, 7718, 7161, 7162, etc.)
```javascript
// OLD:
localStorage.setItem('activeTheme', themeName)
localStorage.setItem('themeConfig', JSON.stringify(theme))
localStorage.getItem('customThemes')
localStorage.setItem('customThemes', JSON.stringify(themes))

// NEW:
await saveActiveTheme(themeName, theme)
const themes = await getCustomThemes()
await saveCustomTheme(name, themeData)
```

#### Theme Drafts (lines 8008, etc.)
```javascript
// OLD:
localStorage.setItem('customThemeDraft', JSON.stringify(draft))

// NEW:
await saveThemeDraft(draftData)
```

#### Extension ID (line 7690, etc.)
```javascript
// OLD:
localStorage.getItem('detectedExtensionId')

// NEW:
const prefs = await getUserPreferences();
const extensionId = prefs?.extension_id
```

#### Stats & Analytics (lines 6489, 6490, 6537, etc.)
```javascript
// OLD:
localStorage.setItem('extensionStats', JSON.stringify(stats))
localStorage.getItem('lastStatsUpdate')

// NEW: Will be replaced with tab_analytics table
// Use recordTabEvent() and getTabAnalytics()
```

#### Name Update Cooldown (lines 5015, 5033, 5474, etc.)
```javascript
// OLD:
localStorage.setItem('nameUpdateCooldown', timestamp)
localStorage.getItem('nameUpdateCooldown')
localStorage.removeItem('nameUpdateCooldown')

// NEW:
await updateNameWithCooldown(newName)
// Cooldown is now in users.name_update_cooldown column
```

### 5. Add Subscription Checking on Page Load

Add this to the initialization code (around line 3900):

```javascript
// Check subscription status on page load
async function initializeSubscriptionCheck() {
    const subStatus = await checkSubscriptionStatus();
    if (subStatus) {
        userData.isPro = subStatus.is_pro;
        userData.subscriptionStatus = subStatus.subscription_status;

        // Update UI if subscription was auto-suspended
        if (subStatus.subscription_status === 'suspended') {
            showNotification('Your subscription has been suspended due to payment failure. Please update your payment method.', 'warning');
        }
    }
}

// Call on page load
window.addEventListener('DOMContentLoaded', async () => {
    await initializeSubscriptionCheck();
    await restoreSidebarState();
    // ... other initialization
});
```

### 6. Add Stripe Webhook Handler

Create a Supabase Edge Function for Stripe webhooks:

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Handle payment_intent.succeeded
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    // Update subscription status
  }

  // Handle customer.subscription.updated
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    // Update user subscription status
  }

  // Handle invoice.payment_failed
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    // Mark subscription as past_due
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### 7. Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Test sidebar collapse/expand (should persist)
- [ ] Test device registration
- [ ] Test theme selection (should persist)
- [ ] Test custom theme creation and saving
- [ ] Test theme draft auto-save
- [ ] Test subscription status check
- [ ] Test auto-suspension logic
- [ ] Test analytics tracking
- [ ] Verify all localStorage calls removed
- [ ] Test on multiple devices
- [ ] Verify RLS policies work correctly

### 8. Deployment Steps

1. **Run SQL migration** in Supabase dashboard
2. **Update environment variables** (if using Stripe webhooks)
3. **Deploy updated user-dashboard.html**
4. **Deploy Stripe webhook Edge Function** (optional, for auto-suspension)
5. **Set up Supabase cron job** to run `check_subscription_status()` hourly
6. **Monitor for errors** in first 24 hours
7. **Verify data is being saved** to Supabase tables

### 9. Rollback Plan

If issues occur:

1. Comment out Supabase storage functions
2. Restore localStorage calls from git history
3. Investigate and fix issues
4. Re-deploy when ready

### 10. Benefits After Migration

✅ Data persists across devices
✅ Better analytics and insights
✅ Automatic subscription management
✅ Device tracking for security
✅ Centralized user data
✅ Better performance (less local storage overhead)
✅ Real-time sync capabilities
✅ Audit trail of all actions
✅ Subscription history tracking
✅ Payment event logging

## Next Steps

1. Review this guide
2. Run the SQL migration
3. Test locally
4. Deploy to production
5. Monitor analytics and subscription management
