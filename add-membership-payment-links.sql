-- ================================================================
-- ADD MEMBERSHIP PAYMENT LINKS TO SITE SETTINGS
-- ================================================================
-- This migration adds payment link fields to the membership JSONB
-- configuration in the site_settings table
-- ================================================================

-- ================================================================
-- STEP 1: Update existing site_settings to include payment links
-- ================================================================

-- Add payment link fields to the membership JSONB object
-- This updates the existing row to include the new fields
UPDATE site_settings
SET membership = membership || 
  jsonb_build_object(
    'individualPaymentLink', '',
    'familyPaymentLink', '',
    'lifePaymentLink', ''
  )
WHERE NOT (membership ? 'individualPaymentLink');

-- ================================================================
-- STEP 2: Verify the structure
-- ================================================================

-- View current membership configuration
SELECT 
  id,
  membership
FROM site_settings;

-- ================================================================
-- STEP 3: Example - How to update payment links via SQL (optional)
-- ================================================================

-- Uncomment and modify these queries to manually set payment links:

/*
-- Update Individual Membership Payment Link
UPDATE site_settings
SET membership = jsonb_set(
  membership,
  '{individualPaymentLink}',
  '"https://buy.stripe.com/test_individual_link_here"'
);

-- Update Family Membership Payment Link
UPDATE site_settings
SET membership = jsonb_set(
  membership,
  '{familyPaymentLink}',
  '"https://buy.stripe.com/test_family_link_here"'
);

-- Update Lifetime Membership Payment Link
UPDATE site_settings
SET membership = jsonb_set(
  membership,
  '{lifePaymentLink}',
  '"https://buy.stripe.com/test_lifetime_link_here"'
);
*/

-- ================================================================
-- STEP 4: View full membership configuration with payment links
-- ================================================================

SELECT 
  membership->>'individualPrice' as individual_price,
  membership->>'familyPrice' as family_price,
  membership->>'lifePrice' as life_price,
  membership->>'individualPaymentLink' as individual_payment_link,
  membership->>'familyPaymentLink' as family_payment_link,
  membership->>'lifePaymentLink' as life_payment_link
FROM site_settings;

-- ================================================================
-- NOTES:
-- ================================================================
-- 1. The membership field is a JSONB object storing all membership configuration
-- 2. Payment links are stored as strings in the JSONB structure
-- 3. The Admin Settings UI automatically saves to these fields
-- 4. Empty strings ('') are the default for new payment link fields
-- 5. You can update these through the Admin UI or directly via SQL
-- 6. This migration is idempotent - safe to run multiple times
-- ================================================================

-- ================================================================
-- ALTERNATIVE: If site_settings table doesn't exist yet
-- ================================================================

-- If you get an error that site_settings doesn't exist, run this instead:
/*
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "siteName" VARCHAR(255) NOT NULL DEFAULT 'TASJ - Telugu Association of South Jersey',
  "siteDescription" TEXT DEFAULT 'Building community, celebrating culture, and creating lasting connections.',
  "contactEmail" VARCHAR(255) DEFAULT 'info@tasj.org',
  "contactPhone" VARCHAR(50) DEFAULT '+1 (555) 123-4567',
  address TEXT DEFAULT '123 Community Street, South Jersey, NJ 08000',
  "socialMedia" JSONB DEFAULT '{"facebook": "https://facebook.com/tasj", "twitter": "https://twitter.com/tasj", "instagram": "https://instagram.com/tasj", "email": "mailto:info@tasj.org"}',
  membership JSONB DEFAULT '{
    "individualPrice": 50, 
    "familyPrice": 100, 
    "lifePrice": 500,
    "individualPaymentLink": "",
    "familyPaymentLink": "",
    "lifePaymentLink": ""
  }',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings if table was just created
INSERT INTO site_settings (
  "siteName",
  "siteDescription",
  "contactEmail",
  "contactPhone",
  address,
  "socialMedia",
  membership
) 
SELECT 
  'TASJ - Telugu Association of South Jersey',
  'Building community, celebrating culture, and creating lasting connections.',
  'info@tasj.org',
  '+1 (555) 123-4567',
  '123 Community Street, South Jersey, NJ 08000',
  '{"facebook": "https://facebook.com/tasj", "twitter": "https://twitter.com/tasj", "instagram": "https://instagram.com/tasj", "email": "mailto:info@tasj.org"}'::jsonb,
  '{
    "individualPrice": 50, 
    "familyPrice": 100, 
    "lifePrice": 500,
    "individualPaymentLink": "",
    "familyPaymentLink": "",
    "lifePaymentLink": ""
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM site_settings);
*/

-- ================================================================
-- TROUBLESHOOTING
-- ================================================================

-- Check if site_settings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'site_settings'
) as table_exists;

-- If table exists, check current structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'site_settings'
ORDER BY ordinal_position;

-- Check current membership configuration
SELECT membership FROM site_settings LIMIT 1;

-- ================================================================
