-- Migration: Create user_devices table for device fingerprinting
-- Purpose: Prevent Pro plan sharing by limiting devices per account
-- Date: 2025
-- Version: 1.0

-- Create user_devices table
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    devices JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);

-- Add index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_devices_updated_at ON public.user_devices(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own devices
CREATE POLICY "Users can view own devices"
    ON public.user_devices
    FOR SELECT
    USING (auth.uid()::text = user_id OR auth.email() = user_id);

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert own devices"
    ON public.user_devices
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR auth.email() = user_id);

-- Policy: Users can update their own devices
CREATE POLICY "Users can update own devices"
    ON public.user_devices
    FOR UPDATE
    USING (auth.uid()::text = user_id OR auth.email() = user_id)
    WITH CHECK (auth.uid()::text = user_id OR auth.email() = user_id);

-- Policy: Users can delete their own devices
CREATE POLICY "Users can delete own devices"
    ON public.user_devices
    FOR DELETE
    USING (auth.uid()::text = user_id OR auth.email() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the update function
DROP TRIGGER IF EXISTS set_user_devices_updated_at ON public.user_devices;
CREATE TRIGGER set_user_devices_updated_at
    BEFORE UPDATE ON public.user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_user_devices_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.user_devices IS 'Stores device fingerprints for anti-account-sharing';
COMMENT ON COLUMN public.user_devices.user_id IS 'User UUID or email from auth.users';
COMMENT ON COLUMN public.user_devices.devices IS 'JSONB array of device objects with fingerprints and metadata';
COMMENT ON COLUMN public.user_devices.created_at IS 'Timestamp when first device was registered';
COMMENT ON COLUMN public.user_devices.updated_at IS 'Timestamp when devices list was last modified';

/*
Device JSONB Structure Example:
{
  "device_id": "a1b2c3d4e5f6g7h8-1234567890",
  "browser": "Chrome/120.0.0.0",
  "os": "MacIntel",
  "screenResolution": "1920x1080",
  "language": "en-US",
  "lastSeen": "2025-01-15T10:30:00.000Z",
  "registeredAt": "2025-01-10T08:00:00.000Z"
}
*/
