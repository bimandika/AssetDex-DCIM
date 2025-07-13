-- Clean up the unnecessary storage and database schema for logo
DROP TABLE IF EXISTS public.organization_settings CASCADE;
DROP POLICY IF EXISTS "Logo images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'logos';