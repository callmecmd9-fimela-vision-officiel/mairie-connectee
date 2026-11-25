-- P1 Circuit des demandes : RPC d'encaissement avec quittance numérotée (QUIT-YYYY-NNNNNN) — PROPOSÉE, non appliquée.
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
