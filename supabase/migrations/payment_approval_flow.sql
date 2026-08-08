-- 1. Add payment_status column to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- 2. Create an index for faster lookups during registration
CREATE INDEX IF NOT EXISTS idx_members_email_payment_status 
ON members(email, payment_status);

-- 3. (Optional) Create a function to check if a user is eligible for member pricing
-- This can be used in your application logic or even inside other DB functions
CREATE OR REPLACE FUNCTION is_active_paid_member(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members 
    WHERE email = check_email 
      AND payment_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Row Level Security (RLS) Policies
-- Ensure only admins can update the payment_status

-- Assuming you have an 'admin_users' table or similar mechanism.
-- If you are using Supabase Auth with a custom claim or role, adjust accordingly.
-- Example: Only allow updates to payment_status if the requesting user is an admin.

-- Enable RLS if not already enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can update all fields
CREATE POLICY "Admins can update members" 
ON members 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- Policy: Public/Anon can read members for verification (restricted by function usually, but if direct select:)
-- Ideally, don't allow public read on all members. verifyMembershipByEmail uses a service key or restricted select.

-- 5. Data Migration (Optional)
-- If you want to auto-approve existing active members:
-- UPDATE members SET payment_status = 'approved' WHERE status = 'active';


-- Function to safely mark registration as paid (bypassing RLS if needed)
-- This is useful for public-facing payment pages where the user might be anonymous
create or replace function mark_event_registration_paid(
  p_reg_id uuid,
  p_payment_method text default 'online'
)
returns jsonb as 45917
declare
  result jsonb;
begin
  update event_registrations
  set 
    payment_status = 'paid',
    payment_method = p_payment_method,
    updated_at = now()
  where id = p_reg_id
  returning to_jsonb(event_registrations.*) into result;
  
  return result;
end;
45917 language plpgsql security definer;
