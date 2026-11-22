-- Indicateurs des tableaux de bord (org_kpi v2). Idempotent ; aucune donnée modifiée.
--  * 'citoyens' compte désormais TOUS les statuts ouverts de `demandes` (a_valider, en_attente_pieces, acceptee, pret_a_retirer manquaient).
--  * nouveaux : 'demandes_anciennes' (ouvertes > 15 jours), 'rdv' (rdv_demandes à confirmer), 'services','postes','affectations','roles' (structure).
--  * admin_mairie : aucun accès aux données métier => indicateurs métier = null (affichés « — » et non « 0 »), structure toujours fournie.
--  * org_kpi reste SECURITY INVOKER : la RLS des tables métier continue de s'appliquer ; seul le comptage de structure passe par un helper DEFINER limité à la commune de l'appelant.
create or replace function private.org_kpi_structure(c uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when c is null or c is distinct from public.org_commune() then '{}'::jsonb else jsonb_build_object(
  'services',(select count(*) from public.services where commune_id=c and coalesce(actif,true)),
  'postes',(select count(*) from public.org_postes where commune_id=c and actif),
  'affectations',(select count(*) from public.org_affectations where commune_id=c and actif and debut<=current_date and (fin is null or fin>=current_date)),
  'roles',(select count(*) from public.org_roles where commune_id=c and actif)) end $$;
revoke all on function private.org_kpi_structure(uuid) from public, anon;
grant execute on function private.org_kpi_structure(uuid) to authenticated;

create or replace function public.org_kpi() returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare c uuid:=org_commune(); r jsonb:='{}'; adm boolean:=coalesce(private.is_commune_admin(c),false);
begin if c is null then return r; end if;
 r:=private.org_kpi_structure(c)||jsonb_build_object('profil',case when adm then 'admin_mairie' else 'metier' end);
 if adm then
  return r||jsonb_build_object('instr',null,'cin',null,'actes',null,'dossiers',null,'citoyens',null,'demandes_anciennes',null,'rdv',null,
   'marches',null,'projets',null,'projets_retard',null,'conges',null,'paie',null,'personnel',null);
 end if;
 return r||jsonb_build_object(
 'instr',(select count(*) from instructions where commune_id=c and statut in ('nouvelle','affectee','prise_en_charge','en_cours','en_attente')),
 'cin',(select count(*) from courrier where commune_id=c and statut in ('recu','a_traiter','a_repondre','a_signer','urgent','affecte','en_cours')),
 'actes',(select count(*) from actes where commune_id=c and statut in ('brouillon','preparation','validation')),
 'dossiers',(select count(*) from dossiers where commune_id=c and statut in ('ouvert','en_cours','en_attente')),
 'citoyens',(select count(*) from demandes where commune_id=c and statut in ('nouvelle','orientee','en_cours','a_valider','en_attente_pieces','acceptee','pret_a_retirer')),
 'demandes_anciennes',(select count(*) from demandes where commune_id=c and statut in ('nouvelle','orientee','en_cours','a_valider','en_attente_pieces') and created_at<now()-interval '15 days'),
 'rdv',(select count(*) from rdv_demandes where commune_id=c and statut='demandee'),
 'marches',(select count(*) from marches where commune_id=c and statut in ('preparation','lance','evaluation','attribue','approuve','en_cours')),
 'projets',(select count(*) from projets where commune_id=c and statut in ('programme','en_cours','en_attente','en_retard')),
 'projets_retard',(select count(*) from projets where commune_id=c and statut='en_retard'),
 'conges',(select count(*) from conges where commune_id=c and statut='demande'),
 'paie',(select count(*) from paies where commune_id=c and statut in ('brouillon','valide')),
 'personnel',(select count(*) from personnel where commune_id=c and coalesce(actif,true)));
end $$;
revoke all on function public.org_kpi() from public, anon;
grant execute on function public.org_kpi() to authenticated;
