-- 1. Tables officielles supplémentaires : écriture interdite au super_admin
do $$
declare t text;
begin
  foreach t in array array['documents','dossiers','instructions','rapports'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists sa_no_insert on public.%I', t);
      execute format('drop policy if exists sa_no_update on public.%I', t);
      execute format('drop policy if exists sa_no_delete on public.%I', t);
      execute format('create policy sa_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_super_admin())', t);
      execute format('create policy sa_no_update on public.%I as restrictive for update to authenticated using (not public.is_super_admin()) with check (not public.is_super_admin())', t);
      execute format('create policy sa_no_delete on public.%I as restrictive for delete to authenticated using (not public.is_super_admin())', t);
    end if;
  end loop;
end $$;

-- 2. Storage : buckets archives et adjoints (actes, preuves de signature, actes de délégation)
do $$
declare c text; b text;
begin
  foreach b in array array['archives','adjoints'] loop
    foreach c in array array['insert','update','delete'] loop
      execute format('drop policy if exists %I on storage.objects', 'sa_no_'||c||'_'||b);
      execute format('create policy %I on storage.objects as restrictive for %s to authenticated %s',
        'sa_no_'||c||'_'||b, c,
        case c
          when 'insert' then format('with check (bucket_id <> %L or not public.is_super_admin())', b)
          when 'update' then format('using (bucket_id <> %1$L or not public.is_super_admin()) with check (bucket_id <> %1$L or not public.is_super_admin())', b)
          else format('using (bucket_id <> %L or not public.is_super_admin())', b)
        end);
    end loop;
  end loop;
end $$;

-- 3. Révocation de sessions : limitée à la commune, jamais un super_admin
create or replace function public.sa_revoquer_sessions(p_commune text, p_user uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  perform public._garde();
  for u in select id from public.profiles
    where role::text <> 'super_admin' and commune_id::text = p_commune and (p_user is null or id = p_user) loop
    perform public._revoquer_sessions(u);
  end loop;
  perform public._audit(p_commune, 'sessions_revoke', coalesce(p_user::text, 'tous'), null);
end $$;
revoke all on function public.sa_revoquer_sessions(text, uuid) from public, anon;
grant execute on function public.sa_revoquer_sessions(text, uuid) to authenticated;

-- 4. Sauvegarde : exclut courriers et documents confidentiels (NULL compris)
create or replace function public.sa_creer_sauvegarde(p_commune text, p_nom text, p_type text default 'manuelle') returns uuid
language plpgsql security definer set search_path = '' as $$
declare t text; v jsonb; c jsonb := '{}'::jsonb; cnt jsonb := '{}'::jsonb; sid uuid;
begin
  perform public._garde();
  foreach t in array array['indicateurs','parametres_systeme','permissions_roles','profiles','rdv','courrier','demandes','publications',
    'medias','projets','finances','delegations','adjoints','reunions','instructions','rapports','deliberations','actes','sessions_conseil',
    'services','dossiers','archives','notifications','documents','conseillers'] loop
    if to_regclass('public.' || t) is not null and exists (
      select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'commune_id') then
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.commune_id::text = $1'
        || case t when 'courrier' then ' and coalesce(x.confidentiel, false) = false'
                  when 'documents' then ' and coalesce(x.confidentialite, '''') <> ''confidentiel'''
                  else '' end, t) into v using p_commune;
      c := c || jsonb_build_object(t, v);
      cnt := cnt || jsonb_build_object(t, jsonb_array_length(v));
    end if;
  end loop;
  insert into public.sauvegardes (commune_id, nom, type, taille, tables, contenu, created_by, created_by_email)
  values (p_commune, coalesce(nullif(trim(left(p_nom, 120)), ''), 'Sauvegarde ' || to_char(now(), 'DD/MM/YYYY HH24:MI')), p_type,
          octet_length(c::text), cnt, c, auth.uid(), (select email from auth.users where id = auth.uid()))
  returning id into sid;
  perform public._audit(p_commune, 'backup_create', sid::text, jsonb_build_object('type', p_type, 'tables', cnt));
  return sid;
end $$;
revoke all on function public.sa_creer_sauvegarde(text, text, text) from public, anon;
grant execute on function public.sa_creer_sauvegarde(text, text, text) to authenticated;

-- 5. Chemin d'image sans regex
create or replace function public.sa_set_image(p_commune text, p_cle text, p_chemin text) returns text
language plpgsql security definer set search_path = '' as $$
declare old text; n int;
begin
  perform public._garde();
  if p_cle not in ('blason', 'photo_maire', 'bandeau') then raise exception 'Image inconnue'; end if;
  if left(p_chemin, length(p_commune) + 1) <> p_commune || '/' then raise exception 'Chemin invalide'; end if;
  execute format('select %I from public.indicateurs where commune_id::text = $1', p_cle) into old using p_commune;
  execute format('update public.indicateurs set %I = $1 where commune_id::text = $2', p_cle) using p_chemin, p_commune;
  get diagnostics n = row_count;
  if n = 0 then
    execute format('insert into public.indicateurs (commune_id, %I) select c.id, $1 from public.communes c where c.id::text = $2', p_cle)
      using p_chemin, p_commune;
  end if;
  perform public._audit(p_commune, 'image_set', p_cle, jsonb_build_object('chemin', p_chemin));
  return old;
end $$;
revoke all on function public.sa_set_image(text, text, text) from public, anon;
grant execute on function public.sa_set_image(text, text, text) to authenticated;

-- 6. Permissions : liste blanche des clés
create or replace function public.sa_set_permission(p_commune text, p_role text, p_cle text, p_autorise boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  if p_role not in ('maire','adjoint','cabinet','secretariat','finances','rh','etat_civil','technique','agent') then
    raise exception 'Rôle non modifiable'; end if;
  if p_cle <> all (array['sdash','cin','cout','actes','sconseil','sinstr','serv','sreun','dossiers','archives','srap','snotif','adjdash','adjlist','deleg','projA','reun','instr','rapp','msg','docs','notif','cabinet','budget','civil','personnel','params','projets','territoire','conseil','citoyens','pub','med','rapports']) then
    raise exception 'Permission invalide'; end if;
  insert into public.permissions_roles (commune_id, role, cle, autorise, updated_by) values (p_commune, p_role, p_cle, p_autorise, auth.uid())
  on conflict (commune_id, role, cle) do update set autorise = excluded.autorise, updated_at = now(), updated_by = auth.uid();
  perform public._audit(p_commune, 'perm_set', p_role, jsonb_build_object('cle', p_cle, 'autorise', p_autorise));
end $$;
revoke all on function public.sa_set_permission(text, text, text, boolean) from public, anon;
grant execute on function public.sa_set_permission(text, text, text, boolean) to authenticated;

-- 7. Lecture des réglages : sa propre commune uniquement
drop policy if exists ps_lecture on public.parametres_systeme;
create policy ps_lecture on public.parametres_systeme for select to authenticated
  using (coalesce((select private.my_role()), 'citoyen') <> 'citoyen'
         and (commune_id = (select private.my_commune())::text or (select private.my_role()) = 'super_admin'));
drop policy if exists pr_lecture on public.permissions_roles;
create policy pr_lecture on public.permissions_roles for select to authenticated
  using (coalesce((select private.my_role()), 'citoyen') <> 'citoyen'
         and (commune_id = (select private.my_commune())::text or (select private.my_role()) = 'super_admin'));
