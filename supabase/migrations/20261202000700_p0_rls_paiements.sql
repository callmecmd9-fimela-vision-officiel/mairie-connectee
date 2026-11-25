-- P0 : fermeture définitive du contournement de la RPC valider_paiement_especes sur public.paiements_taxes.
-- Problème : la politique ptx_staff_upd laissait maire, finances, secretariat et agent passer un paiement de
-- `en_attente` à `paye` par l'API REST (PATCH), sans contrôle de la source.
--
-- Résultat : plus aucun UPDATE direct par l'API pour les utilisateurs connectés ni les anonymes.
-- Seuls peuvent encore modifier le statut :
--   * la RPC public.valider_paiement_especes (SECURITY DEFINER, propriétaire de la table : contourne le RLS) ;
--   * le super_admin / l'exploitation via service_role ou l'éditeur SQL (service_role contourne le RLS).
-- Idempotente : peut être rejouée sans effet si la faille est déjà fermée.

-- 1) Suppression de la politique trop permissive
drop policy if exists ptx_staff_upd on public.paiements_taxes;

-- 2) Retrait des droits UPDATE (niveau table ET niveau colonne) pour les rôles de l'API
revoke update on public.paiements_taxes from anon, authenticated;
do $$
declare c text;
begin
  for c in
    select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'paiements_taxes'
  loop
    execute format('revoke update (%I) on public.paiements_taxes from anon, authenticated', c);
  end loop;
end
$$;

-- 3) Garde-fou : politique restrictive qui refuse tout UPDATE aux rôles de l'API, même si une politique
--    permissive d'UPDATE était réintroduite plus tard par erreur. N'affecte ni la RPC ni service_role.
alter table public.paiements_taxes enable row level security;
drop policy if exists ptx_update_interdit_api on public.paiements_taxes;
create policy ptx_update_interdit_api on public.paiements_taxes
  as restrictive for update to anon, authenticated
  using (false) with check (false);

comment on policy ptx_update_interdit_api on public.paiements_taxes is
  'Aucun UPDATE direct par l''API : le passage à « paye » ne se fait que par valider_paiement_especes (SECURITY DEFINER).';

-- 4) Contrôle : la migration échoue si un droit UPDATE direct subsiste
do $$
begin
  if has_table_privilege('authenticated', 'public.paiements_taxes', 'update')
     or has_any_column_privilege('authenticated', 'public.paiements_taxes', 'update')
     or has_table_privilege('anon', 'public.paiements_taxes', 'update')
     or has_any_column_privilege('anon', 'public.paiements_taxes', 'update') then
    raise exception 'Fermeture incomplète : un droit UPDATE direct subsiste sur paiements_taxes.';
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.paiements_taxes'::regclass and polname = 'ptx_staff_upd') then
    raise exception 'Fermeture incomplète : la politique ptx_staff_upd existe encore.';
  end if;
end
$$;
