-- ================================================================
-- ADD PAYMENT LINK COLUMNS TO EXISTING TABLES
-- ================================================================
-- This migration adds the new member/non-member payment link columns
-- to the events table and membership settings
-- ================================================================

-- ================================================================
-- STEP 1: Add payment link columns to events table
-- ================================================================

-- Add new columns for member and non-member payment links
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS member_payment_link TEXT,
ADD COLUMN IF NOT EXISTS non_member_payment_link TEXT;

-- Add new columns for pricing if they don't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS member_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS non_member_price DECIMAL(10,2);

-- Add comments to explain the new columns
COMMENT ON COLUMN events.member_payment_link IS 'Stripe payment link for members';
COMMENT ON COLUMN events.non_member_payment_link IS 'Stripe payment link for non-members';
COMMENT ON COLUMN events.registration_fee IS 'Base registration fee (fallback if member/non-member prices not set)';
COMMENT ON COLUMN events.member_price IS 'Registration price for members';
COMMENT ON COLUMN events.non_member_price IS 'Registration price for non-members';

-- ================================================================
-- STEP 2: Verify the columns were added successfully
-- ================================================================

-- Check events table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('member_payment_link', 'non_member_payment_link', 'member_price', 'non_member_price', 'registration_fee')
ORDER BY ordinal_position;

-- ================================================================
-- STEP 3: View current events configuration (optional)
-- ================================================================

-- View events with their payment configuration
SELECT 
  id,
  name,
  event_date,
  member_price,
  non_member_price,
  member_payment_link IS NOT NULL as has_member_link,
  non_member_payment_link IS NOT NULL as has_nonmember_link
FROM events
ORDER BY event_date DESC
LIMIT 10;

-- ================================================================
-- NOTES:
-- ================================================================
-- 1. This migration is safe to run multiple times (uses IF NOT EXISTS)
-- 2. Existing data is preserved
-- 3. New columns are nullable, so existing events continue to work
-- 4. The old 'payment_link_url' column can remain (for backward compatibility)
--    but is no longer used by the new UI
-- 5. Payment links are optional - system will fallback to other payment methods
-- 6. Test in Stripe TEST mode before using LIVE mode links
-- ================================================================

-- ================================================================
-- OPTIONAL: Remove old payment_link_url column (if you want to clean up)
-- ================================================================
-- Uncomment the line below if you want to completely remove the old column
-- WARNING: This will permanently delete any data in that column
-- ALTER TABLE events DROP COLUMN IF EXISTS payment_link_url;
-- ================================================================
