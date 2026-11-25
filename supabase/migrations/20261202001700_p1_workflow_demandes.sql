-- P1 Circuit unifié des demandes (loi 2008-12, décret 2023-2161) — PROPOSÉE, non appliquée.
-- Socle : statuts du circuit, historique des changements de statut, registre des retraits, gardes de transition (paiement tracé, retrait enregistré).
-- Adaptations au schéma réel (vérifié en production) :
--   * la table `paiements` (factures) n'a pas de demande_id : le paiement d'une demande est tracé dans public.paiements_taxes (demande_id, statut = 'paye') ;
--   * public.demande_historique (trigger hist_demande) existe déjà et n'est pas modifiée : demandes_historique est la table du circuit (ancien / nouveau statut, acteur, motif) ;
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

-- 3) Historique des changements de statut
create table if not exists public.demandes_historique(
  id bigint generated always as identity primary key,
  commune_id uuid not null references public.communes(id) on delete cascade,
  demande_id uuid not null references public.demandes(id) on delete cascade,
  ancien_statut text,
  nouveau_statut text not null,
  acteur_id uuid references auth.users(id) on delete set null,
  motif text check (motif is null or char_length(motif) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists demandes_historique_demande_idx on public.demandes_historique(demande_id, created_at);
create index if not exists demandes_historique_commune_idx on public.demandes_historique(commune_id);

-- 4) RLS par commune : lecture seule pour le personnel ; aucune écriture directe (triggers et RPC SECURITY DEFINER)
alter table public.registre_retraits enable row level security;
alter table public.demandes_historique enable row level security;
revoke all on public.registre_retraits, public.demandes_historique from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.registre_retraits, public.demandes_historique from authenticated;
grant select on public.registre_retraits, public.demandes_historique to authenticated;

do $$ declare t text; roles text; begin
  foreach t in array array['registre_retraits','demandes_historique'] loop
    -- registre_retraits porte une pièce d'identité : lecture réservée au maire, au secrétariat et aux finances
    roles := case t when 'registre_retraits' then '''maire'',''secretariat'',''finances'''
                    else '''maire'',''adjoint'',''cabinet'',''secretariat'',''finances'',''etat_civil'',''technique'',''agent''' end;
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.my_role()) in (%s) and commune_id = (select private.my_commune()))', t || '_lecture', t, roles);
    execute format('drop policy if exists isolation_commune on public.%I', t);
    execute format('create policy isolation_commune on public.%I as restrictive for all to authenticated using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()))', t);
    execute format('drop policy if exists bloque_anonymes_%s on public.%I', t, t);
    execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
    execute format('drop trigger if exists audit_%s on public.%I', t, t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  end loop;
end $$;

-- 5) Historisation : une ligne par changement de statut (acteur = utilisateur connecté ; motif = motif de rejet ou app.motif_statut)
create or replace function public.demandes_log_statut() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.demandes_historique(commune_id, demande_id, ancien_statut, nouveau_statut, acteur_id, motif)
  values (new.commune_id, new.id, old.statut, new.statut, (select auth.uid()),
          left(coalesce(nullif(current_setting('app.motif_statut', true), ''), case when new.statut = 'rejetee' then new.motif_rejet end), 500));
  return new;
end $$;
revoke all on function public.demandes_log_statut() from public, anon, authenticated;

drop trigger if exists trg_demandes_log_statut on public.demandes;
create trigger trg_demandes_log_statut after update of statut on public.demandes
  for each row when (old.statut is distinct from new.statut) execute function public.demandes_log_statut();

-- 6) Gardes de transition (BEFORE UPDATE) : « paye » exige un paiement tracé ; « retire » exige une ligne du registre des retraits
create or replace function public.demandes_garde_workflow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.statut is distinct from old.statut then
    if new.statut = 'paye' and not exists (
      select 1 from public.paiements_taxes p where p.demande_id = new.id and p.commune_id = new.commune_id and p.statut = 'paye'
    ) then
      raise exception 'Aucun paiement tracé pour cette demande' using errcode = '55000';
    end if;
    if new.statut = 'retire' and not exists (
      select 1 from public.registre_retraits r where r.demande_id = new.id and r.commune_id = new.commune_id
    ) then
      raise exception 'Aucun retrait enregistré dans le registre pour cette demande' using errcode = '55000';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.demandes_garde_workflow() from public, anon, authenticated;

drop trigger if exists trg_demandes_garde_workflow on public.demandes;
create trigger trg_demandes_garde_workflow before update of statut on public.demandes
  for each row execute function public.demandes_garde_workflow();
