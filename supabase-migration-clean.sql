-- ============================================
-- TABMANAGEMENT EXTENSION - SUPABASE SCHEMA
-- Migration from localStorage to Supabase
-- CLEAN VERSION - Drops all old objects first
-- ============================================

-- ============================================
-- STEP 1: DROP OLD FUNCTIONS
-- ============================================

-- Drop all possible variations of functions
DROP FUNCTION IF EXISTS check_subscription_status();
DROP FUNCTION IF EXISTS record_tab_event(UUID, UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS record_tab_event(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS record_tab_event(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS record_tab_event(UUID, TEXT);
DROP FUNCTION IF EXISTS record_tab_event(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS record_tab_event(TEXT, TEXT);
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- STEP 2: CREATE/UPDATE USERS TABLE
-- ============================================

-- Check if users table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            avatar TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Add new columns to existing users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name_update_cooldown TIMESTAMPTZ;

-- Add unique constraint on stripe_customer_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_stripe_customer_id_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);
    END IF;
END $$;

-- ============================================
-- STEP 3: CREATE NEW TABLES
-- ============================================

-- 2. USER DEVICES - Track user devices for analytics
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL UNIQUE,
    device_fingerprint TEXT,
    browser_info JSONB DEFAULT '{}',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER PREFERENCES - Settings, themes, UI state
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}',
    active_theme TEXT DEFAULT 'lightMinimal',
    theme_config JSONB DEFAULT '{}',
    extension_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOM THEMES - User-created themes
CREATE TABLE IF NOT EXISTS public.custom_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    theme_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. THEME DRAFTS - Auto-saved work in progress
CREATE TABLE IF NOT EXISTS public.theme_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    draft_data JSONB NOT NULL,
    last_saved TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TAB ANALYTICS - Daily tab usage statistics
CREATE TABLE IF NOT EXISTS public.tab_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.user_devices(id) ON DELETE SET NULL,
    tabs_opened INTEGER DEFAULT 0,
    tabs_closed INTEGER DEFAULT 0,
    tabs_cleaned INTEGER DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hourly_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id, date)
);

-- 7. USER ACTIVITY LOG - Detailed activity tracking
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.user_devices(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYMENT EVENTS - Stripe webhook events
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SUBSCRIPTION HISTORY - Track plan changes
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    from_plan TEXT NOT NULL,
    to_plan TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON public.user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_tab_analytics_user_id ON public.tab_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_tab_analytics_date ON public.tab_analytics(date);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON public.payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_processed ON public.payment_events(processed);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);

-- ============================================
-- STEP 5: ENABLE RLS
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: DROP OLD POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can insert own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can update own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view own themes" ON public.custom_themes;
DROP POLICY IF EXISTS "Users can insert own themes" ON public.custom_themes;
DROP POLICY IF EXISTS "Users can update own themes" ON public.custom_themes;
DROP POLICY IF EXISTS "Users can delete own themes" ON public.custom_themes;
DROP POLICY IF EXISTS "Users can view own drafts" ON public.theme_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON public.theme_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.theme_drafts;
DROP POLICY IF EXISTS "Users can view own analytics" ON public.tab_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON public.tab_analytics;
DROP POLICY IF EXISTS "Users can update own analytics" ON public.tab_analytics;
DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can insert own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can view own payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;

-- ============================================
-- STEP 7: CREATE POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- User devices policies
CREATE POLICY "Users can view own devices" ON public.user_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.user_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.user_devices
    FOR UPDATE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Custom themes policies
CREATE POLICY "Users can view own themes" ON public.custom_themes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own themes" ON public.custom_themes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own themes" ON public.custom_themes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own themes" ON public.custom_themes
    FOR DELETE USING (auth.uid() = user_id);

-- Theme drafts policies
CREATE POLICY "Users can view own drafts" ON public.theme_drafts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts" ON public.theme_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON public.theme_drafts
    FOR UPDATE USING (auth.uid() = user_id);

