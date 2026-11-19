do $$
declare c uuid; plan_id uuid; health_id uuid; finance_id uuid; receipts_id uuid; mayor_user uuid;
begin
  select id into c from public.communes where slug='commune-de-diofior';
  if c is null then raise exception 'Commune de Diofior introuvable'; end if;
  if (select count(*) from public.personnel pe where pe.commune_id=c and pe.fusionne_dans is null) <> 38
     or (select count(*) from public.adjoints ad where ad.commune_id=c and ad.actif) <> 2 then
    raise exception 'Effectif de référence inattendu : import interrompu sans modification';
  end if;
  if (select count(*) from public.org_agent_affectations a where a.commune_id=c and a.debut<=current_date and (a.fin is null or a.fin>=current_date)) <> 41 then
    raise exception 'Nombre d’affectations de référence inattendu : import interrompu sans modification';
  end if;
  if (select count(*) from (values
    ('Amy','SAMBOU'),('André','MENDY'),('Ansoumana','BADJI'),('Ansoumana','DAFFE'),('Arona','COLY'),
    ('Awita François','DIATTA'),('Babacar Bernard','DIATTA'),('Bertrand','SOW'),('Charles','DIATTA'),
    ('Christian','SAGNA'),('David','DIATTA'),('Elisabeth Elie','DIATTA'),('Fatou','DIATTA'),
    ('Ibrahima','DIAGNE'),('Idrissa Lamine','DIEME'),('Issa','GUEYE'),('Jean Denis','DIATTA'),
    ('Jean Sounta','DIATTA'),('Joseph','DIATTA'),('Lamine','DIEDHIOU'),('Léopold','BADIANE'),
    ('Maitening','TRAORE'),('Marc','DIATTA'),('Mariama Sadio','DIALLO'),('Moustapha','NDAO'),
    ('Médoune','GAYE'),('Rama','DIEYE'),('Serge Raphael','DIATTA'),('Seydou','BIAYE'),
    ('Seydou','MANE'),('Sophie Amath','DIATTA'),('Sophie Assef','DIATTA'),('Sophie Souna','DIATTA'),
    ('Sountougoune','BADJI'),('Sékou','SANE'),('Théodore','DIATTA'),('Yetor Benjamin','DIATTA'),
    ('Youssou','DIOM')
  ) expected(prenom,nom) where exists(
    select 1 from public.personnel pe where pe.commune_id=c and pe.prenom=expected.prenom and pe.nom=expected.nom and pe.fusionne_dans is null
  )) <> 38 then raise exception 'Liste nominative incomplète : aucune correction appliquée'; end if;
  if (select count(*) from public.adjoints ad where ad.commune_id=c and ((ad.prenom='Seynabou' and ad.nom='DIOME') or (ad.prenom='Assane' and ad.nom='THIAM')) and ad.actif) <> 2 then
    raise exception 'Adjoints de référence absents ou inactifs'; end if;
  if (select count(*) from public.org_agent_affectations a join public.personnel pe on pe.id=a.personnel_id
      where a.commune_id=c and pe.prenom='Marc' and pe.nom='DIATTA' and a.debut<=current_date and (a.fin is null or a.fin>=current_date)) <> 2 then
    raise exception 'Marc DIATTA doit conserver ses deux affectations actives'; end if;

  select id into plan_id from public.services where commune_id=c and code='div_planification';
  select id into finance_id from public.services where commune_id=c and code='finances';
  select id into receipts_id from public.services where commune_id=c and code='recettes';
  if plan_id is null or finance_id is null or receipts_id is null then raise exception 'Services de référence manquants'; end if;

  insert into public.services(commune_id,code,nom,type,parent_id,ordre,actif)
  values(c,'sante_action_sociale','Santé et action sociale','bureau',plan_id,20,true)
  on conflict(commune_id,code) do update set nom=excluded.nom,type='bureau',parent_id=plan_id,actif=true;
  select id into health_id from public.services where commune_id=c and code='sante_action_sociale';

  update public.org_postes set parent_code='chef_div_planification',service_code='sante_action_sociale'
    where commune_id=c and code='resp_sante_social';
  update public.org_postes set service_code='sante_action_sociale'
    where commune_id=c and code in ('agent_sante_social','agent_bureau','matrone');
  update public.org_postes set service_code='finances' where commune_id=c and code in ('agent_finances','agent_detache_tresor');
  update public.org_postes set service_code='recettes' where commune_id=c and code='collecteur';

  update public.org_agent_affectations a set service_id=health_id
  from public.personnel pe where a.commune_id=c and a.personnel_id=pe.id
    and ((pe.prenom='Arona' and pe.nom='COLY')
      or (pe.prenom='Marc' and pe.nom='DIATTA' and a.poste_code='agent_bureau')
      or (pe.prenom='Sophie Souna' and pe.nom='DIATTA')
      or (pe.prenom='Elisabeth Elie' and pe.nom='DIATTA')
      or (pe.prenom='Maitening' and pe.nom='TRAORE'));
  update public.personnel pe set service='Santé et action sociale',service_id=health_id
  where pe.commune_id=c and ((pe.prenom='Arona' and pe.nom='COLY')
    or (pe.prenom='Sophie Souna' and pe.nom='DIATTA')
    or (pe.prenom='Elisabeth Elie' and pe.nom='DIATTA')
    or (pe.prenom='Maitening' and pe.nom='TRAORE'));

  update public.personnel pe set service='Finances, budget et comptabilité matières',service_id=finance_id
  where pe.commune_id=c and pe.prenom='Marc' and pe.nom='DIATTA';
  update public.org_agent_affectations a set service_id=finance_id
  from public.personnel pe where a.commune_id=c and a.personnel_id=pe.id
    and pe.prenom='Marc' and pe.nom='DIATTA' and a.poste_code='agent_detache_tresor';

  update public.personnel pe set fonction='Agent finances',service='Finances, budget et comptabilité matières',service_id=finance_id
  where pe.commune_id=c and pe.prenom='Ansoumana' and pe.nom='DAFFE';
  update public.org_agent_affectations a set poste_code='agent_finances',service_id=finance_id
  from public.personnel pe where a.commune_id=c and a.personnel_id=pe.id
    and pe.prenom='Ansoumana' and pe.nom='DAFFE';

  update public.personnel pe set service='Bureau des recettes',service_id=receipts_id
  where pe.commune_id=c and ((pe.prenom='Médoune' and pe.nom='GAYE')
    or (pe.prenom='Sékou' and pe.nom='SANE') or (pe.prenom='Joseph' and pe.nom='DIATTA')
    or (pe.prenom='Charles' and pe.nom='DIATTA') or (pe.prenom='Seydou' and pe.nom='BIAYE'));
  update public.org_agent_affectations a set service_id=receipts_id,
    poste_code=case when pe.prenom='Médoune' and pe.nom='GAYE' then 'collecteur' else a.poste_code end
  from public.personnel pe where a.commune_id=c and a.personnel_id=pe.id
    and ((pe.prenom='Médoune' and pe.nom='GAYE') or (pe.prenom='Sékou' and pe.nom='SANE')
      or (pe.prenom='Joseph' and pe.nom='DIATTA') or (pe.prenom='Charles' and pe.nom='DIATTA')
      or (pe.prenom='Seydou' and pe.nom='BIAYE'));

  select p.id into mayor_user from public.profiles p
  where p.commune_id=c and p.role='maire' and lower(trim(p.nom)) in ('youssou diom','youssouph diome')
  order by p.created_at limit 1;
  if mayor_user is not null then
    update public.personnel pe set user_id=mayor_user
    where pe.commune_id=c and pe.prenom='Youssou' and pe.nom='DIOM' and pe.user_id is null;
  end if;
  perform public.org_log(c,'org_diofior_reconciliation','organigramme',
    jsonb_build_object('service_added_or_verified','sante_action_sociale','health_agents',5,
      'finance_reassigned','Ansoumana DAFFE','receipts_agents',5,'mayor_account_linked',mayor_user is not null));
end $$;