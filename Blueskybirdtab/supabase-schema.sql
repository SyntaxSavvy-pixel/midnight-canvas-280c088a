-- TabKeep Database Schema for Supabase
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/kfyzgqbnjvzemwivfcew/sql

-- ============================================================
-- PROFILES TABLE
-- Extended user data beyond Supabase Auth
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create indexes for username and email lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ============================================================
-- SEARCH HISTORY TABLE
-- Stores user search queries and chat sessions
-- ============================================================
CREATE TABLE public.search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  initial_query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Store the full conversation
  messages JSONB DEFAULT '[]'::jsonb,

  -- Soft delete support
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Policies for search_history table
CREATE POLICY "Users can view own search history"
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can insert own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search history"
  ON public.search_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
  ON public.search_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);
CREATE INDEX idx_search_history_user_created ON public.search_history(user_id, created_at DESC);

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on profiles
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Triggers for updated_at on search_history
CREATE TRIGGER on_search_history_updated
  BEFORE UPDATE ON public.search_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INTELLIGENCE & MEMORY SYSTEM
-- Smart AI that learns from every conversation
-- ============================================================

-- Add intelligence tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intelligence_used INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intelligence_limit INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intelligence_reset_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;

-- User Memory Table - Stores what the AI learns about each user
CREATE TABLE IF NOT EXISTS public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- What the AI learned
  memory_type TEXT NOT NULL, -- 'preference', 'fact', 'style', 'mistake', 'success'
  content TEXT NOT NULL,

  -- Importance ranking (updated in real-time)
  importance FLOAT DEFAULT 1.0,
  times_reinforced INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source tracking
  source_chat_id UUID REFERENCES public.search_history(id) ON DELETE SET NULL,
  learned_from TEXT DEFAULT 'conversation', -- 'conversation', 'thumbs_up', 'thumbs_down', 'explicit'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_memory
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- Policies for user_memory
CREATE POLICY "Users can view own memory"
  ON public.user_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory"
  ON public.user_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory"
  ON public.user_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory"
  ON public.user_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for fast memory retrieval
