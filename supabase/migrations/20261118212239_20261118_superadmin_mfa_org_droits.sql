create or replace function public.org_droit_propre(u uuid,m text,a text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare p record; o boolean;
begin
 select role,commune_id into p
 from public.profiles
 where id=u and coalesce(actif,true);
 if not found then return false; end if;
 if p.role='maire' then return true; end if;
 if p.role='super_admin' then
   return u=(select auth.uid()) and public.is_super_admin();
 end if;
 if a='consulter' then
   select autorise into o
   from public.permissions_utilisateurs
   where commune_id=p.commune_id::text and user_id=u and cle=m;
   if found then return o; end if;
 end if;
 return exists(
   select 1
   from public.org_affectations f
   join public.org_postes po on po.commune_id=f.commune_id and po.code=f.poste_code and po.actif
   join public.org_roles r on r.commune_id=po.commune_id and r.code=po.role_code and r.actif
   join public.org_role_droits d on d.commune_id=r.commune_id and d.role_code=r.code
   where f.user_id=u and f.commune_id=p.commune_id and f.actif
     and f.debut<=current_date and (f.fin is null or f.fin>=current_date)
     and d.module=m and d.action=a
 );
end
$$;