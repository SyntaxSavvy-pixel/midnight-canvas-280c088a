-- ============================================
-- VERIFY MIGRATION SUCCESS
-- Run this in Supabase SQL Editor to verify everything was created
-- ============================================

-- Check all tables exist
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'users_auth',
    'user_devices',
    'user_preferences',
    'custom_themes',
    'theme_drafts',
    'tab_analytics',
    'user_activity',
    'payment_events',
    'subscription_history'
)
ORDER BY table_name;

-- Check new columns were added to users_auth
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users_auth'
AND column_name IN (
    'stripe_customer_id',
    'stripe_subscription_id',
    'subscription_status',
    'is_pro',
    'current_period_end',
    'deletion_scheduled_at',
    'name_update_cooldown',
    'avatar',
    'created_at',
    'updated_at'
)
ORDER BY column_name;

-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'check_subscription_status',
    'record_tab_event',
    'update_updated_at_column'
)
ORDER BY routine_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'users_auth',
    'user_devices',
    'user_preferences',
    'custom_themes',
    'theme_drafts',
    'tab_analytics',
    'user_activity',
    'payment_events',
    'subscription_history'
)
ORDER BY tablename, policyname;
