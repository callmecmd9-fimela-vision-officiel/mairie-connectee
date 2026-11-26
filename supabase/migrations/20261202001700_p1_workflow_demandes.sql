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
