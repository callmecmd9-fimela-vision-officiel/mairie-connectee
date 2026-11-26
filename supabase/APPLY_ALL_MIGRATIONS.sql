-- APPLY_ALL_MIGRATIONS.sql : copie consolidée des migrations 20261202001600 à 20261202002000, ordre numérique strict, une seule transaction.
-- ÉTAT : ces 5 migrations sont DÉJÀ APPLIQUÉES en production (2026-11-26, voir PRODUCTION_VERSION_MAP.md) : ne pas rejouer. Conservé pour un nouvel environnement.
-- Contenu de chaque migration copié à l'identique. Toute erreur => ROLLBACK complet (voir DEPLOYMENT_STEPS.md).
BEGIN;

-- MIGRATION : 20261202001600_p1_suivi_demandes.sql
-- P1 Suivi anonyme des demandes citoyennes (loi 2008-12 : aucun compte obligatoire) — APPLIQUÉE en production (2026-11-26).
-- Version 001600 : la version 20261202001500 est déjà utilisée (p1_fix_paiements_taxes_citoyen_fk, appliquée en production).
-- Socle : numéro de suivi FIM-YYYY-NNNNNN, jetons de suivi, vue publique sans donnée personnelle, RPC de consultation (numéro + téléphone).
-- Les numéros existants (colonne `numero`) ne sont pas modifiés ; les demandes déjà en base n'ont pas de num_suivi (pas de rétro-remplissage ici).
-- Idempotente : peut être rejouée sans erreur.

-- 1) Colonnes de suivi (lieu_retrait ajouté car exposé par la vue demandée et absent de public.demandes)
alter table public.demandes
  add column if not exists num_suivi text unique,
  add column if not exists montant_du numeric(12,2),
  add column if not exists lieu_retrait text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'demandes_montant_du_check' and conrelid = 'public.demandes'::regclass) then
    alter table public.demandes add constraint demandes_montant_du_check check (montant_du is null or montant_du >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'demandes_lieu_retrait_check' and conrelid = 'public.demandes'::regclass) then
    alter table public.demandes add constraint demandes_lieu_retrait_check check (lieu_retrait is null or char_length(lieu_retrait) <= 200);
  end if;
end $$;

-- 2) Séquence + trigger : num_suivi généré à l'INSERT (jamais choisi par le client), immuable ensuite
create sequence if not exists public.demandes_num_suivi_seq as bigint minvalue 1 start 1;
revoke all on sequence public.demandes_num_suivi_seq from public, anon, authenticated;

create or replace function public.demandes_set_num_suivi() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.num_suivi := 'FIM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.demandes_num_suivi_seq')::text, 6, '0');
  elsif old.num_suivi is not null and new.num_suivi is distinct from old.num_suivi then
    raise exception 'Le numéro de suivi est immuable' using errcode = '55000';
  end if;
  return new;
end $$;
revoke all on function public.demandes_set_num_suivi() from public, anon, authenticated;

drop trigger if exists trg_demandes_num_suivi on public.demandes;
create trigger trg_demandes_num_suivi before insert or update of num_suivi on public.demandes
  for each row execute function public.demandes_set_num_suivi();

-- 3) Jetons de suivi (empreintes uniquement : aucun téléphone ni PIN en clair). Aucun accès direct : RLS sans politique + aucun droit client.
create table if not exists public.suivi_tokens(
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references public.demandes(id) on delete cascade,
  telephone_hash text not null check (telephone_hash ~ '^[0-9a-f]{64}$'),
  pin_hash text check (pin_hash is null or char_length(pin_hash) between 20 and 200),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists suivi_tokens_demande_idx on public.suivi_tokens(demande_id);
alter table public.suivi_tokens enable row level security;
revoke all on public.suivi_tokens from public, anon, authenticated;

-- 4) Vue publique : aucune donnée personnelle (ni nom, téléphone, message, pièces, citoyen_id)
create or replace view public.v_suivi_public with (security_invoker = true, security_barrier = true) as
  select d.num_suivi,
         d.statut,
         d.montant_du,
         coalesce(d.updated_at, d.created_at) as date_maj,
         d.lieu_retrait
    from public.demandes d
   where d.num_suivi is not null;

-- 6) Droits : la vue n'est jamais lisible directement par l'API ; seule la RPC l'expose
revoke all on public.v_suivi_public from public, anon, authenticated;

