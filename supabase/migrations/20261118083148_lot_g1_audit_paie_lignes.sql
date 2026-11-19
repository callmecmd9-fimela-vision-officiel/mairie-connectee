-- Lot G1 : journalisation des lignes de paie (même mécanisme private.audit() que paies, remunerations, personnel…).
-- Journalise uniquement commune_id, utilisateur, action, table, id de ligne (aucun montant). Additif, idempotent.
drop trigger if exists audit_paie_lignes on public.paie_lignes;
create trigger audit_paie_lignes after insert or update or delete on public.paie_lignes for each row execute function private.audit();
-- ROLLBACK (à exécuter seul, ne supprime aucune donnée métier ; les lignes déjà écrites dans audit_log restent) :
--   drop trigger if exists audit_paie_lignes on public.paie_lignes;
