-- VERIFY_ALL.sql : lecture seule (SELECT). À lancer après APPLY_ALL_MIGRATIONS.sql. Attendu : « existe » sur toutes les lignes.
-- Les requêtes sont chaînées par UNION ALL : un seul résultat à deux colonnes (objet, statut).

select 'colonne paiements_taxes.num_quittance' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'paiements_taxes' and column_name = 'num_quittance') then 'existe' else 'manquant' end as statut
union all
select 'colonne paiements_taxes.agent_id' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'paiements_taxes' and column_name = 'agent_id') then 'existe' else 'manquant' end as statut
union all
select 'colonne paiements_taxes.ref_recu' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'paiements_taxes' and column_name = 'ref_recu') then 'existe' else 'manquant' end as statut
union all
select 'colonne demandes.num_suivi' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'demandes' and column_name = 'num_suivi') then 'existe' else 'manquant' end as statut
union all
select 'colonne demandes.montant_du' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'demandes' and column_name = 'montant_du') then 'existe' else 'manquant' end as statut
union all
select 'colonne demandes.lieu_retrait' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'demandes' and column_name = 'lieu_retrait') then 'existe' else 'manquant' end as statut
union all
select 'colonne conseillers.user_id' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'conseillers' and column_name = 'user_id') then 'existe' else 'manquant' end as statut
union all
select 'colonne patrimoine_biens.latitude' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patrimoine_biens' and column_name = 'latitude') then 'existe' else 'manquant' end as statut
union all
select 'colonne patrimoine_biens.longitude' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'patrimoine_biens' and column_name = 'longitude') then 'existe' else 'manquant' end as statut
union all
select 'colonne territoire_infrastructures.latitude' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'territoire_infrastructures' and column_name = 'latitude') then 'existe' else 'manquant' end as statut
union all
select 'colonne territoire_infrastructures.longitude' as objet, case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'territoire_infrastructures' and column_name = 'longitude') then 'existe' else 'manquant' end as statut
union all
select 'table quittances' as objet, case when to_regclass('public.quittances') is not null then 'existe' else 'manquant' end as statut
union all
select 'table registre_retraits' as objet, case when to_regclass('public.registre_retraits') is not null then 'existe' else 'manquant' end as statut
union all
select 'table demande_historique' as objet, case when to_regclass('public.demande_historique') is not null then 'existe' else 'manquant' end as statut
union all
select 'table suivi_tokens' as objet, case when to_regclass('public.suivi_tokens') is not null then 'existe' else 'manquant' end as statut
union all
select 'rpc valider_paiement_especes' as objet, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'valider_paiement_especes') then 'existe' else 'manquant' end as statut
union all
select 'rpc cloturer_deliberation' as objet, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'cloturer_deliberation') then 'existe' else 'manquant' end as statut
union all
select 'rpc encaisser_demande' as objet, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'encaisser_demande') then 'existe' else 'manquant' end as statut
union all
select 'rpc retirer_demande' as objet, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'retirer_demande') then 'existe' else 'manquant' end as statut
union all
select 'rpc suivi_public' as objet, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'suivi_public') then 'existe' else 'manquant' end as statut
union all
select 'rpc encaisser_demande(uuid, numeric, text, text)' as objet, case when to_regprocedure('public.encaisser_demande(uuid,numeric,text,text)') is not null then 'existe' else 'manquant' end as statut
union all
select 'vue v_suivi_public' as objet, case when exists (select 1 from pg_views where schemaname = 'public' and viewname = 'v_suivi_public') then 'existe' else 'manquant' end as statut
union all
select 'politique demandes_guichet (demandes)' as objet, case when exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demandes' and policyname = 'demandes_guichet') then 'existe' else 'manquant' end as statut
union all
select 'politique hist_lecture (demande_historique)' as objet, case when exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demande_historique' and policyname = 'hist_lecture') then 'existe' else 'manquant' end as statut
union all
select 'politique demandes_personnel conservée (demandes)' as objet, case when exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'demandes' and policyname = 'demandes_personnel') then 'existe' else 'manquant' end as statut
union all
select 'propriétaire postgres de cloturer_deliberation' as objet, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_roles r on r.oid = p.proowner where n.nspname = 'public' and p.proname = 'cloturer_deliberation' and r.rolname = 'postgres') then 'existe' else 'manquant' end as statut
union all
select 'extension pgcrypto (digest utilisé par suivi_public)' as objet, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'extensions' and p.proname = 'digest') then 'existe' else 'manquant' end as statut
order by statut desc, objet;
