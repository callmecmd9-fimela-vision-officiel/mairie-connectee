create or replace function public.org_sa_roles(p_commune text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare c uuid:=public.org_gest(p_commune);
begin
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'code',r.code,'nom',r.nom,'famille',r.famille,'description',r.description,
   'systeme',r.systeme,'actif',r.actif,
   'droits',coalesce((
    select jsonb_agg(jsonb_build_object('module',d.module,'action',d.action) order by d.module,d.action)
    from public.org_role_droits d
    where d.commune_id=c and d.role_code=r.code
   ),'[]'::jsonb)
  ) order by r.systeme desc,r.nom)
  from public.org_roles r where r.commune_id=c
 ),'[]'::jsonb);
end
$$;
revoke all on function public.org_sa_roles(text) from public, anon;
grant execute on function public.org_sa_roles(text) to authenticated;