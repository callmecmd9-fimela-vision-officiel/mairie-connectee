-- LOT 17 : paiement mobile réel (Wave / Orange Money) et rapprochement des taxes. PROPOSÉE, non appliquée. Idempotente.
-- Prérequis : 20261203000200 (lot 15), 20261203000400 (lot 16) et 20261202001800 (quittances, séquence quittances_num_seq).
--
-- Principe de sécurité : le citoyen n'a JAMAIS le droit de marquer un paiement comme confirmé.
--   * initier_paiement_en_ligne (authenticated) : crée une ligne « en_attente » et renvoie le lien du fournisseur ;
--   * confirmer_paiement_mobile / echouer_paiement_mobile : exécutables UNIQUEMENT par service_role, c'est-à-dire par
--     l'Edge Function paiement-webhook, après vérification de la signature (ou du jeton secret) du fournisseur ;
--   * le statut « confirmé » reste la valeur historique 'paye' (utilisée par verifier_quittance, « Mes quittances »,
--     mes_roles_imposition, valider_paiement_especes…) : introduire une seconde valeur casserait ces lectures.
--     Statuts de paiement : en_attente, paye (= confirmé), echoue.

-- 1) Colonnes, contraintes, index d'idempotence ---------------------------------------------------------------------
alter table public.paiements_taxes
  add column if not exists provider text,
  add column if not exists provider_transaction_id text;

alter table public.paiements_taxes drop constraint if exists paiements_taxes_provider_check;
alter table public.paiements_taxes add constraint paiements_taxes_provider_check
  check (provider is null or provider in ('wave', 'orange_money'));

alter table public.paiements_taxes drop constraint if exists paiements_taxes_provider_tx_check;
alter table public.paiements_taxes add constraint paiements_taxes_provider_tx_check
  check (provider_transaction_id is null or char_length(provider_transaction_id) between 3 and 100);

-- NOT VALID : n'examine pas les lignes existantes (aucune ne porte 'echoue'), mais contrôle toute écriture à venir.
alter table public.paiements_taxes drop constraint if exists paiements_taxes_statut_check;
alter table public.paiements_taxes add constraint paiements_taxes_statut_check
  check (statut in ('en_attente', 'paye', 'echoue')) not valid;

alter table public.paiements_taxes drop constraint if exists paiements_taxes_source_check;
alter table public.paiements_taxes add constraint paiements_taxes_source_check
  check (source in ('taxe', 'en_ligne_simule', 'guichet', 'en_ligne')) not valid;

-- Un paiement en ligne confirmé porte toujours son fournisseur et son identifiant de transaction.
alter table public.paiements_taxes drop constraint if exists paiements_taxes_en_ligne_confirme_check;
alter table public.paiements_taxes add constraint paiements_taxes_en_ligne_confirme_check
  check (source <> 'en_ligne' or statut <> 'paye' or (provider is not null and provider_transaction_id is not null)) not valid;

-- Idempotence : une transaction du fournisseur ne peut être enregistrée qu'une seule fois.
create unique index if not exists paiements_taxes_provider_tx_uidx
  on public.paiements_taxes(provider_transaction_id) where provider_transaction_id is not null;

-- 2) Liens de paiement par commune et par fournisseur (aucun accès API : service_role / SQL uniquement) --------------
-- url_template accepte {reference} (référence PAY-TAXE-AAAA-NNNNNN, à renvoyer en client_reference) et {montant} (FCFA).
create table if not exists public.paiement_mobile_config(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null references public.communes(id) on delete cascade,
  provider text not null check (provider in ('wave', 'orange_money')),
  url_template text not null check (url_template ~ '^https://[A-Za-z0-9.-]+/' and char_length(url_template) <= 500),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (commune_id, provider)
);
alter table public.paiement_mobile_config enable row level security;
revoke all on public.paiement_mobile_config from public, anon, authenticated;
-- Aucune politique : l'API ne lit ni n'écrit cette table ; seule initier_paiement_en_ligne (SECURITY DEFINER) la lit.

