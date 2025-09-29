# 🗄️ Supabase Integration Setup Guide

## Overview
Your Tab Management extension now uses Supabase for user authentication and subscription management, with real-time sync between Stripe payments and the extension.

## 🚀 Quick Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your Project URL and API keys

### 2. Create User Table
Run this SQL in your Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_pro BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_payment_at TIMESTAMPTZ,
  last_failed_payment_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_pro ON users(is_pro);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- Add updated_at trigger
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

### 3. Configure Environment Variables
Update your Vercel environment variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Stripe Configuration (existing)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 🔄 How It Works

### Authentication Flow
1. **User Login**: Users sign in via `/auth` or `/login`
2. **Account Creation**: New users are saved to Supabase `users` table
3. **Session Management**: JWT tokens track authenticated sessions

### Payment Flow
1. **Purchase**: User clicks "Upgrade to Pro" in extension
2. **Stripe Checkout**: Redirects to Stripe with user email
3. **Webhook**: Stripe notifies our webhook on payment success
4. **Database Update**: Supabase user record updated with Pro status
5. **Extension Sync**: Extension checks API every 5 minutes for updates

### Real-Time Updates
- Extension checks subscription status every 5 minutes
- Immediately reflects changes when user upgrades/downgrades
- Handles subscription expiration automatically
- Shows subscription info (days remaining, status, etc.)

## 🛠️ API Endpoints Updated

### `/api/me`
- **GET**: Check user subscription status
- **POST**: Handle login/registration
- Now returns full subscription details

### `/api/stripe-webhook`
- Processes Stripe events (payment success, subscription changes)
- Updates Supabase database in real-time
- Handles all subscription lifecycle events

### `/api/create-checkout-session`
- Creates Stripe checkout for authenticated users
- Embeds user data in Stripe metadata for webhook processing

## 🎯 Extension Features

### Auto-Sync
- Subscription status updates automatically
- No manual refresh needed
- Real-time Pro feature activation

### Subscription Info
- Shows current plan status
- Displays days remaining
- Subscription renewal date
- Customer portal access

### Error Handling
- Graceful fallback for network issues
- Clear error messages for users
- Automatic retry for failed status checks

## 🔒 Security

### Database Security
- Row Level Security (RLS) enabled
- Service key for server-side operations only
- Anon key for client-side (if needed)

### API Protection
- JWT token validation
- User email verification
- Secure webhook endpoints

## 📊 Database Schema

```
users
├── id (UUID, Primary Key)
├── user_id (TEXT, Unique)
├── email (TEXT, Unique)
├── is_pro (BOOLEAN)
├── subscription_status (TEXT)
├── stripe_customer_id (TEXT)
├── stripe_subscription_id (TEXT)
├── current_period_end (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── last_payment_at (TIMESTAMPTZ)
└── last_failed_payment_at (TIMESTAMPTZ)
```

## 🧪 Testing

1. **Login Flow**: Test user registration and login
2. **Payment Flow**: Complete a test Stripe purchase
3. **Extension Sync**: Verify extension updates after payment
4. **Webhook Processing**: Check Supabase logs for webhook events
5. **Subscription Updates**: Test plan changes and cancellations

## 🎉 Complete!

Your extension now has:
- ✅ Supabase authentication
- ✅ Real-time payment sync
- ✅ Auto-updating subscription status
- ✅ Secure user data management
- ✅ Full Stripe integration

Users can now log in once and their subscription status will automatically sync across all devices!