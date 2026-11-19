create or replace function public._garde(p_commune text)
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.is_super_admin() then
   raise exception 'Accès refusé : super-administrateur actif et MFA AAL2 requis' using errcode='42501';
 end if;
 if private.is_platform_admin() then
   if not exists(select 1 from public.communes c where c.id::text=p_commune) then
     raise exception 'Commune introuvable' using errcode='42501';
   end if;
   return;
 end if;
 if p_commune is distinct from (
   select p.commune_id::text from public.profiles p where p.id=(select auth.uid()) and p.actif
 ) then
   raise exception 'Accès refusé : autre commune' using errcode='42501';
 end if;
end
$$;