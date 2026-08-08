-- ==========================================
-- 1. ADMIN SETUP
-- ==========================================

-- Insert the admin user into the admin_users table
INSERT INTO public.admin_users (user_id, username, role)
VALUES ('2d5ab0e9-089e-409e-9f09-c87d308635d7', 'tasjadmin@gmail.com', 'admin')
ON CONFLICT (user_id) DO UPDATE 
SET role = 'admin', username = 'tasjadmin@gmail.com';

-- Create helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. DATABASE RLS POLICIES (Tables)
-- ==========================================

-- Enable RLS on core tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Members table policies
DROP POLICY IF EXISTS "Admins have full access to members" ON public.members;
CREATE POLICY "Admins have full access to members" 
ON public.members FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view their own member record" ON public.members;
CREATE POLICY "Users can view their own member record" 
ON public.members FOR SELECT USING (auth.uid() = id);

-- Admin_users table policies
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admin_users;
CREATE POLICY "Admins can view admin list" 
ON public.admin_users FOR SELECT USING (public.is_admin());


-- ==========================================
-- 3. AUTOMATION: AUTH TO MEMBERS SYNC
-- ==========================================

-- Function to automatically create a member record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.members (id, email, first_name, last_name, status, payment_status)
  VALUES (
    new.id, 
    new.email, 
    split_part(new.raw_user_meta_data->>'full_name', ' ', 1),
    COALESCE(split_part(new.raw_user_meta_data->>'full_name', ' ', 2), ''),
    'pending',
    'pending'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function above
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 4. STORAGE RLS POLICIES (Buckets & Folders)
-- ==========================================

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4a. Admin Full Access Policy (All Buckets)
DROP POLICY IF EXISTS "Admin Full Access" ON storage.objects;
CREATE POLICY "Admin Full Access"
ON storage.objects FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4b. Public Read Access (For website display)
DROP POLICY IF EXISTS "Public View Access" ON storage.objects;
CREATE POLICY "Public View Access"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN ('event-banners', 'gallery images', 'site-assets', 'payment-proofs')
);

-- 4c. User Upload Access (For payment proofs)
-- Requirement: Files must be in folder: payment-proofs/[USER_ID]/...
DROP POLICY IF EXISTS "Users can upload own payment proofs" ON storage.objects;
CREATE POLICY "Users can upload own payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4d. User Management Access (Update/Delete own proofs)
DROP POLICY IF EXISTS "Users can manage own proofs" ON storage.objects;
CREATE POLICY "Users can manage own proofs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'payment-proofs' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
