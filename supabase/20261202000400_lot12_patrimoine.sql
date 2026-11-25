-- LOT 12 : Patrimoine communal (biens, entretiens, inventaires annuels)
-- Trois nouvelles tables ; la table public.patrimoine (migration 20261115072440, utilisée par js/maire.js) n'est PAS modifiée.
-- Isolation : chaque commune ne voit et ne modifie que ses propres données (private.my_commune()).
-- Rôles (mêmes que public.patrimoine) : lecture maire, adjoint, finances, secrétariat, technique ; écriture maire, secrétariat, technique.
-- patrimoine_entretiens porte aussi commune_id (en plus des colonnes demandées) afin que la RLS, l'audit et l'index
-- fonctionnent comme sur les autres tables ; la cohérence avec le bien parent est garantie par une clé étrangère composite (bien_id, commune_id).
-- Migration idempotente : peut être rejouée sans erreur.

-- 1) Biens du patrimoine
create table if not exists public.patrimoine_biens(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  categorie text not null check (categorie in ('terrain','batiment','vehicule','equipement')),
  nom text not null check (char_length(btrim(nom)) between 1 and 200),
  description text check (char_length(description) <= 3000),
  localisation text check (char_length(localisation) <= 200),
  valeur_estimee numeric(15,2) not null default 0 check (valeur_estimee >= 0),
  statut text not null default 'actif' check (statut in ('actif','en_entretien','hors_service','cede')),
  date_acquisition date,
  created_at timestamptz not null default now(),
  unique (id, commune_id)
);

-- 2) Entretiens et interventions sur un bien
create table if not exists public.patrimoine_entretiens(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  bien_id uuid not null,
  date_intervention date not null default current_date,
  description text not null check (char_length(btrim(description)) between 1 and 3000),
  cout numeric(15,2) not null default 0 check (cout >= 0),
  prestataire text check (char_length(prestataire) <= 200),
  statut text not null default 'planifie' check (statut in ('planifie','en_cours','realise','annule')),
  foreign key (bien_id, commune_id) references public.patrimoine_biens(id, commune_id)
);

-- 3) Inventaires annuels du patrimoine
create table if not exists public.patrimoine_inventaires(
  id uuid primary key default gen_random_uuid(),
  commune_id uuid not null default private.my_commune() references public.communes(id) on delete cascade,
  annee integer not null check (annee between 2000 and 2100),
  date_validation date,
  statut text not null default 'brouillon' check (statut in ('brouillon','en_cours','valide')),
  unique (commune_id, annee),
  check (statut <> 'valide' or date_validation is not null)
);

create index if not exists patrimoine_biens_commune_idx on public.patrimoine_biens(commune_id, categorie);
create index if not exists patrimoine_entretiens_commune_idx on public.patrimoine_entretiens(commune_id);
create index if not exists patrimoine_entretiens_bien_idx on public.patrimoine_entretiens(bien_id);
create index if not exists patrimoine_inventaires_commune_idx on public.patrimoine_inventaires(commune_id);

-- 4) RLS
alter table public.patrimoine_biens enable row level security;
alter table public.patrimoine_entretiens enable row level security;
alter table public.patrimoine_inventaires enable row level security;

revoke all on public.patrimoine_biens, public.patrimoine_entretiens, public.patrimoine_inventaires from anon;
-- Les entretiens ne sont jamais supprimés (traçabilité) : on les annule via le statut.
revoke delete on public.patrimoine_entretiens from authenticated;

do $$ declare t text; begin
  foreach t in array array['patrimoine_biens','patrimoine_entretiens','patrimoine_inventaires'] loop
    -- Lecture : maire, adjoint, finances, secrétariat, technique, de la commune uniquement
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.my_role()) in (''maire'',''adjoint'',''finances'',''secretariat'',''technique'') and commune_id = (select private.my_commune()))', t || '_lecture', t);
    -- Écriture : maire, secrétariat, technique, de la commune uniquement
    execute format('drop policy if exists %I on public.%I', t || '_creation', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.my_role()) in (''maire'',''secretariat'',''technique'') and commune_id = (select private.my_commune()))', t || '_creation', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.my_role()) in (''maire'',''secretariat'',''technique'') and commune_id = (select private.my_commune())) with check ((select private.my_role()) in (''maire'',''secretariat'',''technique'') and commune_id = (select private.my_commune()))', t || '_modification', t);
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

-- Suppression : un bien sans historique d'entretien (la clé étrangère bloque les autres) et un inventaire encore en brouillon
drop policy if exists patrimoine_biens_suppression on public.patrimoine_biens;
create policy patrimoine_biens_suppression on public.patrimoine_biens for delete to authenticated
  using ((select private.my_role()) in ('maire','secretariat','technique') and commune_id = (select private.my_commune()));

drop policy if exists patrimoine_inventaires_suppression on public.patrimoine_inventaires;
create policy patrimoine_inventaires_suppression on public.patrimoine_inventaires for delete to authenticated
  using ((select private.my_role()) in ('maire','secretariat','technique') and commune_id = (select private.my_commune()) and statut = 'brouillon');