-- 3) Initiation par le citoyen ----------------------------------------------------------------------------------------
create or replace function public.initier_paiement_en_ligne(p_role_id uuid, p_provider text default 'wave')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_prov text := lower(btrim(coalesce(p_provider, '')));
  v_r public.roles_imposition%rowtype;
  v_key text;
  v_p public.paiements_taxes%rowtype;
  v_tpl text;
  v_url text;
  v_objet text;
  v_nom text;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'Les comptes anonymes ne peuvent pas payer.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance.' using errcode = '55000';
  end if;
  if v_prov not in ('wave', 'orange_money') then
    raise exception 'Fournisseur de paiement invalide (wave ou orange_money).' using errcode = '22023';
  end if;

  select * into v_r from public.roles_imposition
   where id = p_role_id and contribuable_id in (select private.mes_contribuables())
     for update;
  if not found then
    raise exception 'Rôle introuvable.' using errcode = 'P0002';
  end if;
  if v_r.statut = 'emise' then
    update public.roles_imposition
       set statut = 'en_attente_paiement',
           reference_avis = 'PAY-TAXE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.avis_taxe_num_seq')::text, 6, '0')
     where id = v_r.id
     returning * into v_r;
  elsif v_r.statut <> 'en_attente_paiement' then
    raise exception 'Ce rôle n''est plus à payer.' using errcode = '55000';
  end if;

  select u.url_template into v_tpl from public.paiement_mobile_config u
   where u.commune_id = v_r.commune_id and u.provider = v_prov and u.actif;
  if v_tpl is null then
    raise exception 'Paiement en ligne indisponible pour cette commune.' using errcode = '55000';
  end if;

  v_key := 'MOB-' || v_r.reference_avis;
  select * into v_p from public.paiements_taxes where commune_id = v_r.commune_id and ref_recu = v_key for update;
  if found then
    if v_p.statut = 'paye' then
      raise exception 'Ce rôle est déjà payé.' using errcode = '55000';
    end if;
    -- nouvelle tentative (autre fournisseur, ou reprise après échec) : on réutilise la même ligne
    update public.paiements_taxes set provider = v_prov, statut = 'en_attente' where id = v_p.id returning * into v_p;
  else
    select left(t.libelle || ' ' || v_r.annee, 150) into v_objet from public.taxes_locales t where t.id = v_r.taxe_id;
    select left(btrim(coalesce(c.prenom, '') || ' ' || c.nom), 120) into v_nom from public.contribuables c where c.id = v_r.contribuable_id;
    insert into public.paiements_taxes(commune_id, citoyen_id, type_taxe, montant, statut, nom, source, provider, ref_recu)
    values (v_r.commune_id, v_uid, v_objet, v_r.montant_du, 'en_attente', v_nom, 'en_ligne', v_prov, v_key)
    returning * into v_p;
  end if;

  v_url := replace(replace(v_tpl, '{reference}', v_r.reference_avis),
                   '{montant}', trim_scale(v_r.montant_du)::text);

  return jsonb_build_object('role_id', v_r.id, 'paiement_id', v_p.id, 'reference', v_r.reference_avis,
                            'provider', v_prov, 'montant_du', v_r.montant_du, 'statut', v_p.statut,
                            'payment_url', v_url);
end $$;

-- Suivi (polling) de l'écran « En attente de confirmation… » : lecture seule, limitée aux rôles du compte.
create or replace function public.statut_paiement_en_ligne(p_role_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_r public.roles_imposition%rowtype;
  v_ps text;
  v_qref text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  select * into v_r from public.roles_imposition
   where id = p_role_id and contribuable_id in (select private.mes_contribuables());
  if not found then
    raise exception 'Rôle introuvable.' using errcode = 'P0002';
  end if;
  select p.statut into v_ps from public.paiements_taxes p
   where p.commune_id = v_r.commune_id and p.ref_recu = 'MOB-' || v_r.reference_avis;
  select p.reference_paiement into v_qref
    from public.quittances q join public.paiements_taxes p on p.id = q.paiement_id
   where q.role_id = v_r.id and v_r.statut = 'payee';
  return jsonb_build_object('role_statut', v_r.statut, 'paiement_statut', v_ps, 'quittance_ref', v_qref);
end $$;

-- 4) Confirmation par le webhook (service_role uniquement) -----------------------------------------------------------
create or replace function public.confirmer_paiement_mobile(p_reference_taxe text, p_provider_tx_id text, p_provider text, p_montant numeric)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ref text := nullif(btrim(coalesce(p_reference_taxe, '')), '');
  v_tx text := nullif(btrim(coalesce(p_provider_tx_id, '')), '');
  v_prov text := lower(btrim(coalesce(p_provider, '')));
  v_r public.roles_imposition%rowtype;
  v_p public.paiements_taxes%rowtype;
  v_key text;
  v_num text;
  v_date timestamptz := now();
  v_pid uuid;
  v_pref text;
  v_objet text;
  v_nom text;
