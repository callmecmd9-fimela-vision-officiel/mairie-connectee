-- LOT 7 : portail fiscal et paiement des démarches. Script de garantie, idempotent (rejouable sans effet).
-- Il complète 20261125_demarches_paiements_quittances.sql (triggers, RPC de prix / paiement / encaissement / quittance) : à appliquer APRÈS lui.
-- Tables réelles : public.demandes (= « demandes_services »), isolation par commune_id partout.

-- 1. tarifs_demarches (commune_id, type_service, montant)
create table if not exists public.tarifs_demarches(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 type_service text not null check(char_length(trim(type_service)) between 2 and 120),
 montant numeric not null check(montant>=0 and montant<=10000000),
 updated_at timestamptz not null default now(),
 unique(commune_id,type_service));
alter table public.tarifs_demarches enable row level security;
create index if not exists tarifs_demarches_commune_idx on public.tarifs_demarches(commune_id);

-- 2. paiements_taxes (id, commune_id, citoyen_id, type_taxe, montant, reference_paiement UNIQUE, statut, quittance_url, created_at)
create table if not exists public.paiements_taxes(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 citoyen_id uuid references auth.users(id) on delete set null,
 type_taxe text not null,
 montant numeric not null check(montant>=0),
 reference_paiement text,
 statut text not null default 'en_attente',
 quittance_url text,
 created_at timestamptz not null default now());
alter table public.paiements_taxes
 add column if not exists demande_id uuid references public.demandes(id) on delete set null,
 add column if not exists nom text check(nom is null or char_length(nom)<=120),
 add column if not exists source text not null default 'taxe' check(source in('taxe','en_ligne_simule','guichet')),
 add column if not exists date_paiement timestamptz;
update public.paiements_taxes set reference_paiement='QT-'||upper(replace(gen_random_uuid()::text,'-','')) where reference_paiement is null;
alter table public.paiements_taxes
 alter column reference_paiement set default('QT-'||upper(replace(gen_random_uuid()::text,'-',''))),
 alter column reference_paiement set not null;
create unique index if not exists paiements_taxes_reference_uq on public.paiements_taxes(reference_paiement);
create index if not exists paiements_taxes_commune_idx on public.paiements_taxes(commune_id,created_at desc);
alter table public.paiements_taxes enable row level security;

-- 3. demandes : montant et statut_paiement (+ colonnes liées au paiement)
alter table public.demandes
 add column if not exists montant numeric not null default 0 check(montant>=0),
 add column if not exists statut_paiement text not null default 'non_paye' check(statut_paiement in('non_paye','paye','gratuit')),
 add column if not exists date_limite timestamptz,
 add column if not exists telephone text check(telephone is null or telephone ~ '^\+?[0-9 ]{8,16}$'),
 add column if not exists mode_paiement text check(mode_paiement in('en_ligne','guichet')),
 add column if not exists document_url text check(document_url is null or char_length(document_url)<=200);
create index if not exists demandes_paiement_idx on public.demandes(commune_id,statut_paiement,date_limite);

-- 4. droits de lecture : « Mes quittances » (citoyen : ses propres paiements) et « Recettes » (personnel de SA commune)
drop policy if exists ptx_cit_sel on public.paiements_taxes;
create policy ptx_cit_sel on public.paiements_taxes for select to authenticated using(citoyen_id=(select auth.uid()));
drop policy if exists ptx_staff_sel on public.paiements_taxes;
create policy ptx_staff_sel on public.paiements_taxes for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=paiements_taxes.commune_id and p.role in('maire','finances','secretariat','agent')));
grant select on public.paiements_taxes to authenticated;
-- aucune écriture directe : le prix, la référence et le statut « payé » sont posés par les fonctions du script 20261125
-- (choisir_paiement_demande, encaisser_demande, definir_tarif) ; le client ne décide jamais du montant.

-- 5. contrôle : les fonctions du script 20261125 doivent exister
do $$
declare f text;
begin
 foreach f in array array['choisir_paiement_demande','paiement_demande','tarifs_commune','verifier_quittance','definir_tarif','encaisser_demande'] loop
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=f) then
   raise warning 'Fonction public.% absente : appliquer d''abord 20261125_demarches_paiements_quittances.sql', f;
  end if;
 end loop;
end $$;
