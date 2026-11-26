-- P0 SÉCURITÉ (Loi 2008-12) : un citoyen ne doit jamais lire les demandes d'un autre citoyen, et un visiteur anonyme ne doit lire aucune demande.
-- Le dépôt ne contenait pas la définition de demandes_citoyen (seulement un commentaire du catalogue de production) : elle est ici posée de façon explicite et rejouable.
-- Règles :
--   1. anon / public : aucun droit ni politique sur public.demandes. Suivi d'un dossier précis = RPC suivi_public(p_num, p_tel) (numéro + téléphone) ou suivre_demande (numéro porteur).
--   2. authenticated (citoyen) : SELECT uniquement de ses propres demandes (citoyen_id = auth.uid()), et jamais via une session anonyme.
--   3. Personnel : demandes_personnel et demandes_guichet (migration 20261202002000) inchangées.
--   4. Toute autre politique PERMISSIVE en lecture (SELECT ou ALL) hors liste blanche est supprimée : une seule politique trop large (ex. USING (true)) suffit à exposer toutes les demandes (les PERMISSIVE se combinent en OR).
-- Idempotente : peut être rejouée sans erreur. Les écritures citoyennes passent par les RPC SECURITY DEFINER (creer_demande, completer_demande…) et ne sont pas modifiées.

alter table public.demandes enable row level security;

-- 1) Aucun accès direct pour les visiteurs non authentifiés
revoke all on public.demandes from anon;
revoke all on public.demandes from public;

-- 4) Suppression des politiques de lecture non prévues (rôles anon/public, ou politiques authenticated hors liste blanche)
do $$
declare
  p record;
begin
  for p in
    select pol.polname, pol.polcmd
      from pg_policy pol
     where pol.polrelid = 'public.demandes'::regclass
       and pol.polpermissive
       and pol.polcmd in ('r', '*')
       and pol.polname not in ('demandes_personnel', 'demandes_citoyen', 'demandes_guichet')
  loop
    raise notice 'demandes : politique de lecture non prévue supprimée : %', p.polname;
    execute format('drop policy %I on public.demandes', p.polname);
  end loop;
end $$;

-- 2) Citoyen : uniquement ses propres demandes
drop policy if exists demandes_citoyen on public.demandes;
create policy demandes_citoyen on public.demandes
  for select to authenticated
  using (citoyen_id is not null and citoyen_id = (select auth.uid()));

-- Garde-fou RESTRICTIVE (s'ajoute en AND à toutes les politiques de lecture, personnel compris) : jamais de lecture directe par une session anonyme.
drop policy if exists demandes_select_non_anonyme on public.demandes;
create policy demandes_select_non_anonyme on public.demandes
  as restrictive
  for select to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- Contrôle après application (à lancer en SQL) :
--   select polname, polcmd, polpermissive, pg_get_expr(polqual, polrelid) from pg_policy where polrelid = 'public.demandes'::regclass order by 1;
--   -- attendu en lecture permissive : demandes_citoyen (citoyen_id = auth.uid()), demandes_guichet, demandes_personnel ; restrictives : isolation_commune, bloque_anonymes_demandes, maintenance_serveur, demandes_select_non_anonyme.
--   select has_table_privilege('anon', 'public.demandes', 'select');  -- attendu : false
