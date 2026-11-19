-- Migration déjà appliquée en production : p1_identite_published_assets_read
-- Lecture anonyme strictement limitée aux médias d'identité explicitement publiés.
BEGIN;
DROP POLICY IF EXISTS identite_published_assets_read ON storage.objects;
CREATE POLICY identite_published_assets_read
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'identite'
  AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(blason\.webp|bandeau\.webp|bandeau-m\.webp)$'
);
COMMIT;
