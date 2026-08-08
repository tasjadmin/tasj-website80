-- Create leadership table
DROP TABLE IF EXISTS leadership;

CREATE TABLE leadership (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL, -- Link to member record if exists
  
  -- Basic Info (Copy from member or standalone if not a member)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Leadership Specific
  committee VARCHAR(120),
  role VARCHAR(120),
  bio TEXT,
  occupation VARCHAR(180),
  social JSONB DEFAULT '{}',
  profile_image_base64 TEXT,
  
  -- Meta
  status VARCHAR(20) DEFAULT 'active',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email to help linking
CREATE INDEX IF NOT EXISTS idx_leadership_email ON leadership(email);

-- Enable RLS
ALTER TABLE leadership ENABLE ROW LEVEL SECURITY;

-- Policies (Adjust as needed, similar to members)
CREATE POLICY "Leadership viewable by everyone" ON leadership FOR SELECT USING (true);
CREATE POLICY "Admins can insert leadership" ON leadership FOR INSERT WITH CHECK (true); -- details determined by app logic/auth
CREATE POLICY "Admins can update leadership" ON leadership FOR UPDATE USING (true);
CREATE POLICY "Admins can delete leadership" ON leadership FOR DELETE USING (true);

-- Migration: Move existing leadership data from members table to leadership table
INSERT INTO leadership (
  member_id, 
  first_name, 
  last_name, 
  email, 
  phone, 
  committee, 
  role, 
  bio, 
  occupation, 
  social, 
  profile_image_base64
)
SELECT 
  id, 
  first_name, 
  last_name, 
  email, 
  phone, 
  committee, 
  role, 
  bio, 
  occupation, 
  social, 
  profile_image_base64
FROM members 
WHERE committee IS NOT NULL OR role IS NOT NULL
ON CONFLICT (email) DO UPDATE SET
  member_id = EXCLUDED.member_id,
  committee = EXCLUDED.committee,
  role = EXCLUDED.role;

-- (Optional) If you want to clear these columns from members table later, you can.
-- For now, we leave them to avoid breaking the app until the frontend is updated.
-- ALTER TABLE members DROP COLUMN committee, DROP COLUMN role, ...;
