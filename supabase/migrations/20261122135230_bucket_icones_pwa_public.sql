-- Icônes PNG de l'application citoyenne (écran d'accueil) : bucket public dédié, limité à 3 fichiers PNG par commune.
-- Le bucket « identite » reste privé (blason/bannière servis par liens signés).
BEGIN;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('icones-pwa', 'icones-pwa', true, 524288, ARRAY['image/png'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 524288, allowed_mime_types = ARRAY['image/png'];

DROP POLICY IF EXISTS icones_pwa_select ON storage.objects;
DROP POLICY IF EXISTS icones_pwa_insert ON storage.objects;
DROP POLICY IF EXISTS icones_pwa_update ON storage.objects;
DROP POLICY IF EXISTS icones_pwa_delete ON storage.objects;

CREATE POLICY icones_pwa_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'icones-pwa' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
  AND p.commune_id::text = (storage.foldername(name))[1] AND p.role IN ('maire','cabinet','secretariat')));

CREATE POLICY icones_pwa_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'icones-pwa' AND name ~ '^[0-9a-f-]{36}/(icon-192|icon-512|icon-maskable-512)\.png$'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
  AND p.commune_id::text = (storage.foldername(name))[1] AND p.role IN ('maire','cabinet','secretariat')));

CREATE POLICY icones_pwa_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'icones-pwa' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
  AND p.commune_id::text = (storage.foldername(name))[1] AND p.role IN ('maire','cabinet','secretariat')))
WITH CHECK (bucket_id = 'icones-pwa' AND name ~ '^[0-9a-f-]{36}/(icon-192|icon-512|icon-maskable-512)\.png$'
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
  AND p.commune_id::text = (storage.foldername(name))[1] AND p.role IN ('maire','cabinet','secretariat')));

CREATE POLICY icones_pwa_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'icones-pwa' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
  AND p.commune_id::text = (storage.foldername(name))[1] AND p.role IN ('maire','cabinet','secretariat')));
COMMIT;
