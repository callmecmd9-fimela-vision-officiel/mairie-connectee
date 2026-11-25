-- LOT 13 : Services territoriaux (infrastructures communales et actions par domaine)
-- Deux nouvelles tables (aucune table existante n'est modifiée) : territoire_infrastructures et territoire_actions.
-- Domaines communs aux deux tables : education, sante, environnement, urbanisme, developpement.
-- Isolation : chaque commune ne voit et ne modifie que ses propres données (private.my_commune()).
-- Rôles : lecture maire, adjoint, cabinet, secrétariat, technique, finances ; écriture maire, adjoint, secrétariat, technique.
-- Migration idempotente : peut être rejouée sans erreur.

-- 1) Infrastructures communales
create table if not exists public.territoire_infrastructures(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  categorie text not null check (categorie in ('education','sante','environnement','urbanisme','developpement')),
  nom text not null check (char_length(btrim(nom)) between 1 and 200),
  localisation text check (char_length(localisation) <= 200),
  etat text not null default 'bon' check (etat in ('bon','moyen','mauvais','hors_service')),
  gestionnaire text check (char_length(gestionnaire) <= 200),
  details text check (char_length(details) <= 3000),
  created_at timestamptz not null default now()
);

-- 2) Actions menées par domaine
create table if not exists public.territoire_actions(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  categorie text not null check (categorie in ('education','sante','environnement','urbanisme','developpement')),
  objet text not null check (char_length(btrim(objet)) between 1 and 300),
  date_debut date,
  date_fin date,
  statut text not null default 'planifiee' check (statut in ('planifiee','en_cours','terminee','suspendue','annulee')),
  description text check (char_length(description) <= 3000),
  created_at timestamptz not null default now(),
  check (date_fin is null or date_debut is null or date_fin >= date_debut)
);

create index if not exists territoire_infrastructures_commune_idx on public.territoire_infrastructures(commune_id, categorie);
create index if not exists territoire_actions_commune_idx on public.territoire_actions(commune_id, categorie);

-- 3) RLS
alter table public.territoire_infrastructures enable row level security;
alter table public.territoire_actions enable row level security;

revoke all on public.territoire_infrastructures, public.territoire_actions from anon;

do $$ declare t text; begin
  foreach t in array array['territoire_infrastructures','territoire_actions'] loop
    -- Lecture : maire, adjoint, cabinet, secrétariat, technique, finances, de la commune uniquement
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.my_role()) in (''maire'',''adjoint'',''cabinet'',''secretariat'',''technique'',''finances'') and commune_id = (select private.my_commune()))', t || '_lecture', t);
    -- Écriture : maire, adjoint, secrétariat, technique, de la commune uniquement
    execute format('drop policy if exists %I on public.%I', t || '_creation', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.my_role()) in (''maire'',''adjoint'',''secretariat'',''technique'') and commune_id = (select private.my_commune()))', t || '_creation', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.my_role()) in (''maire'',''adjoint'',''secretariat'',''technique'') and commune_id = (select private.my_commune())) with check ((select private.my_role()) in (''maire'',''adjoint'',''secretariat'',''technique'') and commune_id = (select private.my_commune()))', t || '_modification', t);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.my_role()) in (''maire'',''adjoint'',''secretariat'',''technique'') and commune_id = (select private.my_commune()))', t || '_suppression', t);
    -- Garde-fous communs aux autres tables : isolation stricte, comptes anonymes bloqués, maintenance serveur, super_admin sans écriture, audit
    execute format('drop policy if exists isolation_commune on public.%I', t);
    execute format('create policy isolation_commune on public.%I as restrictive for all to authenticated using (commune_id = (select private.my_commune())) with check (commune_id = (select private.my_commune()))', t);
    execute format('drop policy if exists bloque_anonymes_%s on public.%I', t, t);
    execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
    execute format('drop policy if exists maintenance_serveur on public.%I', t);
    execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
    execute format('drop policy if exists sa_no_insert on public.%I', t);
    execute format('create policy sa_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_super_admin())', t);
    execute format('drop policy if exists sa_no_update on public.%I', t);
    execute format('create policy sa_no_update on public.%I as restrictive for update to authenticated using (not public.is_super_admin()) with check (not public.is_super_admin())', t);
    execute format('drop policy if exists sa_no_delete on public.%I', t);
    execute format('create policy sa_no_delete on public.%I as restrictive for delete to authenticated using (not public.is_super_admin())', t);
    execute format('drop trigger if exists audit_%s on public.%I', t, t);
    execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  end loop;
end $$;
