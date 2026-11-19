-- Correctifs fail-closed ciblés pour deux gardes SECURITY DEFINER.
-- Source des corps : définitions réellement déployées, lues dans pg_proc le 2026-11-19.
-- CREATE OR REPLACE conserve le propriétaire et les ACL existants.
-- Aucun rôle métier n'est ajouté ; aucune table ni donnée n'est modifiée.

begin;

create or replace function private.paie_garde(p_roles text[])
returns uuid
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  c uuid := private.my_commune();
  r text := private.my_role();
begin
  if c is null
     or r is null
     or p_roles is null
     or cardinality(p_roles) = 0
     or not coalesce(r = any (p_roles), false)
     or not coalesce(private.hors_maintenance(), false) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  return c;
end
$function$;

create or replace function public.lier_adjoint(p_adjoint uuid, p_email text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  u uuid;
  a public.adjoints;
begin
  -- Préserve les trois voies autorisées : administrateur plateforme,
  -- maire de la commune, super-administrateur avec AAL2.
  -- COALESCE élimine le contournement PL/pgSQL provoqué par un IF NULL.
  if not (
    coalesce(private.is_platform_admin(), false)
    or coalesce(private.my_role() = 'maire', false)
    or coalesce(public.is_super_admin(), false)
  ) then
    raise exception 'Accès refusé';
  end if;

  select * into a from public.adjoints where id = p_adjoint;
  if a.id is null or (
    not coalesce(private.is_platform_admin(), false)
    and a.commune_id is distinct from private.my_commune()
  ) then
    raise exception 'Adjoint introuvable';
  end if;

  select id into u from auth.users
  where lower(email) = lower(trim(p_email));
  if u is null then
    raise exception 'Aucun compte avec cet e-mail : l’administrateur doit d’abord le créer';
  end if;

  if exists (
    select 1 from public.profiles
    where id = u and commune_id is distinct from a.commune_id
  ) then
    raise exception 'Ce compte appartient à une autre commune';
  end if;

  if exists (
    select 1 from public.profiles
    where id = u and role in ('maire','super_admin')
  ) then
    raise exception 'Ce compte a un autre rôle';
  end if;

  insert into public.profiles(id,role,commune_id)
  values (u,'adjoint',a.commune_id)
  on conflict (id)
  do update set role = 'adjoint', commune_id = excluded.commune_id;

  update public.adjoints set user_id = u where id = p_adjoint;
end
$function$;

commit;
