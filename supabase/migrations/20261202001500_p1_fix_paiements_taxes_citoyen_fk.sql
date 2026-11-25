-- P1 Paiements (2026-11-25) : correctif « Encaissement refusé : violates foreign key constraint paiements_taxes_citoyen_id_fkey ».
-- paiements_taxes.citoyen_id référençait profiles(id) ; or les citoyens sont des comptes (anonymes) auth.users sans ligne dans profiles,
-- donc encaisser_demande(demande) échouait (23503). Alignement sur demandes.citoyen_id : références auth.users(id), ON DELETE SET NULL.
-- Idempotente. La politique ptx_cit_sel (citoyen_id = auth.uid()) reste valable.
alter table public.paiements_taxes drop constraint if exists paiements_taxes_citoyen_id_fkey;
alter table public.paiements_taxes add constraint paiements_taxes_citoyen_id_fkey
  foreign key (citoyen_id) references auth.users(id) on delete set null;