CREATE INDEX IF NOT EXISTS idx_user_memory_lookup ON public.user_memory(user_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_user_memory_type ON public.user_memory(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memory_recent ON public.user_memory(user_id, last_used_at DESC);

-- Trigger to update updated_at on user_memory
CREATE TRIGGER on_user_memory_updated
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PLAN LIMITS CONFIGURATION
-- ============================================================
-- Free:  100 intelligence/month, no cross-chat memory
-- Pro:   500 intelligence/day, 3hr cooldown, cross-chat memory
-- Max:   Unlimited, cross-chat memory

-- Function to check and reset intelligence limits
CREATE OR REPLACE FUNCTION public.check_intelligence_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_can_proceed BOOLEAN := TRUE;
  v_message TEXT := NULL;
  v_reset_at TIMESTAMPTZ := NULL;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('canProceed', FALSE, 'error', 'User not found');
  END IF;

  -- Max users have no limits
  IF v_profile.plan = 'max' THEN
    RETURN jsonb_build_object('canProceed', TRUE, 'plan', 'max', 'unlimited', TRUE);
  END IF;

  -- Check cooldown for Pro users
  IF v_profile.plan = 'pro' AND v_profile.cooldown_until IS NOT NULL THEN
    IF v_now < v_profile.cooldown_until THEN
      RETURN jsonb_build_object(
        'canProceed', FALSE,
        'error', 'limit_reached',
        'message', 'Your thinking limit resets soon',
        'resetAt', v_profile.cooldown_until,
        'plan', 'pro'
      );
    ELSE
      -- Cooldown expired, reset
      UPDATE public.profiles
      SET intelligence_used = 0, cooldown_until = NULL
      WHERE id = p_user_id;
      v_profile.intelligence_used := 0;
    END IF;
  END IF;

  -- Check if at limit
  IF v_profile.intelligence_used >= v_profile.intelligence_limit THEN
    IF v_profile.plan = 'pro' THEN
      -- Set 3 hour cooldown
      v_reset_at := v_now + INTERVAL '3 hours';
      UPDATE public.profiles SET cooldown_until = v_reset_at WHERE id = p_user_id;
      RETURN jsonb_build_object(
        'canProceed', FALSE,
        'error', 'limit_reached',
        'message', 'Taking a breather. Resets in 3 hours.',
        'resetAt', v_reset_at,
        'plan', 'pro'
      );
    ELSE
      -- Free user hard stop
      RETURN jsonb_build_object(
        'canProceed', FALSE,
        'error', 'limit_reached',
        'message', 'You''ve reached your free limit. Upgrade to continue.',
        'showUpgrade', TRUE,
        'plan', 'free'
      );
    END IF;
  END IF;

  -- All good
  RETURN jsonb_build_object(
    'canProceed', TRUE,
    'plan', v_profile.plan,
    'used', v_profile.intelligence_used,
    'limit', v_profile.intelligence_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add intelligence usage
CREATE OR REPLACE FUNCTION public.add_intelligence_usage(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET intelligence_used = intelligence_used + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MEMORY ANCHORS SYSTEM
-- Persistent AI brains that survive chat deletion
-- ============================================================

-- Memory Anchors Table - The "brain" that persists
CREATE TABLE IF NOT EXISTS public.memory_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anchor_id TEXT UNIQUE NOT NULL,  -- e.g., TMA-K9F2-1739-DEV

  name TEXT NOT NULL DEFAULT 'Default',
  purpose TEXT,  -- 'work', 'personal', 'learning', etc.

  is_default BOOLEAN DEFAULT FALSE,
  memory_count INTEGER DEFAULT 0,
  chat_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on memory_anchors
ALTER TABLE public.memory_anchors ENABLE ROW LEVEL SECURITY;

-- Policies for memory_anchors
CREATE POLICY "Users can view own anchors"
  ON public.memory_anchors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own anchors"
  ON public.memory_anchors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anchors"
  ON public.memory_anchors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own anchors"
  ON public.memory_anchors FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for memory_anchors
CREATE INDEX IF NOT EXISTS idx_memory_anchors_user ON public.memory_anchors(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_anchors_user_default ON public.memory_anchors(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_memory_anchors_anchor_id ON public.memory_anchors(anchor_id);

-- Trigger for updated_at on memory_anchors
CREATE TRIGGER on_memory_anchors_updated
  BEFORE UPDATE ON public.memory_anchors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ANCHOR ID GENERATION FUNCTION
-- Format: TMA-{USER_HASH}-{EPOCH}-{PURPOSE}
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_anchor_id(p_user_id UUID, p_purpose TEXT DEFAULT 'GEN')
RETURNS TEXT AS $$
DECLARE
  user_hash TEXT;
  epoch_code TEXT;
BEGIN
  user_hash := UPPER(SUBSTRING(MD5(p_user_id::TEXT) FROM 1 FOR 4));
  epoch_code := LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 10000)::TEXT, 4, '0');
  RETURN 'TMA-' || user_hash || '-' || epoch_code || '-' || UPPER(SUBSTRING(p_purpose FROM 1 FOR 3));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- MODIFY EXISTING TABLES FOR ANCHOR SUPPORT
-- ============================================================

-- Add anchor_id to user_memory (links memories to anchors)
ALTER TABLE public.user_memory
  ADD COLUMN IF NOT EXISTS anchor_id UUID REFERENCES public.memory_anchors(id) ON DELETE CASCADE;

-- Add memory_source to track explicit vs implicit memories
ALTER TABLE public.user_memory
  ADD COLUMN IF NOT EXISTS memory_source TEXT DEFAULT 'implicit';
  -- 'explicit' = user manually added
  -- 'implicit' = learned from conversation
  -- 'system' = system-generated

-- Add anchor_id to search_history (links chats to anchors)
ALTER TABLE public.search_history
  ADD COLUMN IF NOT EXISTS anchor_id UUID REFERENCES public.memory_anchors(id) ON DELETE SET NULL;

-- Additional index for memory lookups by anchor
CREATE INDEX IF NOT EXISTS idx_user_memory_anchor ON public.user_memory(anchor_id, importance DESC);

-- Additional index for chat lookups by anchor
CREATE INDEX IF NOT EXISTS idx_search_history_anchor ON public.search_history(anchor_id, created_at DESC);

-- ============================================================
-- CHAT ARCHIVE TABLE
-- Preserves deleted chat content for memory context
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_id UUID REFERENCES public.memory_anchors(id) ON DELETE CASCADE NOT NULL,
  original_chat_id UUID,

  title TEXT NOT NULL,
  initial_query TEXT,
  messages JSONB DEFAULT '[]',
  memory_extracted BOOLEAN DEFAULT FALSE,

  original_created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chat_archive
ALTER TABLE public.chat_archive ENABLE ROW LEVEL SECURITY;

-- Policies for chat_archive (read-only for users, managed by triggers)
CREATE POLICY "Users can view own archives"
  ON public.chat_archive FOR SELECT
  USING (
    anchor_id IN (
      SELECT id FROM public.memory_anchors WHERE user_id = auth.uid()
    )
  );

-- Index for archive lookups
CREATE INDEX IF NOT EXISTS idx_chat_archive_anchor ON public.chat_archive(anchor_id, archived_at DESC);

-- ============================================================
-- MIGRATION: CREATE DEFAULT ANCHORS FOR EXISTING USERS
-- Run this after creating the tables
-- ============================================================

-- Create default anchor for users who have memories but no anchor
INSERT INTO public.memory_anchors (user_id, anchor_id, name, is_default)
SELECT DISTINCT
  user_id,
  public.generate_anchor_id(user_id, 'DEF'),
  'Default',
  TRUE
FROM public.user_memory
WHERE anchor_id IS NULL
ON CONFLICT DO NOTHING;

-- Also create default anchor for users with chat history but no memories
INSERT INTO public.memory_anchors (user_id, anchor_id, name, is_default)
SELECT DISTINCT
  user_id,
  public.generate_anchor_id(user_id, 'DEF'),
  'Default',
  TRUE
FROM public.search_history
WHERE anchor_id IS NULL
AND user_id NOT IN (SELECT user_id FROM public.memory_anchors)
ON CONFLICT DO NOTHING;

-- Link existing memories to their user's default anchor
UPDATE public.user_memory
SET anchor_id = (
  SELECT id FROM public.memory_anchors
  WHERE user_id = user_memory.user_id AND is_default = TRUE
  LIMIT 1
)
WHERE anchor_id IS NULL;

-- Link existing chats to their user's default anchor
UPDATE public.search_history
SET anchor_id = (
  SELECT id FROM public.memory_anchors
  WHERE user_id = search_history.user_id AND is_default = TRUE
  LIMIT 1
)
WHERE anchor_id IS NULL;

-- ============================================================
-- FUNCTION: Create default anchor on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Create default memory anchor
  INSERT INTO public.memory_anchors (user_id, anchor_id, name, is_default)
  VALUES (
    NEW.id,
    public.generate_anchor_id(NEW.id, 'DEF'),
    'Default',
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Update anchor counts
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_anchor_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update memory_count
  UPDATE public.memory_anchors
  SET memory_count = (
    SELECT COUNT(*) FROM public.user_memory WHERE anchor_id = memory_anchors.id
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.anchor_id, OLD.anchor_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update counts when memories change
DROP TRIGGER IF EXISTS on_memory_count_change ON public.user_memory;
CREATE TRIGGER on_memory_count_change
  AFTER INSERT OR DELETE ON public.user_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_anchor_counts();

-- ============================================================
-- FUNCTION: Update chat count on anchor
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_anchor_chat_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update chat_count for the affected anchor
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.anchor_id IS NOT NULL THEN
      UPDATE public.memory_anchors
      SET chat_count = (
        SELECT COUNT(*) FROM public.search_history WHERE anchor_id = NEW.anchor_id AND is_deleted = FALSE
      ),
      last_used_at = NOW(),
      updated_at = NOW()
      WHERE id = NEW.anchor_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.anchor_id IS NOT NULL THEN
      UPDATE public.memory_anchors
      SET chat_count = (
        SELECT COUNT(*) FROM public.search_history WHERE anchor_id = OLD.anchor_id AND is_deleted = FALSE
      ),
      updated_at = NOW()
      WHERE id = OLD.anchor_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update chat count when chats change
DROP TRIGGER IF EXISTS on_chat_count_change ON public.search_history;
CREATE TRIGGER on_chat_count_change
  AFTER INSERT OR UPDATE OR DELETE ON public.search_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_anchor_chat_count();

-- ============================================================
-- DONE! Your database is now set up.
-- ============================================================
