-- Clean up members table: Remove leadership data that was mistakenly stored there
-- This ensures leadership data only exists in the 'leadership' table.

UPDATE members
SET
  committee = NULL,
  role = NULL,
  bio = NULL,
  occupation = NULL,
  social = NULL,
  profile_image_base64 = NULL
WHERE
  committee IS NOT NULL OR role IS NOT NULL;
