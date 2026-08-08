-- Add missing payment_method column to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Add missing payment_method column to event_registrations table (just to be safe)
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
