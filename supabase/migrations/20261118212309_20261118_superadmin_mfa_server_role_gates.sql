create or replace function private.my_role()
returns text language sql stable security definer set search_path = ''
as $$
 select case
   when p.role::text='super_admin' and coalesce((select auth.jwt()->>'aal'),'')<>'aal2' then null
   else p.role::text
 end
 from public.profiles p
 where p.id=(select auth.uid()) and coalesce(p.actif,true)
$$;

create or replace function private.hors_maintenance()
returns boolean language sql stable security definer set search_path = ''
as $$
 select coalesce((
   select coalesce(p.actif,true)
     and (c.id is null or c.statut not in ('suspendu','resilie'))
     and (
       public.is_super_admin()
       or not exists(
         select 1 from public.parametres_systeme s
         where s.cle='maintenance'
           and jsonb_typeof(s.valeur)='object'
           and coalesce((s.valeur->>'actif')::boolean,false)
           and s.commune_id=p.commune_id::text
       )
     )
   from public.profiles p
   left join public.communes c on c.id=p.commune_id
   where p.id=(select auth.uid())
 ),false)
$$;

create or replace function public.org_peut_accorder(p_role text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select coalesce((
   select p.actif and (
     p.role::text='maire'
     or (p.role::text='super_admin' and public.is_super_admin())
   )
   from public.profiles p where p.id=(select auth.uid())
 ),false)
 or not exists(
   select 1 from public.org_role_droits d
   where d.commune_id=public.org_commune()
     and d.role_code=p_role
     and not public.org_droit_propre((select auth.uid()),d.module,d.action)
 )
$$;