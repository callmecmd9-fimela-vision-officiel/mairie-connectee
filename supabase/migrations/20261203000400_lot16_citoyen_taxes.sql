-- LOT 16 : « Mes Taxes » (portail citoyen). Prérequis : 20261203000200 (lot 15). Idempotente. PROPOSÉE, non appliquée.
-- Version 000400 : 000300 est déjà prise par fix_rls_demandes_citoyen (une version Supabase doit être unique).
-- Aucune politique de lecture citoyenne n'est ajoutée sur les tables fiscales : le citoyen passe uniquement par les RPC ci-dessous.

alter table public.contribuables add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists contribuables_user_idx on public.contribuables(user_id) where user_id is not null;

-- Le rattachement à un compte n'est jamais modifiable par l'API (SQL / service_role uniquement).
create or replace function public.contribuables_garde_user_id() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon','authenticated')
     and new.user_id is distinct from (case when tg_op = 'UPDATE' then old.user_id end) then
    raise exception 'Le rattachement à un compte citoyen n''est pas modifiable.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.contribuables_garde_user_id() from public, anon, authenticated;
drop trigger if exists trg_contribuables_user_id on public.contribuables;
create trigger trg_contribuables_user_id before insert or update on public.contribuables
  for each row execute function public.contribuables_garde_user_id();

alter table public.roles_imposition add column if not exists reference_avis text unique;
alter table public.roles_imposition drop constraint if exists roles_imposition_statut_check;
alter table public.roles_imposition add constraint roles_imposition_statut_check
  check (statut in ('emise','en_attente_paiement','payee','annulee'));
create sequence if not exists public.avis_taxe_num_seq as bigint start 1;
revoke all on sequence public.avis_taxe_num_seq from public, anon, authenticated;

-- Numéro sénégalais ramené à 9 chiffres ; null si le format est ambigu.
create or replace function private.tel_sn(p text) returns text
language sql immutable set search_path = '' as $$
  select case when d ~ '^[0-9]{9}$' then d when d ~ '^(00)?221[0-9]{9}$' then right(d, 9) end
    from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s
$$;

-- Contribuables du compte connecté : lien explicite, sinon téléphone VÉRIFIÉ.
-- Le repli est refusé si plusieurs fiches de la commune portent ce numéro (jamais de données d'un tiers).
create or replace function private.mes_contribuables() returns setof uuid
language sql stable security definer set search_path = '' as $$
  with moi as (
    select u.id, case when u.phone_confirmed_at is not null then private.tel_sn(u.phone) end as tel
      from auth.users u
     where u.id = (select auth.uid())
       and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  )
  select c.id from public.contribuables c, moi where c.user_id = moi.id
  union
  select c.id from public.contribuables c, moi
   where c.user_id is null and moi.tel is not null and private.tel_sn(c.telephone) = moi.tel
     and (select count(*) from public.contribuables x
           where x.commune_id = c.commune_id and private.tel_sn(x.telephone) = moi.tel) = 1
$$;
revoke all on function private.tel_sn(text) from public, anon, authenticated;
revoke all on function private.mes_contribuables() from public, anon, authenticated;

create or replace function public.mes_roles_imposition()
returns table(id uuid, commune_slug text, libelle text, annee int, montant_du numeric, statut text, reference_avis text, quittance_ref text)
language sql stable security definer set search_path = '' as $$
  select r.id, co.slug::text, t.libelle, r.annee, r.montant_du, r.statut, r.reference_avis, p.reference_paiement::text
    from public.roles_imposition r
    join public.taxes_locales t on t.id = r.taxe_id
    join public.communes co on co.id = r.commune_id
    left join public.quittances q on q.role_id = r.id and r.statut = 'payee'
    left join public.paiements_taxes p on p.id = q.paiement_id
   where r.contribuable_id in (select private.mes_contribuables()) and r.statut <> 'annulee'
   order by r.annee desc, r.created_at desc
$$;

create or replace function public.initier_paiement_taxe(p_role_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.roles_imposition%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance.' using errcode = '55000';
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
  return (select jsonb_build_object('reference', v_r.reference_avis, 'role_id', v_r.id, 'libelle', t.libelle,
            'annee', v_r.annee, 'montant_du', v_r.montant_du, 'statut', v_r.statut)
            from public.taxes_locales t where t.id = v_r.taxe_id);
end $$;

revoke all on function public.mes_roles_imposition() from public, anon;
grant execute on function public.mes_roles_imposition() to authenticated;
revoke all on function public.initier_paiement_taxe(uuid) from public, anon;
grant execute on function public.initier_paiement_taxe(uuid) to authenticated;

-- Encaissement au guichet : accepte aussi les rôles « en attente de paiement ».
create or replace function public.payer_role_imposition(p_role_id uuid, p_montant numeric)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_commune uuid := (select private.my_commune());
  v_r public.roles_imposition%rowtype;
  v_objet text;
  v_nom text;
  v_pid uuid;
  v_num text;
  v_ref text;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) is distinct from 'finances' then
    raise exception 'Accès refusé : seul le rôle « finances » peut encaisser.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance : encaissement impossible.' using errcode = '55000';
  end if;

  select * into v_r from public.roles_imposition where id = p_role_id for update;
  if not found or v_r.commune_id is distinct from v_commune then
    raise exception 'Rôle introuvable.' using errcode = 'P0002';
  end if;
  if v_r.statut not in ('emise','en_attente_paiement') then
    raise exception 'Encaissement refusé : le rôle n''est pas au statut « émis » (statut actuel : %).', v_r.statut using errcode = '55000';
  end if;
  if p_montant is null or p_montant <> v_r.montant_du then
    raise exception 'Le montant encaissé doit être égal au montant dû (%).', v_r.montant_du using errcode = '22023';
  end if;

  select left(t.libelle || ' ' || v_r.annee, 150) into v_objet from public.taxes_locales t where t.id = v_r.taxe_id;
  select left(btrim(coalesce(c.prenom, '') || ' ' || c.nom), 120) into v_nom from public.contribuables c where c.id = v_r.contribuable_id;

  insert into public.paiements_taxes(commune_id, type_taxe, montant, statut, nom, source, agent_id, ref_recu)
  values (v_commune, v_objet, p_montant, 'paye', v_nom, 'guichet', v_uid, 'ROLE-' || v_r.id)
  returning id, num_quittance, reference_paiement into v_pid, v_num, v_ref;
  update public.paiements_taxes set quittance_url = '/quittance?ref=' || v_ref where id = v_pid;

  insert into public.quittances(commune_id, role_id, paiement_id, num_quittance, montant, source, ref_recu, emise_par)
  values (v_commune, v_r.id, v_pid, v_num, p_montant, 'guichet', 'ROLE-' || v_r.id, v_uid);

  update public.roles_imposition set statut = 'payee' where id = v_r.id;

  return jsonb_build_object('num_quittance', v_num, 'reference_paiement', v_ref, 'quittance_url', '/quittance?ref=' || v_ref);
end $$;
