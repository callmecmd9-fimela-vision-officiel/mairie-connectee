-- PROPOSÉE — NE PAS APPLIQUER avant que le front (js/core.js : MFA obligatoire pour admin_mairie) soit déployé
-- ET que chaque admin municipal ait enrôlé son application d'authentification (sinon verrouillage de ces comptes).
-- Effet : les fonctions am_* exigent une session aal2 (double authentification validée) pour un admin_mairie.
create or replace function public._garde_am(p_commune text)
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if public.is_super_admin() then perform public._garde(p_commune); return; end if;
  if private.my_role()='admin_mairie'
     and coalesce((select auth.jwt()->>'aal'),'')='aal2'
     and p_commune is not distinct from (select p.commune_id::text from public.profiles p where p.id=(select auth.uid()) and coalesce(p.actif,false)) then
    return;
  end if;
  raise exception 'Accès refusé : administrateur de cette mairie avec double authentification requis' using errcode='42501';
end $$;
revoke all on function public._garde_am(text) from public, anon;
