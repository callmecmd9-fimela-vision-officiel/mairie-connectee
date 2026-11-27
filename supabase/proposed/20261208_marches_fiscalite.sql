-- ======================================================================================================
-- 1) MARCHÉS : mode de passation -> enum PostgreSQL
-- ======================================================================================================
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'mode_passation_marche') then
    create type public.mode_passation_marche as enum ('appel_offres_ouvert','appel_offres_restreint','consultation','gre_a_gre');
  end if;
end $$;

do $$ declare c record; begin
  if (select data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'marches' and column_name = 'mode') = 'text' then
    -- La valeur « Autre » n'a pas d'équivalent : elle est conservée dans les observations avant conversion.
    update public.marches
       set observations = left(coalesce(observations || E'\n', '') || '[Mode de passation d''origine : Autre]', 3000)
     where mode = 'Autre';
    -- Ancien CHECK sur le texte libre
    for c in
      select conname from pg_constraint
       where conrelid = 'public.marches'::regclass and contype = 'c'
         and (conname = 'marches_mode_check' or pg_get_constraintdef(oid) ~* '^check \(+mode[ =)]')
    loop
      execute format('alter table public.marches drop constraint %I', c.conname);
    end loop;
    alter table public.marches alter column mode type public.mode_passation_marche
      using (case mode
               when 'Appel d''offres ouvert' then 'appel_offres_ouvert'
               when 'Appel d''offres restreint' then 'appel_offres_restreint'
               when 'Demande de renseignements et de prix' then 'consultation'
               when 'Gré à gré' then 'gre_a_gre'
               else null
             end)::public.mode_passation_marche;
  end if;
end $$;

