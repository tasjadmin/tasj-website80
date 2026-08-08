-- Enable RLS on storage.objects (already enabled usually, but good practice to know)
-- We need policies for the 'gallery images' bucket

-- 1. Allow Public Read Access
CREATE POLICY "Public Access to Gallery Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'gallery images' );

-- 2. Allow Authenticated Uploads
CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'gallery images' );

-- 3. Allow Authenticated Updates
CREATE POLICY "Authenticated users can update gallery images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'gallery images' );

-- 4. Allow Authenticated Deletes
CREATE POLICY "Authenticated users can delete gallery images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'gallery images' );
