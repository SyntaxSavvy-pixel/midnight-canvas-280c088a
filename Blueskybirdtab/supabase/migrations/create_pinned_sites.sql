-- Create pinned_sites table
CREATE TABLE IF NOT EXISTS pinned_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  favicon_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_pinned_sites_user_id ON pinned_sites(user_id);

-- Create index on position for ordering
CREATE INDEX IF NOT EXISTS idx_pinned_sites_position ON pinned_sites(user_id, position);

-- Enable Row Level Security
ALTER TABLE pinned_sites ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own pinned sites
CREATE POLICY "Users can view own pinned sites"
  ON pinned_sites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own pinned sites
CREATE POLICY "Users can insert own pinned sites"
  ON pinned_sites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own pinned sites
CREATE POLICY "Users can update own pinned sites"
  ON pinned_sites
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own pinned sites
CREATE POLICY "Users can delete own pinned sites"
  ON pinned_sites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pinned_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pinned_sites_updated_at
  BEFORE UPDATE ON pinned_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_pinned_sites_updated_at();
