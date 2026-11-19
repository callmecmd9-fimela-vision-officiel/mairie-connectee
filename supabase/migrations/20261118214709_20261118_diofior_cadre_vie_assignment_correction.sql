do $$
declare c uuid; sid uuid; expected integer; assigned integer;
begin
 select id into c from public.communes where slug='commune-de-diofior';
 if c is null then raise exception 'Commune de Diofior introuvable'; end if;
 select id into sid from public.services where commune_id=c and code='cadre_vie';
 if sid is null then raise exception 'Service cadre_vie introuvable'; end if;
 select count(*) into expected from (values
  ('Sountougoune','BADJI'),('Fatou','DIATTA'),('Sophie Assef','DIATTA'),
  ('Sophie Amath','DIATTA'),('Rama','DIEYE'),('Issa','GUEYE'),('Serge Raphael','DIATTA')
 ) v(prenom,nom) where exists(
   select 1 from public.personnel pe where pe.commune_id=c and pe.prenom=v.prenom and pe.nom=v.nom and pe.fusionne_dans is null
 );
 select count(*) into assigned from public.org_agent_affectations a
 join public.personnel pe on pe.id=a.personnel_id
 where a.commune_id=c and a.poste_code='agent_technique'
 and ((pe.prenom='Sountougoune' and pe.nom='BADJI') or (pe.prenom='Fatou' and pe.nom='DIATTA')
  or (pe.prenom='Sophie Assef' and pe.nom='DIATTA') or (pe.prenom='Sophie Amath' and pe.nom='DIATTA')
  or (pe.prenom='Rama' and pe.nom='DIEYE') or (pe.prenom='Issa' and pe.nom='GUEYE')
  or (pe.prenom='Serge Raphael' and pe.nom='DIATTA'))
 and a.debut<=current_date and (a.fin is null or a.fin>=current_date);
 if expected<>7 or assigned<>7 then raise exception 'Préconditions cadre de vie non satisfaites (fiches %, affectations %) : aucune correction',expected,assigned; end if;
 update public.org_postes set service_code='cadre_vie'
 where commune_id=c and code in ('agent_technique','resp_environnement');
 update public.org_agent_affectations a set service_id=sid
 from public.personnel pe where a.commune_id=c and a.personnel_id=pe.id and a.poste_code='agent_technique'
 and ((pe.prenom='Sountougoune' and pe.nom='BADJI') or (pe.prenom='Fatou' and pe.nom='DIATTA')
  or (pe.prenom='Sophie Assef' and pe.nom='DIATTA') or (pe.prenom='Sophie Amath' and pe.nom='DIATTA')
  or (pe.prenom='Rama' and pe.nom='DIEYE') or (pe.prenom='Issa' and pe.nom='GUEYE')
  or (pe.prenom='Serge Raphael' and pe.nom='DIATTA'));
 update public.personnel pe set service='Bureau du cadre de vie',service_id=sid
 where pe.commune_id=c and ((pe.prenom='Sountougoune' and pe.nom='BADJI') or (pe.prenom='Fatou' and pe.nom='DIATTA')
  or (pe.prenom='Sophie Assef' and pe.nom='DIATTA') or (pe.prenom='Sophie Amath' and pe.nom='DIATTA')
  or (pe.prenom='Rama' and pe.nom='DIEYE') or (pe.prenom='Issa' and pe.nom='GUEYE')
  or (pe.prenom='Serge Raphael' and pe.nom='DIATTA'));
 perform public.org_log(c,'org_diofior_cadre_vie_reconcile','cadre_vie',
  jsonb_build_object('agents_rattaches',7,'responsable','Léopold BADIANE'));
end $$;