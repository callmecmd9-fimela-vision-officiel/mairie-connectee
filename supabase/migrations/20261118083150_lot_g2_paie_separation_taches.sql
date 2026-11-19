-- Lot G2 : séparation des tâches — la personne qui a validé une paie ne peut pas l'ordonnancer (maire compris).
-- Double garde côté serveur : (1) message clair dans paie_ordonnancer ; (2) contrainte CHECK sur paies (valable même hors RPC).
-- paie_payer n'est pas ouvert aux postes (décision propriétaire du 2026-11-18). Additif ; CREATE OR REPLACE conserve les droits EXECUTE.
create or replace function public.paie_ordonnancer(p_paie uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare c uuid := private.paie_garde(array['maire'],'signer'); m date;
begin
  if exists(select 1 from public.paies where id=p_paie and commune_id=c and statut='valide' and valide_par is not distinct from auth.uid()) then
    raise exception 'Séparation des tâches : la personne qui a validé la paie ne peut pas l''ordonnancer' using errcode='42501'; end if;
  update public.paies set statut='ordonnance', ordonne_par=auth.uid(), ordonne_le=now() where id=p_paie and commune_id=c and statut='valide' returning mois into m;
  if not found then raise exception 'La paie doit être validée avant ordonnancement'; end if;
  insert into public.decisions(commune_id,type,objet,created_by) values (c,'Décision','Ordonnancement de la paie du personnel : '||to_char(m,'MM/YYYY'),auth.uid());
end $function$;
alter table public.paies drop constraint if exists paies_separation_taches;
alter table public.paies add constraint paies_separation_taches check (valide_par is null or ordonne_par is null or valide_par <> ordonne_par);
-- ROLLBACK (à exécuter seul) : retire la contrainte et restaure paie_ordonnancer d'origine (sans le contrôle de séparation) :
--   alter table public.paies drop constraint if exists paies_separation_taches;
--   create or replace function public.paie_ordonnancer(p_paie uuid) returns void language plpgsql security definer set search_path to '' as $f$
--   declare c uuid := private.paie_garde(array['maire'],'signer'); m date;
--   begin
--     update public.paies set statut='ordonnance', ordonne_par=auth.uid(), ordonne_le=now() where id=p_paie and commune_id=c and statut='valide' returning mois into m;
--     if not found then raise exception 'La paie doit être validée avant ordonnancement'; end if;
--     insert into public.decisions(commune_id,type,objet,created_by) values (c,'Décision','Ordonnancement de la paie du personnel : '||to_char(m,'MM/YYYY'),auth.uid());
--   end $f$;
