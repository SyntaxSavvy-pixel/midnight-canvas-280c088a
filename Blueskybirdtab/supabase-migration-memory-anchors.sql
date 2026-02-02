-- ============================================================
-- MEMORY ANCHORS MIGRATION
-- Run this AFTER your existing schema is set up
-- This adds the Memory Anchor system to an existing TabKeep database
-- ============================================================

-- ============================================================
-- STEP 1: CREATE MEMORY ANCHORS TABLE
-- ============================================================

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

-- Policies for memory_anchors (drop first if they exist)
DROP POLICY IF EXISTS "Users can view own anchors" ON public.memory_anchors;
DROP POLICY IF EXISTS "Users can insert own anchors" ON public.memory_anchors;
DROP POLICY IF EXISTS "Users can update own anchors" ON public.memory_anchors;
DROP POLICY IF EXISTS "Users can delete own anchors" ON public.memory_anchors;

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
DROP TRIGGER IF EXISTS on_memory_anchors_updated ON public.memory_anchors;
CREATE TRIGGER on_memory_anchors_updated
  BEFORE UPDATE ON public.memory_anchors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- STEP 2: ANCHOR ID GENERATION FUNCTION
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
-- STEP 3: ADD COLUMNS TO EXISTING TABLES
-- ============================================================

-- Add anchor_id to user_memory (links memories to anchors)
ALTER TABLE public.user_memory
  ADD COLUMN IF NOT EXISTS anchor_id UUID REFERENCES public.memory_anchors(id) ON DELETE CASCADE;

-- Add memory_source to track explicit vs implicit memories
ALTER TABLE public.user_memory
  ADD COLUMN IF NOT EXISTS memory_source TEXT DEFAULT 'implicit';

-- Add anchor_id to search_history (links chats to anchors)
ALTER TABLE public.search_history
  ADD COLUMN IF NOT EXISTS anchor_id UUID REFERENCES public.memory_anchors(id) ON DELETE SET NULL;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_user_memory_anchor ON public.user_memory(anchor_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_anchor ON public.search_history(anchor_id, created_at DESC);

-- ============================================================
-- STEP 4: CHAT ARCHIVE TABLE
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

-- Policy for chat_archive
DROP POLICY IF EXISTS "Users can view own archives" ON public.chat_archive;
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
-- STEP 5: MIGRATE EXISTING DATA
-- Create default anchors and link existing data
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

-- Create default anchor for users with chat history but no memories
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

-- Create default anchor for users with profiles but no anchors yet
INSERT INTO public.memory_anchors (user_id, anchor_id, name, is_default)
SELECT
  id,
  public.generate_anchor_id(id, 'DEF'),
  'Default',
  TRUE
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.memory_anchors)
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
-- STEP 6: UPDATE handle_new_user FUNCTION
-- Now creates default anchor on user signup
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
-- STEP 7: ANCHOR COUNT TRIGGERS
-- Auto-update memory_count and chat_count
-- ============================================================

-- Function to update anchor memory count
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

-- Function to update anchor chat count
CREATE OR REPLACE FUNCTION public.update_anchor_chat_count()
RETURNS TRIGGER AS $$
BEGIN
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
-- DONE! Memory Anchor system is now installed.
-- ============================================================

-- Verify installation
SELECT
  'Memory Anchors Migration Complete!' as status,
  (SELECT COUNT(*) FROM public.memory_anchors) as total_anchors,
  (SELECT COUNT(*) FROM public.user_memory WHERE anchor_id IS NOT NULL) as linked_memories,
  (SELECT COUNT(*) FROM public.search_history WHERE anchor_id IS NOT NULL) as linked_chats;