alter table public.marches
  add column if not exists seuil_passation numeric(15,2),
  add column if not exists ref_publication_appel text,
  add column if not exists ref_attribution_appel text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'marches_seuil_passation_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_seuil_passation_chk check (seuil_passation is null or seuil_passation >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marches_ref_appel_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_ref_appel_chk
      check ((ref_publication_appel is null or char_length(btrim(ref_publication_appel)) between 1 and 120)
         and (ref_attribution_appel is null or char_length(btrim(ref_attribution_appel)) between 1 and 120));
  end if;
  -- Appel d'offres : référence de publication dès le lancement, référence d'attribution dès l'attribution
  if not exists (select 1 from pg_constraint where conname = 'marches_appel_publication_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_appel_publication_chk
      check (mode is null or mode not in ('appel_offres_ouvert','appel_offres_restreint')
             or statut in ('preparation','annule') or nullif(btrim(ref_publication_appel), '') is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marches_appel_attribution_chk' and conrelid = 'public.marches'::regclass) then
    alter table public.marches add constraint marches_appel_attribution_chk
      check (mode is null or mode not in ('appel_offres_ouvert','appel_offres_restreint')
             or statut not in ('attribue','approuve','en_cours','receptionne') or nullif(btrim(ref_attribution_appel), '') is not null) not valid;
  end if;
end $$;

-- ======================================================================================================
-- 2) FISCALITÉ : NINEA des contribuables (unique par commune)
-- ======================================================================================================
alter table public.contribuables add column if not exists ninea text;

-- Reprise de l'identifiant fiscal existant lorsqu'il a la forme d'un NINEA (un seul contribuable par valeur et par commune)
with c as (
  select id, upper(regexp_replace(identifiant_fiscal, '[\s.\-]', '', 'g')) as v,
         row_number() over (partition by commune_id, upper(regexp_replace(identifiant_fiscal, '[\s.\-]', '', 'g')) order by created_at, id) as rn
    from public.contribuables
   where ninea is null and identifiant_fiscal is not null
     and upper(regexp_replace(identifiant_fiscal, '[\s.\-]', '', 'g')) ~ '^[0-9A-Z]{7,12}$'
)
update public.contribuables t set ninea = c.v from c where c.id = t.id and c.rn = 1;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contribuables_ninea_format_chk' and conrelid = 'public.contribuables'::regclass) then
    alter table public.contribuables add constraint contribuables_ninea_format_chk
      check (ninea is null or ninea ~ '^[0-9A-Z]{7,12}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contribuables_entreprise_ninea_chk' and conrelid = 'public.contribuables'::regclass) then
    alter table public.contribuables add constraint contribuables_entreprise_ninea_chk
      check (type <> 'entreprise' or ninea is not null) not valid;
  end if;
end $$;
create unique index if not exists contribuables_ninea_uidx on public.contribuables(commune_id, ninea) where ninea is not null;

-- ======================================================================================================
-- 3) FISCALITÉ : recettes encaissées -> versement / quittance du Trésor (comptable public)
-- ======================================================================================================
alter table public.paiements_taxes
  add column if not exists statut_tresor text not null default 'a_verser',
  add column if not exists ref_quittance_tresor text,
  add column if not exists date_versement_tresor date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'paiements_taxes_statut_tresor_chk' and conrelid = 'public.paiements_taxes'::regclass) then
    alter table public.paiements_taxes add constraint paiements_taxes_statut_tresor_chk
      check (statut_tresor in ('a_verser','verse','rapproche'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'paiements_taxes_quittance_tresor_chk' and conrelid = 'public.paiements_taxes'::regclass) then
    alter table public.paiements_taxes add constraint paiements_taxes_quittance_tresor_chk
      check ((statut_tresor = 'a_verser' or nullif(btrim(ref_quittance_tresor), '') is not null)
         and (ref_quittance_tresor is null or char_length(btrim(ref_quittance_tresor)) between 1 and 80));
  end if;
end $$;
create unique index if not exists paiements_taxes_quittance_tresor_uidx
  on public.paiements_taxes(commune_id, ref_quittance_tresor) where ref_quittance_tresor is not null;

-- UPDATE direct fermé par 20261202000700 : l'enregistrement de la quittance du Trésor passe par une RPC (rôle « finances » = côté comptable public).
create or replace function public.enregistrer_quittance_tresor(p_paiement_id uuid, p_statut text, p_ref text, p_date date default current_date)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_commune uuid := (select private.my_commune());
  v_p public.paiements_taxes%rowtype;
  v_ref text := nullif(btrim(p_ref), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
     or v_commune is null or (select private.my_role()) is distinct from 'finances' then
    raise exception 'Accès refusé : la quittance du Trésor est enregistrée par le service des finances (comptable public), pas par l''ordonnateur.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance.' using errcode = '55000';
  end if;
  if p_statut is null or p_statut not in ('a_verser','verse','rapproche') then
    raise exception 'Statut Trésor invalide.' using errcode = '22023';
  end if;
  if p_statut <> 'a_verser' and v_ref is null then
    raise exception 'La référence de quittance du Trésor est obligatoire.' using errcode = '22023';
  end if;
  select * into v_p from public.paiements_taxes where id = p_paiement_id and commune_id = v_commune for update;
  if not found then
    raise exception 'Paiement introuvable.' using errcode = 'P0002';
  end if;
  if v_p.statut is distinct from 'paye' then
    raise exception 'Seul un paiement encaissé (statut « payé ») peut être versé au Trésor (statut actuel : %).', v_p.statut using errcode = '55000';
  end if;
  begin
    update public.paiements_taxes
       set statut_tresor = p_statut,
           ref_quittance_tresor = case when p_statut = 'a_verser' then null else v_ref end,
           date_versement_tresor = case when p_statut = 'a_verser' then null else coalesce(p_date, current_date) end
     where id = v_p.id;
  exception when unique_violation then
    raise exception 'Cette quittance du Trésor est déjà rattachée à un autre paiement.' using errcode = '23505';
  end;
  return jsonb_build_object('paiement_id', v_p.id, 'statut_tresor', p_statut, 'ref_quittance_tresor', v_ref);
end $$;
alter function public.enregistrer_quittance_tresor(uuid, text, text, date) owner to postgres;
revoke all on function public.enregistrer_quittance_tresor(uuid, text, text, date) from public, anon;
grant execute on function public.enregistrer_quittance_tresor(uuid, text, text, date) to authenticated;

-- ======================================================================================================
-- 4) DÉPENSES : séparation ordonnateur (Maire) / comptable public (Receveur municipal, Trésor)
--    engage -> liquide -> ordonnance (Maire uniquement) -> paye (finances = comptable public, jamais l'ordonnateur) ; annule avant paiement.
-- ======================================================================================================
alter table public.engagements
  add column if not exists ordonnateur_id uuid references auth.users(id) on delete set null,
  add column if not exists date_ordonnancement date,
  add column if not exists comptable_public text,
  add column if not exists statut_tresor text,
  add column if not exists ref_quittance_tresor text,
  add column if not exists date_paiement_tresor date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'engagements_statut_tresor_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_statut_tresor_chk
      check (statut_tresor is null or statut_tresor in ('a_payer','paye','rejete'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_champs_tresor_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_champs_tresor_chk
      check ((comptable_public is null or char_length(btrim(comptable_public)) between 1 and 150)
         and (ref_quittance_tresor is null or char_length(btrim(ref_quittance_tresor)) between 1 and 80));
  end if;
  -- Un engagement ordonnancé porte son ordonnateur ; un engagement payé porte le comptable public et la quittance du Trésor
  if not exists (select 1 from pg_constraint where conname = 'engagements_ordonnancement_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_ordonnancement_chk
      check (statut not in ('ordonnance','paye') or (ordonnateur_id is not null and date_ordonnancement is not null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'engagements_paiement_tresor_chk' and conrelid = 'public.engagements'::regclass) then
    alter table public.engagements add constraint engagements_paiement_tresor_chk
      check (statut <> 'paye' or (nullif(btrim(comptable_public), '') is not null and statut_tresor = 'paye'
             and nullif(btrim(ref_quittance_tresor), '') is not null and date_paiement_tresor is not null)) not valid;
  end if;
end $$;

create or replace function private.engagements_circuit()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text := (select private.my_role());
  v_ok boolean;
begin
  if tg_op = 'INSERT' then
    if new.statut <> 'engage' then
      raise exception 'Un engagement est créé au statut « engagé ».' using errcode = '55000';
    end if;
    return new;
  end if;

  if new.statut is not distinct from old.statut then
    -- Hors transition, les champs du circuit sont figés (traçabilité comptable)
    if v_uid is not null and (
         (new.ordonnateur_id, new.date_ordonnancement, new.comptable_public, new.statut_tresor, new.ref_quittance_tresor, new.date_paiement_tresor)
         is distinct from
         (old.ordonnateur_id, old.date_ordonnancement, old.comptable_public, old.statut_tresor, old.ref_quittance_tresor, old.date_paiement_tresor)) then
      raise exception 'Les champs d''ordonnancement et de paiement ne se modifient que par changement de statut.' using errcode = '55000';
    end if;
    return new;
  end if;

  v_ok := (old.statut = 'engage' and new.statut in ('liquide','annule'))
       or (old.statut = 'liquide' and new.statut in ('ordonnance','annule'))
       or (old.statut = 'ordonnance' and new.statut in ('paye','annule'));
  if not v_ok then
    raise exception 'Transition de dépense interdite : « % » -> « % » (engagé, liquidé, ordonnancé, payé ; annulation possible avant paiement).', old.statut, new.statut
      using errcode = '55000';
  end if;

  if new.statut = 'ordonnance' then
    if v_uid is not null and v_role is distinct from 'maire' then
      raise exception 'Seul l''ordonnateur (le Maire) peut ordonnancer une dépense.' using errcode = '42501';
    end if;
    new.ordonnateur_id := coalesce(v_uid, new.ordonnateur_id);
    new.date_ordonnancement := coalesce(new.date_ordonnancement, current_date);
    new.statut_tresor := 'a_payer';
  elsif new.statut = 'paye' then
    if v_uid is not null then
      if v_role = 'maire' then
        raise exception 'Le paiement relève du comptable public : l''ordonnateur ne peut pas l''enregistrer.' using errcode = '42501';
      end if;
      if old.ordonnateur_id is not null and old.ordonnateur_id = v_uid then
        raise exception 'L''ordonnateur ne peut pas enregistrer le paiement qu''il a ordonnancé.' using errcode = '42501';
      end if;
    end if;
    if nullif(btrim(new.comptable_public), '') is null or nullif(btrim(new.ref_quittance_tresor), '') is null or new.date_paiement_tresor is null then
      raise exception 'Paiement : comptable public, quittance du Trésor et date de paiement obligatoires.' using errcode = '23514';
    end if;
    new.statut_tresor := 'paye';
  end if;
  return new;
end $$;
revoke all on function private.engagements_circuit() from public, anon, authenticated;

drop trigger if exists trg_engagements_circuit on public.engagements;
create trigger trg_engagements_circuit
  before insert or update on public.engagements
  for each row execute function private.engagements_circuit();