begin
  -- Défense en profondeur : un utilisateur connecté (JWT avec sub) ne confirme jamais un paiement.
  if (select auth.uid()) is not null then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_ref is null or v_ref !~ '^PAY-TAXE-[0-9]{4}-[0-9]{6}$' then
    raise exception 'Référence de taxe invalide.' using errcode = '22023';
  end if;
  if v_tx is null or char_length(v_tx) not between 3 and 100 then
    raise exception 'Identifiant de transaction invalide.' using errcode = '22023';
  end if;
  if v_prov not in ('wave', 'orange_money') then
    raise exception 'Fournisseur invalide.' using errcode = '22023';
  end if;
  if p_montant is null or p_montant <= 0 or p_montant >= 1e13 then
    raise exception 'Montant invalide.' using errcode = '22023';
  end if;

  -- Verrou du rôle : deux webhooks simultanés pour la même taxe sont sérialisés.
  select * into v_r from public.roles_imposition where reference_avis = v_ref for update;
  if not found then
    raise exception 'Référence de taxe introuvable.' using errcode = 'P0002';
  end if;
  v_key := 'MOB-' || v_ref;

  -- Idempotence : transaction déjà enregistrée => succès, rien n'est recréé.
  select * into v_p from public.paiements_taxes where provider_transaction_id = v_tx;
  if found then
    if v_p.ref_recu is distinct from v_key then
      insert into public.audit_log(commune_id, user_id, action, table_name, row_id)
      values (v_r.commune_id, null, 'PAIEMENT_MOBILE_TX_CONFLIT', 'roles_imposition', v_r.id);
      return jsonb_build_object('succes', false, 'code', 'transaction_deja_utilisee');
    end if;
    return jsonb_build_object('succes', true, 'deja_traite', true, 'num_quittance', v_p.num_quittance,
                              'reference_paiement', v_p.reference_paiement,
                              'quittance_url', v_p.quittance_url);
  end if;

  if v_r.statut = 'payee' then
    -- Rôle déjà soldé (ex. encaissé au guichet entre-temps) : l'argent du fournisseur est à rembourser, à traiter à la main.
    insert into public.audit_log(commune_id, user_id, action, table_name, row_id)
    values (v_r.commune_id, null, 'PAIEMENT_MOBILE_DOUBLON', 'roles_imposition', v_r.id);
    return jsonb_build_object('succes', false, 'code', 'deja_payee');
  end if;
  if v_r.statut not in ('emise', 'en_attente_paiement') then
    insert into public.audit_log(commune_id, user_id, action, table_name, row_id)
    values (v_r.commune_id, null, 'PAIEMENT_MOBILE_ROLE_NON_PAYABLE', 'roles_imposition', v_r.id);
    return jsonb_build_object('succes', false, 'code', 'role_non_payable');
  end if;

  -- Le montant doit correspondre EXACTEMENT au montant dû.
  if p_montant <> v_r.montant_du then
    insert into public.audit_log(commune_id, user_id, action, table_name, row_id)
    values (v_r.commune_id, null, 'PAIEMENT_MOBILE_MONTANT_INCORRECT', 'roles_imposition', v_r.id);
    return jsonb_build_object('succes', false, 'code', 'montant_incorrect', 'attendu', v_r.montant_du, 'recu', p_montant);
  end if;

  v_num := 'QUIT-' || to_char(v_date, 'YYYY') || '-' || lpad(nextval('public.quittances_num_seq')::text, 6, '0');

  select * into v_p from public.paiements_taxes where commune_id = v_r.commune_id and ref_recu = v_key for update;
  if found then
    update public.paiements_taxes
       set statut = 'paye', source = 'en_ligne', provider = v_prov, provider_transaction_id = v_tx,
           num_quittance = v_num, date_paiement = v_date
     where id = v_p.id
     returning id, reference_paiement into v_pid, v_pref;
  else
    select left(t.libelle || ' ' || v_r.annee, 150) into v_objet from public.taxes_locales t where t.id = v_r.taxe_id;
    select left(btrim(coalesce(c.prenom, '') || ' ' || c.nom), 120) into v_nom from public.contribuables c where c.id = v_r.contribuable_id;
    insert into public.paiements_taxes(commune_id, type_taxe, montant, statut, nom, source, provider, provider_transaction_id, ref_recu, num_quittance)
    values (v_r.commune_id, v_objet, v_r.montant_du, 'paye', v_nom, 'en_ligne', v_prov, v_tx, v_key, v_num)
    returning id, reference_paiement into v_pid, v_pref;
  end if;
  update public.paiements_taxes set quittance_url = '/quittance?ref=' || v_pref where id = v_pid;

  insert into public.quittances(commune_id, role_id, paiement_id, num_quittance, montant, source, ref_recu, emise_par)
  values (v_r.commune_id, v_r.id, v_pid, v_num, v_r.montant_du, 'en_ligne', v_key, null);

  update public.roles_imposition set statut = 'payee' where id = v_r.id;

  insert into public.audit_log(commune_id, user_id, action, table_name, row_id)
  values (v_r.commune_id, null, 'CONFIRMER_PAIEMENT_MOBILE', 'paiements_taxes', v_pid);

  return jsonb_build_object('succes', true, 'deja_traite', false, 'num_quittance', v_num,
                            'reference_paiement', v_pref, 'quittance_url', '/quittance?ref=' || v_pref);
