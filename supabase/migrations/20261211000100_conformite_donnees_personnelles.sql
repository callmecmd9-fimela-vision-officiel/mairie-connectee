-- Conformité données personnelles (loi sénégalaise 2008-12) — PROPOSÉE, non appliquée. Idempotente.
-- Prérequis : 20261116135125 (citoyens, citoyen_notifications), 20261202001600 (suivi_tokens), 20261203000300 (RLS demandes).
-- Le circuit des demandes (creer_demande, statuts, suivi, traitement) n'est PAS modifié.
-- Aucune donnée personnelle n'est écrite dans les messages d'erreur ni dans les journaux (aucun RAISE NOTICE).

-- 1) Consentements : append-only, écriture uniquement par la RPC enregistrer_consentement.
create table if not exists public.consentements(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, -- preuve conservée sans identité si le compte est supprimé / purgé (sessions anonymes : 2 jours)
  finalite text not null check (char_length(finalite) between 1 and 80),
  version_texte text not null check (char_length(version_texte) between 1 and 40),
  accorde boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists consentements_user_idx on public.consentements(user_id, created_at desc);
create index if not exists consentements_commune_idx on public.consentements(commune_id, created_at desc);
alter table public.consentements enable row level security;
revoke all on public.consentements from public, anon, authenticated;
grant select on public.consentements to authenticated;

-- Le citoyen lit ses propres consentements ; le personnel habilité lit ceux de SA commune uniquement.
drop policy if exists consentements_proprietaire on public.consentements;
create policy consentements_proprietaire on public.consentements for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists consentements_commune on public.consentements;
create policy consentements_commune on public.consentements for select to authenticated
  using (commune_id::text = (select private.my_commune())::text and (select private.my_role()) in ('maire', 'admin_mairie'));

create or replace function public.enregistrer_consentement(p_commune text, p_finalite text, p_version text, p_accorde boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); c uuid; i uuid;
begin
  if u is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_accorde is null or coalesce(btrim(p_finalite), '') = '' or coalesce(btrim(p_version), '') = '' then
    raise exception 'Paramètres invalides' using errcode = '22023';
  end if;
  select id into c from public.communes where slug = p_commune;
  if c is null then raise exception 'Commune inconnue' using errcode = '22023'; end if;
  insert into public.consentements(commune_id, user_id, finalite, version_texte, accorde)
  values (c, u, left(btrim(p_finalite), 80), left(btrim(p_version), 40), p_accorde) returning id into i;
  return i;
end $$;
revoke all on function public.enregistrer_consentement(text, text, text, boolean) from public, anon;
grant execute on function public.enregistrer_consentement(text, text, text, boolean) to authenticated;

-- 2) Durées de conservation (paramètres globaux non personnels ; modifiables par migration / service_role uniquement).
create table if not exists public.durees_conservation(
  type_donnee text primary key check (char_length(type_donnee) between 1 and 60),
  mois integer not null check (mois > 0)
);
alter table public.durees_conservation enable row level security;
revoke all on public.durees_conservation from public, anon, authenticated;
grant select on public.durees_conservation to authenticated;
drop policy if exists durees_lecture on public.durees_conservation;
create policy durees_lecture on public.durees_conservation for select to authenticated using (true);
-- Valeurs par défaut à faire valider par chaque commune (voir docs/registre-traitements.md).
insert into public.durees_conservation(type_donnee, mois) values
  ('demande_cloturee', 60), ('notification_citoyen', 12), ('consentement', 60)
on conflict (type_donnee) do nothing;

-- Une demande est « clôturée » quand son circuit est terminé (mêmes statuts que « terminées » côté citoyen, plus « retire »).
create or replace function private.demande_est_close(p_statut text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_statut in ('traitee', 'redirigee', 'cloturee', 'rejetee', 'retire'), false)
$$;
revoke all on function private.demande_est_close(text) from public, anon, authenticated;

