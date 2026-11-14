-- =====================================================================
-- Mairie Connectée : socle Super Administrateur
-- Idempotent. À exécuter dans Supabase > SQL Editor (rôle postgres).
-- Aucune table ni donnée existante n'est supprimée ou modifiée.
-- =====================================================================

-- 1. Garde : l'appelant est-il super_admin ? ---------------------------
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role::text = 'super_admin')
$$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- 2. Colonnes additives ------------------------------------------------
alter table public.profiles   add column if not exists nom text;
alter table public.profiles   add column if not exists service text;
alter table public.profiles   add column if not exists actif boolean not null default true;
alter table public.indicateurs add column if not exists contact_email text;
alter table public.indicateurs add column if not exists site_web text;
alter table public.indicateurs add column if not exists horaires text;

-- 3. Tables (commune_id en text : indépendant du type de communes.id) ---
create table if not exists public.parametres_systeme (
  commune_id text not null, cle text not null, valeur jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(), updated_by uuid,
  primary key (commune_id, cle));
create table if not exists public.permissions_roles (
  commune_id text not null, role text not null, cle text not null, autorise boolean not null,
  updated_at timestamptz not null default now(), updated_by uuid,
  primary key (commune_id, role, cle));
create table if not exists public.journal_audit (
  id bigint generated always as identity primary key, commune_id text, user_id uuid, email text,
  action text not null, cible text, detail jsonb, created_at timestamptz not null default now());
create index if not exists journal_audit_idx on public.journal_audit (commune_id, created_at desc);
create table if not exists public.sauvegardes (
  id uuid primary key default gen_random_uuid(), commune_id text not null, nom text not null,
  type text not null default 'manuelle', taille bigint not null default 0, tables jsonb,
  contenu jsonb not null, statut text not null default 'ok',
  created_by uuid, created_by_email text, created_at timestamptz not null default now());
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(), commune_id text not null, titre text not null,
  gravite text not null default 'mineur' check (gravite in ('info','mineur','majeur','critique')),
  statut text not null default 'ouvert' check (statut in ('ouvert','en_cours','resolu')),
  description text, source text not null default 'manuel',
  created_by uuid, created_by_email text, created_at timestamptz not null default now(), resolu_at timestamptz);

-- 4. RLS : lecture seule côté client, écritures via fonctions ---------
alter table public.parametres_systeme enable row level security;
alter table public.permissions_roles  enable row level security;
alter table public.journal_audit      enable row level security;
alter table public.sauvegardes        enable row level security;
alter table public.incidents          enable row level security;

drop policy if exists ps_lecture on public.parametres_systeme;
create policy ps_lecture on public.parametres_systeme for select to authenticated
  using (coalesce((select private.my_role()), 'citoyen') <> 'citoyen');
drop policy if exists pr_lecture on public.permissions_roles;
create policy pr_lecture on public.permissions_roles for select to authenticated
  using (coalesce((select private.my_role()), 'citoyen') <> 'citoyen');
drop policy if exists ja_lecture on public.journal_audit;
create policy ja_lecture on public.journal_audit for select to authenticated using (public.is_super_admin());
drop policy if exists sv_lecture on public.sauvegardes;
create policy sv_lecture on public.sauvegardes for select to authenticated using (public.is_super_admin());
drop policy if exists inc_lecture on public.incidents;
create policy inc_lecture on public.incidents for select to authenticated using (public.is_super_admin());

