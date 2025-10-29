-- QUICK FIX: Create missing tables causing 406/409 errors
-- Run this in Supabase SQL Editor if you're getting 406 errors

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users_auth(id) ON DELETE CASCADE,
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}',
    active_theme TEXT DEFAULT 'lightMinimal',
    theme_config JSONB DEFAULT '{}',
    extension_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create theme_drafts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.theme_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users_auth(id) ON DELETE CASCADE,
    draft_data JSONB NOT NULL,
    last_saved TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_drafts ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;

DROP POLICY IF EXISTS "Users can view own drafts" ON public.theme_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON public.theme_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.theme_drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.theme_drafts;

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for theme_drafts
CREATE POLICY "Users can view own drafts" ON public.theme_drafts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts" ON public.theme_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON public.theme_drafts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON public.theme_drafts
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_theme_drafts_user_id ON public.theme_drafts(user_id);
