alter policy communes_lecture on public.communes using (
 id = (select p.commune_id from public.profiles p where p.id=(select auth.uid()))
 or (select private.is_platform_admin()));