-- Tab analytics policies
CREATE POLICY "Users can view own analytics" ON public.tab_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON public.tab_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON public.tab_analytics
    FOR UPDATE USING (auth.uid() = user_id);

-- User activity policies
CREATE POLICY "Users can view own activity" ON public.user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON public.user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment events policies
CREATE POLICY "Users can view own payment events" ON public.payment_events
    FOR SELECT USING (auth.uid() = user_id);

-- Subscription history policies
CREATE POLICY "Users can view own subscription history" ON public.subscription_history
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: CREATE FUNCTIONS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 9: DROP OLD TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_user_devices_updated_at ON public.user_devices;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
DROP TRIGGER IF EXISTS update_custom_themes_updated_at ON public.custom_themes;
DROP TRIGGER IF EXISTS update_tab_analytics_updated_at ON public.tab_analytics;

-- ============================================
-- STEP 10: CREATE TRIGGERS
-- ============================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON public.user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_themes_updated_at BEFORE UPDATE ON public.custom_themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tab_analytics_updated_at BEFORE UPDATE ON public.tab_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 11: CREATE BUSINESS LOGIC FUNCTIONS
-- ============================================

-- Function to check and auto-suspend expired subscriptions
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS void AS $$
BEGIN
    -- Auto-suspend users whose subscription period has ended and payment failed
    UPDATE public.users
    SET
        is_pro = FALSE,
        subscription_status = 'suspended'
    WHERE
        is_pro = TRUE
        AND subscription_status IN ('past_due', 'unpaid')
        AND current_period_end < NOW()
        AND subscription_status != 'suspended';

    -- Log the auto-suspension
    INSERT INTO public.subscription_history (user_id, action, from_plan, to_plan, reason)
    SELECT
        id,
        'auto_suspended',
        'pro',
        'free',
        'Payment failed - subscription expired'
    FROM public.users
    WHERE subscription_status = 'suspended' AND is_pro = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record tab analytics
CREATE OR REPLACE FUNCTION record_tab_event(
    p_user_id UUID,
    p_device_id UUID,
    p_event_type TEXT,
    p_count INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
    v_hour INTEGER;
BEGIN
    v_hour := EXTRACT(HOUR FROM NOW())::INTEGER;

    -- Insert or update daily analytics
    INSERT INTO public.tab_analytics (user_id, device_id, date, tabs_opened, tabs_closed, tabs_cleaned, hourly_data)
    VALUES (
        p_user_id,
        p_device_id,
        CURRENT_DATE,
        CASE WHEN p_event_type = 'opened' THEN p_count ELSE 0 END,
        CASE WHEN p_event_type = 'closed' THEN p_count ELSE 0 END,
        CASE WHEN p_event_type = 'cleaned' THEN p_count ELSE 0 END,
        jsonb_build_object(v_hour::TEXT, p_count)
    )
    ON CONFLICT (user_id, device_id, date)
    DO UPDATE SET
        tabs_opened = tab_analytics.tabs_opened + CASE WHEN p_event_type = 'opened' THEN p_count ELSE 0 END,
        tabs_closed = tab_analytics.tabs_closed + CASE WHEN p_event_type = 'closed' THEN p_count ELSE 0 END,
        tabs_cleaned = tab_analytics.tabs_cleaned + CASE WHEN p_event_type = 'cleaned' THEN p_count ELSE 0 END,
        hourly_data = jsonb_set(
            tab_analytics.hourly_data,
            ARRAY[v_hour::TEXT],
            to_jsonb(COALESCE((tab_analytics.hourly_data->>v_hour::TEXT)::INTEGER, 0) + p_count)
        ),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPLETED!
-- ============================================
-- Migration completed successfully
-- Next: Enable pg_cron extension for scheduled jobs
-- Then run: SELECT cron.schedule('check-subscriptions', '0 * * * *', 'SELECT check_subscription_status()');