-- 5) RPC : numéro de suivi + téléphone -> état du dossier. Réponse vide (jamais d'erreur) si rien ne correspond : pas d'énumération.
create or replace function public.suivi_public(p_num text, p_tel text)
returns setof public.v_suivi_public
language plpgsql stable security definer set search_path = '' as $$
declare
  n text := upper(btrim(coalesce(p_num, '')));
  digits text := regexp_replace(coalesce(p_tel, ''), '\D', '', 'g');
  h text;
begin
  -- 9 derniers chiffres : « +221 77 123 45 67 », « 77 123 45 67 » et « 771234567 » donnent la même empreinte
  if n !~ '^FIM-[0-9]{4}-[0-9]{6}$' or char_length(digits) < 9 or char_length(digits) > 15 then
    perform pg_sleep(0.5);
    return;
  end if;
  h := encode(extensions.digest(convert_to(right(digits, 9), 'UTF8'), 'sha256'), 'hex');

  return query
    select v.*
      from public.v_suivi_public v
      join public.demandes d on d.num_suivi = v.num_suivi
     where v.num_suivi = n
       and (
         encode(extensions.digest(convert_to(right(regexp_replace(coalesce(d.telephone, ''), '\D', '', 'g'), 9), 'UTF8'), 'sha256'), 'hex') = h
         or exists (select 1 from public.suivi_tokens t where t.demande_id = d.id and t.telephone_hash = h and t.expires_at > now())
       );

  if not found then
    perform pg_sleep(0.5); -- ralentit la recherche par force brute
  end if;
  return;
end $$;

-- Les citoyens sans compte utilisent une session anonyme (rôle authenticated) : les deux rôles reçoivent EXECUTE.
revoke all on function public.suivi_public(text, text) from public;
grant execute on function public.suivi_public(text, text) to anon, authenticated;

-- MIGRATION : 20261202001700_p1_workflow_demandes.sql
-- P1 Circuit unifié des demandes (loi 2008-12, décret 2023-2161) — APPLIQUÉE en production (2026-11-26).
-- Socle : statuts du circuit, registre des retraits, gardes de transition (paiement tracé, retrait enregistré).
-- Adaptations au schéma réel (vérifié en production) :
--   * la table `paiements` (factures) n'a pas de demande_id : le paiement d'une demande est tracé dans public.paiements_taxes (demande_id, statut = 'paye') ;
--   * l'historisation des changements de statut / service reste assurée par le trigger existant hist_demande vers public.demande_historique (non modifiés) : aucune table d'historique supplémentaire n'est créée ici ;
--   * colonne « retiré_at » écrite sans accent : retire_at.
-- Idempotente : peut être rejouée sans erreur.

-- 1) Statuts : liste existante (11 valeurs) + depose, a_payer, paye, en_production, retire
alter table public.demandes drop constraint if exists demandes_statut_check;
alter table public.demandes add constraint demandes_statut_check check (statut = any (array[
  'nouvelle','orientee','en_cours','a_valider','traitee','redirigee','en_attente_pieces','rejetee','cloturee','acceptee','pret_a_retirer',
  'depose','a_payer','paye','en_production','retire'
]));

-- 2) Registre des retraits (créé avant les gardes qui le consultent). Écriture uniquement par la RPC retirer_demande ; jamais modifié ni supprimé.
create table if not exists public.registre_retraits(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  demande_id uuid not null references public.demandes(id) on delete restrict,
  nom_retirant text not null check (char_length(btrim(nom_retirant)) between 2 and 120),
  cni_retirant text not null check (char_length(btrim(cni_retirant)) between 5 and 30),
  agent_id uuid references auth.users(id) on delete set null,
  retire_at timestamptz not null default now(),
  signature_ref text check (signature_ref is null or char_length(signature_ref) <= 200),
  unique (demande_id)
);
create index if not exists registre_retraits_commune_idx on public.registre_retraits(commune_id, retire_at desc);

-- 3) RLS par commune : lecture seule pour le personnel ; aucune écriture directe (RPC SECURITY DEFINER)
alter table public.registre_retraits enable row level security;
revoke all on public.registre_retraits from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.registre_retraits from authenticated;
grant select on public.registre_retraits to authenticated;

drop policy if exists registre_retraits_lecture on public.registre_retraits;
-- registre_retraits porte une pièce d'identité : lecture réservée au maire, au secrétariat et aux finances
create policy registre_retraits_lecture on public.registre_retraits for select to authenticated
  using ((select private.my_role()) in ('maire','secretariat','finances') and commune_id = (select private.my_commune()));

drop policy if exists isolation_commune on public.registre_retraits;
create policy isolation_commune on public.registre_retraits as restrictive for all to authenticated
  using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()));

drop policy if exists bloque_anonymes_registre_retraits on public.registre_retraits;
create policy bloque_anonymes_registre_retraits on public.registre_retraits as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false);