-- 5. Actes officiels : le super_admin ne peut JAMAIS les écrire --------
-- (politiques RESTRICTIVE : s'ajoutent aux politiques existantes)
do $$
declare t text;
begin
  foreach t in array array['actes','deliberations','sessions_conseil','archives','delegations','courrier'] loop
    if to_regclass('public.' || t) is not null then
      if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
        raise notice 'RLS inactif sur % : protection inefficace tant que RLS n''est pas activé', t;
      end if;
      execute format('drop policy if exists sa_no_insert on public.%I', t);
      execute format('drop policy if exists sa_no_update on public.%I', t);
      execute format('drop policy if exists sa_no_delete on public.%I', t);
      execute format('create policy sa_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_super_admin())', t);
      execute format('create policy sa_no_update on public.%I as restrictive for update to authenticated using (not public.is_super_admin()) with check (not public.is_super_admin())', t);
      execute format('create policy sa_no_delete on public.%I as restrictive for delete to authenticated using (not public.is_super_admin())', t);
    end if;
  end loop;
end $$;

-- 6. Fonctions internes -------------------------------------------------
create or replace function public._audit(p_commune text, p_action text, p_cible text, p_detail jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal_audit (commune_id, user_id, email, action, cible, detail)
  values (p_commune, auth.uid(), (select email from auth.users where id = auth.uid()), p_action, p_cible, p_detail);
end $$;
revoke all on function public._audit(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public._revoquer_sessions(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.refresh_tokens where user_id::text = p_user::text;
  delete from auth.sessions where user_id = p_user;
end $$;
revoke all on function public._revoquer_sessions(uuid) from public, anon, authenticated;
grant execute on function public._revoquer_sessions(uuid) to service_role;

create or replace function public._garde() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Accès refusé' using errcode = '42501'; end if;
end $$;
revoke all on function public._garde() from public, anon;
grant execute on function public._garde() to authenticated;

-- 7. Statistiques -------------------------------------------------------
create or replace function public.sa_stats(p_commune text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; t text; n bigint; vol jsonb := '{}'::jsonb;
begin
  perform public._garde();
  foreach t in array array['demandes','courrier','deliberations','actes','projets','publications','medias','rdv','reunions'] loop
    if to_regclass('public.' || t) is not null and exists (
      select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'commune_id') then
      execute format('select count(*) from public.%I where commune_id::text = $1', t) into n using p_commune;
      vol := vol || jsonb_build_object(t, n);
    end if;
  end loop;
  select jsonb_build_object(
    'users_total',  (select count(*) from public.profiles p where p.commune_id::text = p_commune or p.role::text = 'super_admin'),
    'users_actifs', (select count(*) from public.profiles p where (p.commune_id::text = p_commune or p.role::text = 'super_admin') and p.actif),
    'users_30j',    (select count(*) from public.profiles p join auth.users u on u.id = p.id
                      where (p.commune_id::text = p_commune or p.role::text = 'super_admin') and u.created_at > now() - interval '30 days'),
    'par_role',     (select coalesce(jsonb_object_agg(role, c), '{}'::jsonb) from (
                      select p.role::text as role, count(*) c from public.profiles p
                      where p.commune_id::text = p_commune or p.role::text = 'super_admin' group by 1) x),
    'derniere_sauvegarde', (select max(created_at) from public.sauvegardes where commune_id = p_commune),
    'nb_sauvegardes',      (select count(*) from public.sauvegardes where commune_id = p_commune),
    'incidents_ouverts',   (select count(*) from public.incidents where commune_id = p_commune and statut <> 'resolu'),
    'audit_24h',           (select count(*) from public.journal_audit where commune_id = p_commune and created_at > now() - interval '24 hours'),
    'taille_db',           pg_database_size(current_database()),
    'volumes', vol) into r;
  return r;
end $$;

-- 8. Utilisateurs (lecture) --------------------------------------------
create or replace function public.sa_utilisateurs(p_commune text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select p.id, u.email, coalesce(p.nom, u.raw_user_meta_data ->> 'nom') as nom, p.role::text as role,
           p.service, p.actif, c.nom as commune, p.commune_id::text as commune_id,
           u.created_at, u.last_sign_in_at,
           (select count(*) from auth.sessions s where s.user_id = p.id) as sessions
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.communes c on c.id = p.commune_id
    where p.commune_id::text = p_commune or p.role::text = 'super_admin') x), '[]'::jsonb);
end $$;

-- 9. Paramètres système -------------------------------------------------
create or replace function public.sa_set_param(p_commune text, p_cle text, p_valeur jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  if p_cle not in ('maintenance', 'modules', 'idle_min', 'mdp_min') then raise exception 'Paramètre inconnu'; end if;
  if p_cle = 'idle_min' and (jsonb_typeof(p_valeur) <> 'number' or (p_valeur #>> '{}')::numeric not between 5 and 480) then
    raise exception 'Inactivité : 5 à 480 minutes'; end if;
  if p_cle = 'mdp_min' and (jsonb_typeof(p_valeur) <> 'number' or (p_valeur #>> '{}')::numeric not between 8 and 64) then
    raise exception 'Mot de passe : 8 à 64 caractères'; end if;
  if p_cle in ('maintenance', 'modules') and jsonb_typeof(p_valeur) <> 'object' then raise exception 'Valeur invalide'; end if;
  insert into public.parametres_systeme (commune_id, cle, valeur, updated_by) values (p_commune, p_cle, p_valeur, auth.uid())
  on conflict (commune_id, cle) do update set valeur = excluded.valeur, updated_at = now(), updated_by = auth.uid();
  perform public._audit(p_commune, 'param_set', p_cle, jsonb_build_object('valeur', p_valeur));
end $$;

-- 10. Permissions par rôle ----------------------------------------------
create or replace function public.sa_set_permission(p_commune text, p_role text, p_cle text, p_autorise boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  if p_role not in ('maire','adjoint','cabinet','secretariat','finances','rh','etat_civil','technique','agent') then
    raise exception 'Rôle non modifiable'; end if;
  if p_cle !~ '^[A-Za-z]{2,20}$' or p_cle = 'adm' then raise exception 'Permission invalide'; end if;
  insert into public.permissions_roles (commune_id, role, cle, autorise, updated_by) values (p_commune, p_role, p_cle, p_autorise, auth.uid())
  on conflict (commune_id, role, cle) do update set autorise = excluded.autorise, updated_at = now(), updated_by = auth.uid();
  perform public._audit(p_commune, 'perm_set', p_role, jsonb_build_object('cle', p_cle, 'autorise', p_autorise));
end $$;

create or replace function public.sa_reset_permissions(p_commune text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  delete from public.permissions_roles where commune_id = p_commune and role = p_role;
  perform public._audit(p_commune, 'perm_reset', p_role, null);
end $$;

-- 11. Identité de la mairie ---------------------------------------------
create or replace function public.sa_enregistrer_identite(p_commune text, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  update public.indicateurs set
    slogan = nullif(p_data ->> 'slogan', ''), devise = nullif(p_data ->> 'devise', ''),
    contact_tel = nullif(p_data ->> 'contact_tel', ''), contact_adresse = nullif(p_data ->> 'contact_adresse', ''),
    contact_email = nullif(p_data ->> 'contact_email', ''), site_web = nullif(p_data ->> 'site_web', ''),
    horaires = nullif(p_data ->> 'horaires', '')
  where commune_id::text = p_commune;
  if not found then
    insert into public.indicateurs (commune_id, slogan, devise, contact_tel, contact_adresse, contact_email, site_web, horaires)
    select c.id, nullif(p_data ->> 'slogan', ''), nullif(p_data ->> 'devise', ''), nullif(p_data ->> 'contact_tel', ''),
           nullif(p_data ->> 'contact_adresse', ''), nullif(p_data ->> 'contact_email', ''), nullif(p_data ->> 'site_web', ''),
           nullif(p_data ->> 'horaires', '')
    from public.communes c where c.id::text = p_commune;
  end if;
  if nullif(trim(p_data ->> 'nom'), '') is not null then
    update public.communes set nom = trim(p_data ->> 'nom') where id::text = p_commune;
  end if;
  perform public._audit(p_commune, 'identity_update', null, p_data);
end $$;

create or replace function public.sa_set_image(p_commune text, p_cle text, p_chemin text) returns text
language plpgsql security definer set search_path = '' as $$
declare old text; n int;
begin
  perform public._garde();
  if p_cle not in ('blason', 'photo_maire', 'bandeau') then raise exception 'Image inconnue'; end if;
  if p_chemin !~ ('^' || p_commune || '/') then raise exception 'Chemin invalide'; end if;
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

-- 12. Sauvegardes -------------------------------------------------------
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
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.commune_id::text = $1' || case when t = 'courrier' then ' and not x.confidentiel' else '' end, t) into v using p_commune;
      c := c || jsonb_build_object(t, v);
      cnt := cnt || jsonb_build_object(t, jsonb_array_length(v));
    end if;
  end loop;
  insert into public.sauvegardes (commune_id, nom, type, taille, tables, contenu, created_by, created_by_email)
  values (p_commune, coalesce(nullif(trim(p_nom), ''), 'Sauvegarde ' || to_char(now(), 'DD/MM/YYYY HH24:MI')), p_type,
          octet_length(c::text), cnt, c, auth.uid(), (select email from auth.users where id = auth.uid()))
  returning id into sid;
  perform public._audit(p_commune, 'backup_create', sid::text, jsonb_build_object('type', p_type, 'tables', cnt));
  return sid;
end $$;

-- Restauration LIMITÉE à la configuration (jamais aux actes ni aux décisions)
create or replace function public.sa_restaurer(p_commune text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.sauvegardes; t text; done jsonb := '[]'::jsonb;
begin
  perform public._garde();
  select * into s from public.sauvegardes where id = p_id and commune_id = p_commune;
  if not found then raise exception 'Sauvegarde introuvable'; end if;
  perform public.sa_creer_sauvegarde(p_commune, 'Avant restauration ' || to_char(now(), 'DD/MM/YYYY HH24:MI'), 'automatique');
  foreach t in array array['indicateurs','parametres_systeme','permissions_roles'] loop
    if s.contenu ? t and to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where commune_id::text = $1', t) using p_commune;
      execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)', t, t) using s.contenu -> t;
      done := done || to_jsonb(t);
    end if;
  end loop;
  perform public._audit(p_commune, 'backup_restore', p_id::text, jsonb_build_object('tables', done));
  return jsonb_build_object('restaurees', done);
end $$;

create or replace function public.sa_supprimer_sauvegarde(p_commune text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  delete from public.sauvegardes where id = p_id and commune_id = p_commune;
  perform public._audit(p_commune, 'backup_delete', p_id::text, null);
end $$;

-- 13. Sessions ----------------------------------------------------------
create or replace function public.sa_revoquer_sessions(p_commune text, p_user uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  perform public._garde();
  for u in select id from public.profiles where (p_user is null and id <> auth.uid()) or id = p_user loop
    perform public._revoquer_sessions(u);
  end loop;
  perform public._audit(p_commune, 'sessions_revoke', coalesce(p_user::text, 'tous'), null);
end $$;

-- 14. Incidents ---------------------------------------------------------
create or replace function public.sa_incident_creer(p_commune text, p_titre text, p_gravite text, p_description text, p_source text default 'manuel') returns uuid
language plpgsql security definer set search_path = '' as $$
declare iid uuid;
begin
  perform public._garde();
  if nullif(trim(p_titre), '') is null then raise exception 'Titre requis'; end if;
  insert into public.incidents (commune_id, titre, gravite, description, source, created_by, created_by_email)
  values (p_commune, trim(p_titre), p_gravite, nullif(trim(p_description), ''), coalesce(p_source, 'manuel'), auth.uid(),
          (select email from auth.users where id = auth.uid())) returning id into iid;
  perform public._audit(p_commune, 'incident_create', iid::text, jsonb_build_object('titre', p_titre, 'gravite', p_gravite));
  return iid;
end $$;

create or replace function public.sa_incident_maj(p_commune text, p_id uuid, p_statut text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  update public.incidents set statut = p_statut, resolu_at = case when p_statut = 'resolu' then now() else null end
  where id = p_id and commune_id = p_commune;
  perform public._audit(p_commune, 'incident_update', p_id::text, jsonb_build_object('statut', p_statut));
end $$;

-- 15. Audit côté client (exports, purge de cache) -----------------------
create or replace function public.sa_audit(p_commune text, p_action text, p_cible text default null, p_detail jsonb default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._garde();
  if p_action not in ('export', 'cache_purge') then raise exception 'Action non journalisable'; end if;
  perform public._audit(p_commune, p_action, p_cible, p_detail);
end $$;

-- 16. Droits d'exécution ------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'sa_stats(text)', 'sa_utilisateurs(text)', 'sa_set_param(text,text,jsonb)', 'sa_set_permission(text,text,text,boolean)',
    'sa_reset_permissions(text,text)', 'sa_enregistrer_identite(text,jsonb)', 'sa_set_image(text,text,text)',
    'sa_creer_sauvegarde(text,text,text)', 'sa_restaurer(text,uuid)', 'sa_supprimer_sauvegarde(text,uuid)',
    'sa_revoquer_sessions(text,uuid)', 'sa_incident_creer(text,text,text,text,text)', 'sa_incident_maj(text,uuid,text)',
    'sa_audit(text,text,text,jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
