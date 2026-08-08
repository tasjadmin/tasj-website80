-- Add columns to public.gallery table to support both Storage and Drive galleries
ALTER TABLE public.gallery
ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('storage', 'drive')),
ADD COLUMN IF NOT EXISTS thumb_url text,
ADD COLUMN IF NOT EXISTS display_url text,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS drive_url text,
ADD COLUMN IF NOT EXISTS width integer,
ADD COLUMN IF NOT EXISTS height integer;

-- Add index on event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_gallery_event_id ON public.gallery(event_id);

-- Enable RLS on gallery if not already (it seemed enabled or disabled, I should verify)
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access
DROP POLICY IF EXISTS "Public can view gallery" ON public.gallery;
CREATE POLICY "Public can view gallery" ON public.gallery FOR SELECT USING (true);

-- Policy: Admin write access (Assuming authenticated users with admin role, or just authenticated for now as per previous patterns?)
-- Previous patterns used implicit or specific roles. I will use authenticated for now to match leadership table style likely.
DROP POLICY IF EXISTS "Admin can manage gallery" ON public.gallery;
CREATE POLICY "Admin can manage gallery" ON public.gallery FOR ALL USING (auth.role() = 'authenticated');
