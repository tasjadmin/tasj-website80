-- TASJ Website Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL Editor

-- Disable Row Level Security since we're using localStorage authentication
ALTER TABLE IF EXISTS members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leadership DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membership_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gallery DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sponsors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_registrations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to prevent recursion issues
DROP POLICY IF EXISTS "Members are viewable by everyone" ON members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON members;
DROP POLICY IF EXISTS "Users can update their own membership" ON members;
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Only admins can modify events" ON events;
DROP POLICY IF EXISTS "Anyone can register for events" ON event_registrations;
DROP POLICY IF EXISTS "Only admins can view event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Only admins can modify event registrations" ON event_registrations;
DROP POLICY IF EXISTS "Leadership is viewable by everyone" ON leadership;
DROP POLICY IF EXISTS "Only admins can modify leadership" ON leadership;
DROP POLICY IF EXISTS "Only admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Membership types are viewable by everyone" ON membership_types;
DROP POLICY IF EXISTS "Only admins can modify membership types" ON membership_types;
DROP POLICY IF EXISTS "Gallery is viewable by everyone" ON gallery;
DROP POLICY IF EXISTS "Only admins can modify gallery" ON gallery;
DROP POLICY IF EXISTS "Sponsors are viewable by everyone" ON sponsors;
DROP POLICY IF EXISTS "Only admins can modify sponsors" ON sponsors;
DROP POLICY IF EXISTS "Anyone can send contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Only admins can view contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Only admins can modify contact messages" ON contact_messages;

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  membership_type VARCHAR(50) NOT NULL DEFAULT 'individual',
  family_members JSONB DEFAULT '[]',
  emergency_contact JSONB DEFAULT '{}',
  -- Optional profile fields captured from AdminMembers modal
  committee VARCHAR(120),
  role VARCHAR(120),
  bio TEXT,
  occupation VARCHAR(180),
  social JSONB DEFAULT '{}',
  profile_image_base64 TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
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
  -- Payment configuration
  registration_fee DECIMAL(10,2) DEFAULT 0,
  member_price DECIMAL(10,2),
  non_member_price DECIMAL(10,2),
  member_payment_link TEXT,
  non_member_payment_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  attendees INTEGER DEFAULT 1,
  dietary_restrictions TEXT,
  special_requests TEXT,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leadership table
CREATE TABLE IF NOT EXISTS leadership (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  photo_url TEXT,
  social_media JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membership types table
CREATE TABLE IF NOT EXISTS membership_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]',
  is_popular BOOLEAN DEFAULT false,
  payment_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gallery table
CREATE TABLE IF NOT EXISTS gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category VARCHAR(100),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  sponsorship_level VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default membership types
INSERT INTO membership_types (name, price, description, features, is_popular) VALUES
('Individual', 50.00, 'Single membership for one person', '["Access to all events", "Newsletter subscription", "Community directory access"]', false),
('Family', 100.00, 'Family membership for up to 4 members', '["Access to all events", "Newsletter subscription", "Community directory access", "Family discounts", "Priority event registration"]', false),
('Life Membership', 500.00, 'Lifetime membership with all benefits', '["Access to all events", "Newsletter subscription", "Community directory access", "Family discounts", "Priority event registration", "Lifetime membership", "Special recognition"]', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_membership_type ON members(membership_type);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON event_registrations(email);
-- Composite index for common query pattern: filtering by event and sorting by date
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_date ON event_registrations(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leadership_category ON leadership(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);