end $$;

-- Échec annoncé par le fournisseur : la ligne passe à « echoue » (le citoyen peut réessayer). Jamais sur un paiement confirmé.
create or replace function public.echouer_paiement_mobile(p_reference_taxe text, p_provider text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ref text := nullif(btrim(coalesce(p_reference_taxe, '')), '');
  v_prov text := lower(btrim(coalesce(p_provider, '')));
  v_n int;
begin
  if (select auth.uid()) is not null then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  if v_ref is null or v_ref !~ '^PAY-TAXE-[0-9]{4}-[0-9]{6}$' or v_prov not in ('wave', 'orange_money') then
    raise exception 'Paramètres invalides.' using errcode = '22023';
  end if;
  update public.paiements_taxes
     set statut = 'echoue'
   where ref_recu = 'MOB-' || v_ref and statut = 'en_attente' and provider = v_prov;
  get diagnostics v_n = row_count;
  return jsonb_build_object('succes', true, 'mis_a_jour', v_n);
end $$;

-- 5) Droits -----------------------------------------------------------------------------------------------------------
revoke all on function public.initier_paiement_en_ligne(uuid, text) from public, anon;
grant execute on function public.initier_paiement_en_ligne(uuid, text) to authenticated;
revoke all on function public.statut_paiement_en_ligne(uuid) from public, anon;
grant execute on function public.statut_paiement_en_ligne(uuid) to authenticated;

revoke all on function public.confirmer_paiement_mobile(text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.confirmer_paiement_mobile(text, text, text, numeric) to service_role;
revoke all on function public.echouer_paiement_mobile(text, text) from public, anon, authenticated;
grant execute on function public.echouer_paiement_mobile(text, text) to service_role;

-- 6) Contrôle : la migration échoue si un utilisateur de l'API peut confirmer un paiement
do $$
begin
  if has_function_privilege('authenticated', 'public.confirmer_paiement_mobile(text,text,text,numeric)', 'execute')
     or has_function_privilege('anon', 'public.confirmer_paiement_mobile(text,text,text,numeric)', 'execute')
     or has_function_privilege('authenticated', 'public.echouer_paiement_mobile(text,text)', 'execute')
     or has_function_privilege('anon', 'public.echouer_paiement_mobile(text,text)', 'execute') then
    raise exception 'Fermeture incomplète : la confirmation de paiement mobile est exécutable par l''API publique.';
  end if;
  if has_table_privilege('authenticated', 'public.paiement_mobile_config', 'select')
     or has_table_privilege('anon', 'public.paiement_mobile_config', 'select') then
    raise exception 'Fermeture incomplète : paiement_mobile_config est lisible par l''API publique.';
  end if;
end $$;