-- 3) Export des données du compte connecté (jamais celles d'un tiers : tout est filtré sur auth.uid()).
create or replace function public.exporter_mes_donnees() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid());
begin
  if u is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'genere_le', now(),
    'profil', coalesce((
      select jsonb_build_object('user_id', a.id, 'email', a.email, 'telephone', a.phone, 'nom', c.nom, 'prenom', c.prenom,
                                'village', c.village, 'compte_cree_le', a.created_at)
        from auth.users a left join public.citoyens c on c.user_id = a.id where a.id = u), '{}'::jsonb),
    'demandes', coalesce((
      select jsonb_agg(jsonb_build_object('numero', d.numero, 'num_suivi', d.num_suivi, 'type', d.type, 'objet', d.objet,
               'message', d.message, 'nom', d.nom, 'contact', d.contact, 'statut', d.statut, 'pieces', d.pieces,
               'commune_id', d.commune_id, 'cree_le', d.created_at) order by d.created_at)
        from public.demandes d where d.citoyen_id = u), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object('titre', n.titre, 'corps', n.corps, 'lu', n.lu, 'demande_id', n.demande_id,
               'commune_id', n.commune_id, 'cree_le', n.created_at) order by n.created_at)
        from public.citoyen_notifications n where n.user_id = u), '[]'::jsonb),
    'consentements', coalesce((
      select jsonb_agg(jsonb_build_object('finalite', k.finalite, 'version_texte', k.version_texte, 'accorde', k.accorde,
               'commune_id', k.commune_id, 'cree_le', k.created_at) order by k.created_at)
        from public.consentements k where k.user_id = u), '[]'::jsonb)
  );
end $$;
revoke all on function public.exporter_mes_donnees() from public, anon;
grant execute on function public.exporter_mes_donnees() to authenticated;

-- 4) Suppression du compte : anonymise nom / contact / pièces des demandes clôturées, détache toutes les demandes du compte,
--    puis supprime le compte (cascade : citoyens, notifications ; consentements : user_id mis à NULL, la preuve reste sans identité). Numéros et statuts sont conservés.
--    Les demandes encore en cours gardent nom/contact (instruction en cours) jusqu'à la purge par durée de conservation.
create or replace function public.supprimer_mes_donnees() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); n_anon integer; n_det integer;
begin
  if u is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  delete from public.suivi_tokens t using public.demandes d
   where t.demande_id = d.id and d.citoyen_id = u and private.demande_est_close(d.statut);
  update public.demandes set nom = 'Anonymisé', contact = null, pieces = '{}'
   where citoyen_id = u and private.demande_est_close(statut);
  get diagnostics n_anon = row_count;
  update public.demandes set citoyen_id = null where citoyen_id = u;
  get diagnostics n_det = row_count;
  delete from auth.users where id = u;
  return jsonb_build_object('demandes_anonymisees', n_anon, 'demandes_conservees_en_cours', n_det - n_anon);
end $$;
revoke all on function public.supprimer_mes_donnees() from public, anon;
grant execute on function public.supprimer_mes_donnees() to authenticated;

-- 5) Purge par durée de conservation, branchée sur la maintenance serveur existante (pg_cron, comme private.purge_anonymes).
--    Les pièces des demandes anonymisées deviennent orphelines : la purge hebdomadaire existante (purge-pieces) les supprime du stockage.
create or replace function private.purge_donnees_expirees() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m integer; n_dem integer := 0; n_not integer := 0; n_con integer := 0;
begin
  select mois into m from public.durees_conservation where type_donnee = 'demande_cloturee';
  if m is not null then
    delete from public.suivi_tokens t using public.demandes d
     where t.demande_id = d.id and private.demande_est_close(d.statut)
       and coalesce(d.updated_at, d.created_at) < now() - make_interval(months => m);
    update public.demandes d set nom = 'Anonymisé', contact = null, pieces = '{}'
     where private.demande_est_close(d.statut)
       and (d.nom is distinct from 'Anonymisé' or d.contact is not null or cardinality(d.pieces) > 0)
       and coalesce(d.updated_at, d.created_at) < now() - make_interval(months => m);
    get diagnostics n_dem = row_count;
  end if;
  select mois into m from public.durees_conservation where type_donnee = 'notification_citoyen';
  if m is not null then
    delete from public.citoyen_notifications where created_at < now() - make_interval(months => m);
    get diagnostics n_not = row_count;
  end if;
  select mois into m from public.durees_conservation where type_donnee = 'consentement';
  if m is not null then
    delete from public.consentements where created_at < now() - make_interval(months => m);
    get diagnostics n_con = row_count;
  end if;
  return jsonb_build_object('demandes_anonymisees', n_dem, 'notifications_supprimees', n_not, 'consentements_supprimes', n_con);
end $$;
revoke all on function private.purge_donnees_expirees() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-conservation';
    perform cron.schedule('purge-conservation', '45 3 * * *', 'select private.purge_donnees_expirees()');
  end if;
end $$;