drop trigger if exists audit_registre_retraits on public.registre_retraits;
create trigger audit_registre_retraits after insert or update or delete on public.registre_retraits
  for each row execute function private.audit();

-- 4) Gardes de transition (BEFORE UPDATE), un trigger par règle : « paye » exige un paiement tracé ; « retire » exige une ligne du registre des retraits
create or replace function public.demandes_garde_paye() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.statut = 'paye' and new.statut is distinct from old.statut and not exists (
    select 1 from public.paiements_taxes p where p.demande_id = new.id and p.commune_id = new.commune_id and p.statut = 'paye'
  ) then
    raise exception 'Aucun paiement tracé pour cette demande' using errcode = '55000';
  end if;
  return new;
end $$;
revoke all on function public.demandes_garde_paye() from public, anon, authenticated;

create or replace function public.demandes_garde_retire() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.statut = 'retire' and new.statut is distinct from old.statut and not exists (
    select 1 from public.registre_retraits r where r.demande_id = new.id and r.commune_id = new.commune_id
  ) then
    raise exception 'Aucun retrait enregistré dans le registre pour cette demande' using errcode = '55000';
  end if;
  return new;
end $$;
revoke all on function public.demandes_garde_retire() from public, anon, authenticated;

drop trigger if exists trg_demandes_paye_check on public.demandes;
create trigger trg_demandes_paye_check before update of statut on public.demandes
  for each row execute function public.demandes_garde_paye();

drop trigger if exists trg_demandes_retire_check on public.demandes;
create trigger trg_demandes_retire_check before update of statut on public.demandes
  for each row execute function public.demandes_garde_retire();

-- MIGRATION : 20261202001800_p1_rpc_encaisser_demande.sql
-- P1 Circuit des demandes : RPC d'encaissement avec quittance numérotée (QUIT-YYYY-NNNNNN) — APPLIQUÉE en production (2026-11-26).
-- Nouvelle surcharge encaisser_demande(uuid, numeric, text, text) : l'ancienne encaisser_demande(uuid) reste en place (utilisée par js/paiements-demandes.js).
-- Prérequis : 20261202001600 (colonne demandes.montant_du lue par encaisser_demande, version 001800).
-- Dépend de 20261202001700 (statuts a_payer / paye, garde « paiement tracé »).
-- Adaptations au schéma réel : paiement tracé dans public.paiements_taxes ; table public.quittances créée ici ; le rôle « comptable » n'existe pas
-- dans profiles_role_check (accepté par la RPC pour le jour où il sera créé, sans effet aujourd'hui).
-- Idempotente : peut être rejouée sans erreur.

create sequence if not exists public.quittances_num_seq as bigint minvalue 1 start 1;
revoke all on sequence public.quittances_num_seq from public, anon, authenticated;

alter table public.paiements_taxes
  add column if not exists num_quittance text unique,
  add column if not exists agent_id uuid references auth.users(id) on delete set null,
  add column if not exists ref_recu text check (ref_recu is null or char_length(ref_recu) between 1 and 100);
create unique index if not exists paiements_taxes_ref_recu_uidx on public.paiements_taxes(commune_id, ref_recu) where ref_recu is not null;

-- Numéro de quittance séquentiel, attribué à l'INSERT d'un paiement « paye » s'il n'existe pas déjà (aucun numéro consommé pour un paiement en attente)
create or replace function public.paiements_taxes_set_num_quittance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.num_quittance is null and new.statut = 'paye' then
    new.num_quittance := 'QUIT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quittances_num_seq')::text, 6, '0');
  end if;
  return new;
end $$;
revoke all on function public.paiements_taxes_set_num_quittance() from public, anon, authenticated;

drop trigger if exists trg_ptx_num_quittance on public.paiements_taxes;
create trigger trg_ptx_num_quittance before insert on public.paiements_taxes
  for each row execute function public.paiements_taxes_set_num_quittance();

-- Quittances émises (écriture uniquement par la RPC)
create table if not exists public.quittances(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  demande_id uuid not null references public.demandes(id) on delete restrict,
  paiement_id uuid not null references public.paiements_taxes(id) on delete restrict,
  num_quittance text not null unique check (num_quittance ~ '^QUIT-[0-9]{4}-[0-9]{6}$'),
  montant numeric(15,2) not null check (montant > 0),
  source text not null,
  ref_recu text not null,
  emise_par uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (paiement_id)
);
create index if not exists quittances_commune_idx on public.quittances(commune_id, created_at desc);
create index if not exists quittances_demande_idx on public.quittances(demande_id);

alter table public.quittances enable row level security;
revoke all on public.quittances from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.quittances from authenticated;
grant select on public.quittances to authenticated;

