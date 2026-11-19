-- Contrôles centraux d’identité, MFA et périmètre communal.

create or replace function private.my_commune()
returns uuid language sql stable security definer set search_path = ''
as $$ select p.commune_id from public.profiles p where p.id=(select auth.uid()) and coalesce(p.actif,true) $$;

create or replace function private.my_role()
returns text language sql stable security definer set search_path = ''
as $$ select p.role::text from public.profiles p where p.id=(select auth.uid()) and coalesce(p.actif,true) $$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select p.actif and p.role::text='super_admin' and (select auth.jwt()->>'aal')='aal2'
    from public.profiles p where p.id=(select auth.uid())),false)
$$;

create or replace function private.is_platform_admin(p_niveaux text[] default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt()->>'aal'),'')='aal2'
    and exists(
      select 1 from public.platform_admins a
      join public.profiles p on p.id=a.user_id
      where a.user_id=(select auth.uid()) and a.actif and coalesce(p.actif,true)
        and (p_niveaux is null or a.niveau=any(p_niveaux))
    )
$$;

create or replace function private.can(roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select coalesce(p.actif,true) and (
      public.is_super_admin()
      or private.is_platform_admin()
      or (p.role::text='adjoint' and exists(
        select 1 from public.adjoints ad
        join public.org_affectations oa on oa.user_id=ad.user_id and oa.commune_id=ad.commune_id
        where ad.user_id=p.id and ad.commune_id=p.commune_id and ad.actif
          and oa.actif and oa.debut<=current_date and (oa.fin is null or oa.fin>=current_date)
      ))
      or (p.role::text not in ('adjoint','super_admin') and p.role::text=any(roles))
    ) from public.profiles p where p.id=(select auth.uid())
  ),false)
$$;

create or replace function public.org_gest(p_slug text)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare c uuid;
begin
  select id into c from public.communes where slug=p_slug;
  if c is null then raise exception 'Commune introuvable'; end if;
  if auth.uid() is null or not coalesce(
    private.is_platform_admin() or public.is_super_admin()
    or (private.my_role()='maire' and private.my_commune()=c),false
  ) then raise exception 'Accès refusé'; end if;
  return c;
end
$$;

create or replace function public.org_droit_user(u uuid,m text,a text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(
    exists(select 1 from public.profiles p where p.id=u and coalesce(p.actif,true))
    and (
      public.org_droit_propre(u,m,a)
      or exists(
        select 1 from public.org_delegations_droits d
        where d.a_user=u and d.module=m and d.action=a
          and d.revoque_le is null and now() between d.debut and d.fin
          and d.commune_id=(select p.commune_id from public.profiles p where p.id=u and coalesce(p.actif,true))
          and public.org_droit_propre(d.de_user,m,a)
      )
    ),false
  )
$$;