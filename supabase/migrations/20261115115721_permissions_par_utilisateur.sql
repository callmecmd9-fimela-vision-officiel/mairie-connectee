create or replace function private.perm_valides() returns text[] language sql immutable set search_path='' as $$
select array['sdash','cin','cout','actes','sconseil','sinstr','serv','sreun','dossiers','archives','srap','snotif','adjdash','adjlist','deleg','projA','reun','instr','rapp','msg','docs','notif','cabinet','budget','civil','personnel','params','projets','territoire','conseil','citoyens','pub','med','rapports',
 'conges','mdash','agenda','aud','valid','decis','marches','rapb','patrimoine','commissions','recl','aides','audc','devdom','indic','svcsuivi','evalproj'] $$;
revoke all on function private.perm_valides() from public, anon, authenticated;

create or replace function public.sa_set_permission(p_commune text, p_role text, p_cle text, p_autorise boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  perform public._garde();
  if p_role not in ('maire','adjoint','cabinet','secretariat','finances','rh','etat_civil','technique','agent') then raise exception 'Rôle non modifiable'; end if;
  if p_cle <> all (private.perm_valides()) then raise exception 'Permission invalide'; end if;
  insert into public.permissions_roles (commune_id, role, cle, autorise, updated_by) values (p_commune, p_role, p_cle, p_autorise, auth.uid())
  on conflict (commune_id, role, cle) do update set autorise = excluded.autorise, updated_at = now(), updated_by = auth.uid();
  perform public._audit(p_commune, 'perm_set', p_role, jsonb_build_object('cle', p_cle, 'autorise', p_autorise));
end $$;

create table public.permissions_utilisateurs(
 commune_id text not null, user_id uuid not null references auth.users(id) on delete cascade, cle text not null,
 autorise boolean not null, updated_at timestamptz not null default now(), updated_by uuid,
 primary key (commune_id, user_id, cle));
alter table public.permissions_utilisateurs enable row level security;
revoke all on public.permissions_utilisateurs from anon;
revoke insert, update, delete on public.permissions_utilisateurs from authenticated;
create policy pu_lecture on public.permissions_utilisateurs for select to authenticated using (user_id=(select auth.uid()) or (select private.my_role())='super_admin');
create policy bloque_anonymes_permissions_utilisateurs on public.permissions_utilisateurs as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false);
create index on public.permissions_utilisateurs(user_id);

create or replace function public.sa_set_permission_user(p_commune text, p_user uuid, p_cle text, p_autorise boolean) returns void language plpgsql security definer set search_path='' as $$
declare r text; em text;
begin
  perform public._garde();
  if p_cle <> all (private.perm_valides()) then raise exception 'Permission invalide'; end if;
  select role into r from public.profiles where id=p_user and commune_id::text=p_commune;
  if r is null then raise exception 'Compte introuvable dans cette commune'; end if;
  if r in ('super_admin','adjoint','secretariat') then raise exception 'Compte non modifiable'; end if;
  insert into public.permissions_utilisateurs(commune_id,user_id,cle,autorise,updated_by) values (p_commune,p_user,p_cle,p_autorise,auth.uid())
  on conflict (commune_id,user_id,cle) do update set autorise=excluded.autorise, updated_at=now(), updated_by=auth.uid();
  select email into em from auth.users where id=p_user;
  perform public._audit(p_commune,'perm_user_set',em,jsonb_build_object('cle',p_cle,'autorise',p_autorise));
end $$;
create or replace function public.sa_reset_permissions_user(p_commune text, p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare em text;
begin
  perform public._garde();
  delete from public.permissions_utilisateurs where commune_id=p_commune and user_id=p_user;
  select email into em from auth.users where id=p_user;
  perform public._audit(p_commune,'perm_user_reset',em,null);
end $$;
revoke all on function public.sa_set_permission_user(text,uuid,text,boolean), public.sa_reset_permissions_user(text,uuid) from public, anon;
grant execute on function public.sa_set_permission_user(text,uuid,text,boolean), public.sa_reset_permissions_user(text,uuid) to authenticated;