drop policy if exists quittances_lecture on public.quittances;
create policy quittances_lecture on public.quittances for select to authenticated
  using ((select private.my_role()) in ('maire','finances','secretariat') and commune_id = (select private.my_commune()));
drop policy if exists isolation_commune on public.quittances;
create policy isolation_commune on public.quittances as restrictive for all to authenticated
  using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()));
drop policy if exists bloque_anonymes_quittances on public.quittances;
create policy bloque_anonymes_quittances on public.quittances as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false);
drop trigger if exists audit_quittances on public.quittances;
create trigger audit_quittances after insert or update or delete on public.quittances for each row execute function private.audit();

-- RPC : encaisse une demande « a_payer », trace le paiement, émet la quittance et passe la demande à « paye ». Retourne le numéro de quittance.
create or replace function public.encaisser_demande(p_id uuid, p_montant numeric, p_source text, p_ref_recu text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_commune uuid;
  v_d public.demandes%rowtype;
  v_source text := btrim(coalesce(p_source, ''));
  v_ref text := nullif(btrim(coalesce(p_ref_recu, '')), '');
  v_attendu numeric;
  v_pid uuid;
  v_num text;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'Les comptes anonymes ne peuvent pas encaisser.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance : encaissement impossible pour le moment.' using errcode = '55000';
  end if;

  v_role := (select private.my_role());
  v_commune := (select private.my_commune());
  if v_commune is null or v_role is null or v_role not in ('finances', 'comptable') then
    raise exception 'Accès refusé : encaissement réservé aux finances / à la comptabilité.' using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'Identifiant de demande obligatoire.' using errcode = '22023';
  end if;
  if p_montant is null or p_montant <= 0 or p_montant >= 1e13 then
    raise exception 'Montant invalide.' using errcode = '22023';
  end if;
  if v_source not in ('guichet', 'en_ligne_simule') then
    raise exception 'Source de paiement invalide (guichet ou en_ligne_simule).' using errcode = '22023';
  end if;
  if v_ref is null or char_length(v_ref) > 100 then
    raise exception 'Référence du reçu obligatoire (100 caractères maximum).' using errcode = '22023';
  end if;

  select * into v_d from public.demandes where id = p_id for update;
  if not found or v_d.commune_id is distinct from v_commune then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut is distinct from 'a_payer' then
    raise exception 'Encaissement refusé : la demande n''est pas au statut « à payer » (statut actuel : %).', v_d.statut using errcode = '55000';
  end if;

  v_attendu := coalesce(nullif(v_d.montant_du, 0), nullif(v_d.montant, 0));
  if v_attendu is not null and p_montant <> v_attendu then
    raise exception 'Le montant encaissé (%) ne correspond pas au montant dû (%).', p_montant, v_attendu using errcode = '22023';
  end if;

  perform set_config('app.paiement_rpc', '1', true);
  perform set_config('app.motif_statut', 'Encaissement ' || v_source || ' – reçu ' || v_ref, true);

  insert into public.paiements_taxes(commune_id, citoyen_id, type_taxe, montant, statut, demande_id, nom, source, agent_id, ref_recu)
  values (v_d.commune_id, v_d.citoyen_id, coalesce(nullif(v_d.objet, ''), v_d.type), p_montant, 'paye', v_d.id, v_d.nom, v_source, v_uid, v_ref)
  returning id, num_quittance into v_pid, v_num;

  insert into public.quittances(commune_id, demande_id, paiement_id, num_quittance, montant, source, ref_recu, emise_par)
  values (v_d.commune_id, v_d.id, v_pid, v_num, p_montant, v_source, v_ref, v_uid);

  update public.demandes
     set statut = 'paye', statut_paiement = 'paye', mode_paiement = case v_source when 'guichet' then 'guichet' else 'en_ligne' end
   where id = v_d.id;

  return v_num;
end $$;

revoke all on function public.encaisser_demande(uuid, numeric, text, text) from public, anon;
grant execute on function public.encaisser_demande(uuid, numeric, text, text) to authenticated;

-- MIGRATION : 20261202001900_p1_rpc_retirer_demande.sql
-- P1 Circuit des demandes : RPC de retrait du document avec inscription au registre des retraits — APPLIQUÉE en production (2026-11-26).
-- Dépend de 20261202001700 (registre_retraits, statut « retire », garde « retrait enregistré »).
-- Retourne l'identifiant de la ligne du registre. Idempotente : peut être rejouée sans erreur.

create or replace function public.retirer_demande(p_id uuid, p_nom text, p_cni text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_commune uuid;
  v_d public.demandes%rowtype;
  v_nom text := btrim(coalesce(p_nom, ''));
  v_cni text := btrim(coalesce(p_cni, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'Les comptes anonymes ne peuvent pas enregistrer un retrait.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance : retrait impossible pour le moment.' using errcode = '55000';
  end if;

  v_role := (select private.my_role());
  v_commune := (select private.my_commune());
  if v_commune is null or v_role is null or v_role not in ('secretariat', 'finances') then
    raise exception 'Accès refusé : retrait réservé au secrétariat et aux finances.' using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'Identifiant de demande obligatoire.' using errcode = '22023';
  end if;
  if char_length(v_nom) not between 2 and 120 then
    raise exception 'Nom du retirant obligatoire (2 à 120 caractères).' using errcode = '22023';
  end if;
  if char_length(v_cni) not between 5 and 30 then
    raise exception 'Numéro de pièce d''identité obligatoire (5 à 30 caractères).' using errcode = '22023';
  end if;

  select * into v_d from public.demandes where id = p_id for update;
  if not found or v_d.commune_id is distinct from v_commune then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut is distinct from 'pret_a_retirer' then
    raise exception 'Retrait refusé : la demande n''est pas au statut « prêt à retirer » (statut actuel : %).', v_d.statut using errcode = '55000';
  end if;
  if v_d.statut_paiement not in ('paye', 'gratuit') then
    raise exception 'Retrait refusé : paiement requis.' using errcode = '55000';
  end if;

  insert into public.registre_retraits(commune_id, demande_id, nom_retirant, cni_retirant, agent_id)
  values (v_d.commune_id, v_d.id, v_nom, v_cni, v_uid)
  returning id into v_id;

  perform set_config('app.motif_statut', 'Retrait par ' || v_nom, true);
  update public.demandes set statut = 'retire' where id = v_d.id;

  return v_id;
end $$;

revoke all on function public.retirer_demande(uuid, text, text) from public, anon;
grant execute on function public.retirer_demande(uuid, text, text) to authenticated;

-- MIGRATION : 20261202002000_p1_rls_demandes_guichet.sql
-- P1 Guichet : lecture des demandes de toute la commune pour finances, secretariat, agent et maire — APPLIQUÉE en production (2026-11-26).
-- Constat (catalogue de production du 2026-11-19, policies de public.demandes) :
--   * demandes_personnel  PERMISSIVE ALL  to authenticated : private.can(maire, adjoint, cabinet, secretariat, agent, etat_civil, technique, finances, rh)
--       AND commune = private.my_commune() (ou super_admin)
--       AND ( rôle in (maire, adjoint, cabinet, secretariat, agent, super_admin) OR demandes.service = rôle OR (rôle = etat_civil AND type = 'État civil') ).
--     => `finances` ne voit que les demandes dont service = 'finances' : la Caisse (statut a_payer) lui est vide.
--        maire / secretariat / agent voient déjà toutes les demandes de leur commune ; ils sont repris ici pour que la règle « guichet » soit explicite et durable.
--   * demandes_citoyen (SELECT, citoyen_id = auth.uid()) ; RESTRICTIVE : isolation_commune, bloque_anonymes_demandes, maintenance_serveur.
-- demandes_personnel n'est ni supprimée ni modifiée. Les politiques PERMISSIVE se combinent en OR ; les RESTRICTIVE (commune, anonymes, maintenance)
-- s'appliquent en AND et sont compatibles avec ce SELECT (même commune, utilisateur non anonyme, hors maintenance) : aucune ne le bloque.
-- Écriture inchangée : cette politique est SELECT uniquement (l'encaissement et le retrait passent par les RPC SECURITY DEFINER).
-- Condition de commune : private.my_commune() (profiles.commune_id de auth.uid(), SECURITY DEFINER) au lieu d'un sous-select direct sur profiles,
-- pour éviter toute récursion de RLS ; même convention que les autres politiques du dépôt.
-- Idempotente : peut être rejouée sans erreur.

drop policy if exists demandes_guichet on public.demandes;
create policy demandes_guichet on public.demandes
  for select to authenticated
  using (
    (select private.my_role()) in ('finances', 'secretariat', 'agent', 'maire')
    and commune_id = (select private.my_commune())
  );

-- Contrôle après application (à lancer en SQL) :
--   select polname, polcmd, polpermissive from pg_policy where polrelid = 'public.demandes'::regclass order by 1;
--   -- attendu : demandes_guichet (r, permissive) ; demandes_personnel (*) inchangée.
-- NB : aucune politique n'est posée sur demande_historique (déjà couverte par hist_lecture) ; demandes_historique n'existe pas.

COMMIT;
