-- Site Settings Table for TASJ Website
-- IMPORTANT: Run this EXACT SQL in your Supabase SQL Editor
-- This will drop and recreate the table with the correct structure

-- Drop existing table to ensure clean slate
DROP TABLE IF EXISTS site_settings CASCADE;

-- Create site_settings table with camelCase column aliases
CREATE TABLE site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "siteName" VARCHAR(255) NOT NULL DEFAULT 'TASJ - Telugu Association of South Jersey',
  "siteDescription" TEXT DEFAULT 'Building community, celebrating culture, and creating lasting connections.',
  "contactEmail" VARCHAR(255) DEFAULT 'info@tasj.org',
  "contactPhone" VARCHAR(50) DEFAULT '+1 (555) 123-4567',
  address TEXT DEFAULT '123 Community Street, South Jersey, NJ 08000',
  "socialMedia" JSONB DEFAULT '{"facebook": "https://facebook.com/tasj", "twitter": "https://twitter.com/tasj", "instagram": "https://instagram.com/tasj", "email": "mailto:info@tasj.org"}',
  membership JSONB DEFAULT '{"individualPrice": 50, "familyPrice": 100, "lifePrice": 500}',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security (allows public read/write access)
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO site_settings (
  "siteName",
  "siteDescription",
  "contactEmail",
  "contactPhone",
  address,
  "socialMedia",
  membership
) VALUES (
  'TASJ - Telugu Association of South Jersey',
  'Building community, celebrating culture, and creating lasting connections.',
  'info@tasj.org',
  '+1 (555) 123-4567',
  '123 Community Street, South Jersey, NJ 08000',
  '{"facebook": "https://facebook.com/tasj", "twitter": "https://twitter.com/tasj", "instagram": "https://instagram.com/tasj", "email": "mailto:info@tasj.org"}'::jsonb,
  '{"individualPrice": 50, "familyPrice": 100, "lifePrice": 500}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_site_settings_updated_at ON site_settings("updatedAt");

-- Add comment to table
COMMENT ON TABLE site_settings IS 'Global site settings managed through admin panel. Uses camelCase columns to match JavaScript.';

-- Verify the table was created correctly
SELECT * FROM site_settings;
