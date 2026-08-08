-- ================================================================
-- STRIPE PAYMENT LINKS SYSTEM - DATABASE MIGRATION
-- ================================================================
-- This migration adds support for multiple payment links
-- to handle different pricing tiers for events and memberships
-- ================================================================

-- ================================================================
-- STEP 1: Add payment link columns to events table
-- ================================================================

-- Add columns to support member vs non-member pricing
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS member_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS non_member_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS member_payment_link TEXT,
ADD COLUMN IF NOT EXISTS non_member_payment_link TEXT;

-- Add comment to explain the new columns
COMMENT ON COLUMN events.registration_fee IS 'Base registration fee (fallback if member/non-member prices not set)';
COMMENT ON COLUMN events.member_price IS 'Registration price for members';
COMMENT ON COLUMN events.non_member_price IS 'Registration price for non-members';
COMMENT ON COLUMN events.member_payment_link IS 'Stripe payment link for members';
COMMENT ON COLUMN events.non_member_payment_link IS 'Stripe payment link for non-members';

-- ================================================================
-- STEP 2: Add payment link column to membership_types table
-- ================================================================

ALTER TABLE membership_types 
ADD COLUMN IF NOT EXISTS payment_link TEXT;

COMMENT ON COLUMN membership_types.payment_link IS 'Stripe payment link for this membership type';

-- ================================================================
-- STEP 3: Example data - Update with your actual Stripe links
-- ================================================================

-- IMPORTANT: Replace these example URLs with your actual Stripe payment link URLs
-- You can get these from: https://dashboard.stripe.com/payment-links

-- Example: Update an event with payment links
-- Uncomment and modify with your actual event name and Stripe links
/*
UPDATE events 
SET 
  member_price = 20.00,
  non_member_price = 30.00,
  member_payment_link = 'https://buy.stripe.com/test_xxxxxxxxxxxxx_MEMBER_LINK',
  non_member_payment_link = 'https://buy.stripe.com/test_xxxxxxxxxxxxx_NONMEMBER_LINK'
WHERE name = 'Your Event Name Here';
*/

-- Example: Update membership types with payment links
-- Uncomment and add your actual Stripe payment links

/*
-- Update Individual membership ($40 or $50 - check your pricing)
UPDATE membership_types 
SET payment_link = 'https://buy.stripe.com/test_xxxxxxxxxxxxx_INDIVIDUAL_LINK'
WHERE name = 'Individual';

-- Update Family membership ($100)
UPDATE membership_types 
SET payment_link = 'https://buy.stripe.com/test_xxxxxxxxxxxxx_FAMILY_LINK'
WHERE name = 'Family';

-- Update Lifetime membership ($500)
UPDATE membership_types 
SET payment_link = 'https://buy.stripe.com/test_xxxxxxxxxxxxx_LIFETIME_LINK'
WHERE name = 'Life Membership';
*/

-- ================================================================
-- STEP 4: Verification queries
-- ================================================================

-- Check events table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('member_price', 'non_member_price', 'member_payment_link', 'non_member_payment_link')
ORDER BY ordinal_position;

-- Check membership_types table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'membership_types' 
  AND column_name = 'payment_link'
ORDER BY ordinal_position;

-- View current events configuration
SELECT 
  id,
  name,
  member_price,
  non_member_price,
  member_payment_link IS NOT NULL as has_member_link,
  non_member_payment_link IS NOT NULL as has_nonmember_link
FROM events
ORDER BY event_date DESC
LIMIT 10;

-- View current membership types configuration
SELECT 
  id,
  name,
  price,
  payment_link IS NOT NULL as has_payment_link
FROM membership_types
ORDER BY name;

-- ================================================================
-- NOTES:
-- ================================================================
-- 1. This migration is safe to run multiple times (uses IF NOT EXISTS)
-- 2. Existing data is preserved
-- 3. New columns are nullable, so existing events continue to work
-- 4. Payment links are optional - system will fallback to other payment methods
-- 5. Test in Stripe TEST mode before using LIVE mode links
-- ================================================================
