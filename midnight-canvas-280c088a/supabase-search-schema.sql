-- Multi-Platform Search Schema for TabKeep
-- Run this in Supabase SQL Editor after creating your project

-- ============================================
-- SEARCH SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Query tracking
  initial_query TEXT NOT NULL,
  refined_query TEXT,

  -- Platform selection
  selected_platforms TEXT[] DEFAULT ARRAY['google', 'youtube', 'github', 'reddit', 'spotify'],
  platforms_searched TEXT[] DEFAULT '{}',

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'completed', 'failed')),

  -- AI summary
  ai_summary TEXT,

  -- Metadata
  total_results INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- PLATFORM RESULTS TABLE (Caching + Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.search_sessions(id) ON DELETE CASCADE NOT NULL,

  -- Platform info
  platform TEXT NOT NULL,

  -- Results data
  normalized_results JSONB NOT NULL,
  result_count INTEGER DEFAULT 0,

  -- Performance tracking
  duration_ms INTEGER,
  error TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_search_sessions_user_id ON public.search_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_search_sessions_created_at ON public.search_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_sessions_user_created ON public.search_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_results_session_id ON public.platform_results(session_id);
CREATE INDEX IF NOT EXISTS idx_platform_results_platform ON public.platform_results(platform);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on both tables
ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_results ENABLE ROW LEVEL SECURITY;

-- Search Sessions Policies
CREATE POLICY "Users can view own search sessions"
  ON public.search_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create search sessions"
  ON public.search_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search sessions"
  ON public.search_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Platform Results Policies
CREATE POLICY "Users can view own platform results"
  ON public.platform_results
  FOR SELECT
  USING (
    session_id IN (SELECT id FROM public.search_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert platform results"
  ON public.platform_results
  FOR INSERT
  WITH CHECK (
    session_id IN (SELECT id FROM public.search_sessions WHERE user_id = auth.uid())
  );

-- ============================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================

-- Test that tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'search%' OR table_name LIKE 'platform%';

-- Test that RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND (tablename = 'search_sessions' OR tablename = 'platform_results');

-- Test that policies exist
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND (tablename = 'search_sessions' OR tablename = 'platform_results');
