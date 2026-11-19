BEGIN;
UPDATE storage.buckets SET public = false WHERE id = 'identite';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='identite' AND public=false) THEN
    RAISE EXCEPTION 'Le bucket identite n''a pas pu être rendu privé';
  END IF;
END $$;
COMMIT;