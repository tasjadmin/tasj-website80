-- ============================================
-- TASJ Members Table Setup for Supabase
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor
-- Then click "RUN" button

-- Step 1: Create the members table
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
  -- Admin Members form fields
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

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_membership_type ON members(membership_type);

-- Step 3: Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security policies (allow anyone to insert and view)
DROP POLICY IF EXISTS "Members are viewable by everyone" ON members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON members;
DROP POLICY IF EXISTS "Users can update their own membership" ON members;

CREATE POLICY "Members are viewable by everyone" 
  ON members FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own membership" 
  ON members FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own membership" 
  ON members FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete members" 
  ON members FOR DELETE 
  USING (true);

-- Step 5: Insert a test member (optional - you can delete this)
INSERT INTO members (first_name, last_name, email, committee, role, status)
VALUES ('Test', 'User', 'test@example.com', 'Executive Committee', 'Member', 'active')
ON CONFLICT (email) DO NOTHING;

-- Done! Your members table is ready to use.
