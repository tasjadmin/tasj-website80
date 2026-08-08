ALTER TABLE events 
ADD COLUMN IF NOT EXISTS gallery_drive_url TEXT,
ADD COLUMN IF NOT EXISTS has_gallery BOOLEAN DEFAULT false;

-- Add registration controls and organizer contact
ALTER TABLE events
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS organizer_phone VARCHAR(32),
ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(120);
