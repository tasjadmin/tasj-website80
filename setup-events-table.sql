-- ============================================
-- TASJ Events Table Setup for Supabase
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor
-- Then click "RUN" button

-- Step 1: Create the events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location_name VARCHAR(255),
  location_url TEXT,
  mode VARCHAR(20) DEFAULT 'offline',
  category VARCHAR(50),
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  food_available BOOLEAN DEFAULT false,
  food_type VARCHAR(20),
  organizer_message TEXT,
  event_image_url TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- Step 3: Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security policies (allow anyone to view, insert, update, delete)
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Anyone can create events" ON events;
DROP POLICY IF EXISTS "Anyone can update events" ON events;
DROP POLICY IF EXISTS "Anyone can delete events" ON events;

CREATE POLICY "Events are viewable by everyone" 
  ON events FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create events" 
  ON events FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update events" 
  ON events FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete events" 
  ON events FOR DELETE 
  USING (true);

-- Step 5: Insert sample events (optional - you can delete these later)
INSERT INTO events (name, description, event_date, event_time, location_name, mode, category, status)
VALUES 
  ('Telugu New Year Celebration', 'Join us for a grand celebration of Ugadi with traditional music, dance, and food', '2025-03-30', '18:00', 'Community Center Hall', 'offline', 'Festival', 'confirmed'),
  ('Cultural Workshop', 'Learn traditional Telugu arts and crafts from master artists', '2025-04-15', '14:00', 'TASJ Cultural Center', 'offline', 'Workshop', 'confirmed'),
  ('Monthly Community Meeting', 'Discuss upcoming events and community initiatives', '2025-01-25', '19:00', 'TASJ Office', 'offline', 'Meeting', 'confirmed')
ON CONFLICT DO NOTHING;

-- Done! Your events table is ready to use.
