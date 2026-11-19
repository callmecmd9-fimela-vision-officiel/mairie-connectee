-- Lot E (pilote) : la paie respecte aussi les droits des postes. ADDITIF : les rôles historiques passent comme avant.
-- paie_payer n'est volontairement PAS ouvert aux postes (paiement = comptable public / finances historique).
create or replace function private.paie_garde(p_roles text[], p_action text) returns uuid language plpgsql stable security definer set search_path to '' as $function$
declare c uuid := private.my_commune(); r text := private.my_role();
begin
  if c is null or r is null or not private.hors_maintenance()
     or not (r = any (p_roles) or (r <> 'super_admin' and coalesce(public.org_droit('paie', p_action), false))) then
    raise exception 'Accès refusé' using errcode='42501'; end if;
  return c;
end $function$;
revoke all on function private.paie_garde(text[], text) from public, anon, authenticated;

create or replace function public.paie_generer(p_mois date) returns uuid language plpgsql security definer set search_path to '' as $function$
declare c uuid := private.paie_garde(array['maire','rh'],'creer'); pid uuid; st text; m date := date_trunc('month', p_mois)::date;
begin
  select id, statut into pid, st from public.paies where commune_id=c and mois=m;
  if pid is not null and st <> 'brouillon' then raise exception 'Cette paie n''est plus modifiable'; end if;
  if pid is null then insert into public.paies(commune_id,mois) values (c,m) returning id into pid;
  else delete from public.paie_lignes where paie_id=pid; end if;
  insert into public.paie_lignes(commune_id,paie_id,personnel_id,brut,retenues)
   select c,pid,p.id,coalesce(r.salaire_base,0)+coalesce(r.indemnites,0),coalesce(r.retenues,0)
   from public.personnel p left join public.remunerations r on r.personnel_id=p.id
   where p.commune_id=c and p.actif and (p.date_sortie is null or p.date_sortie>=m);
  perform private.paie_totaux(pid); return pid;
end $function$;
create or replace function public.paie_maj_ligne(p_ligne uuid, p_brut numeric, p_retenues numeric) returns void language plpgsql security definer set search_path to '' as $function$
declare c uuid := private.paie_garde(array['maire','rh'],'modifier'); pid uuid;
begin
  select l.paie_id into pid from public.paie_lignes l join public.paies p on p.id=l.paie_id where l.id=p_ligne and l.commune_id=c and p.statut='brouillon';
  if pid is null then raise exception 'Ligne introuvable ou paie non modifiable'; end if;
  if p_brut<0 or p_retenues<0 or p_retenues>p_brut then raise exception 'Montants invalides'; end if;
  update public.paie_lignes set brut=p_brut, retenues=p_retenues where id=p_ligne;
  perform private.paie_totaux(pid);
end $function$;
create or replace function public.paie_valider(p_paie uuid) returns void language plpgsql security definer set search_path to '' as $function$
declare c uuid := private.paie_garde(array['maire','rh'],'valider');
begin
  update public.paies set statut='valide', valide_par=auth.uid(), valide_le=now() where id=p_paie and commune_id=c and statut='brouillon' and nb_agents>0;
  if not found then raise exception 'Paie introuvable, vide ou déjà validée'; end if;
end $function$;
create or replace function public.paie_retour_brouillon(p_paie uuid) returns void language plpgsql security definer set search_path to '' as $function$
declare c uuid := private.paie_garde(array['maire'],'rejeter');
begin
  update public.paies set statut='brouillon', valide_par=null, valide_le=null where id=p_paie and commune_id=c and statut='valide';
  if not found then raise exception 'Paie introuvable ou non validée'; end if;
end $function$;
create or replace function public.paie_ordonnancer(p_paie uuid) returns void language plpgsql security definer set search_path to '' as $function$
declare c uuid := private.paie_garde(array['maire'],'signer'); m date;
begin
  update public.paies set statut='ordonnance', ordonne_par=auth.uid(), ordonne_le=now() where id=p_paie and commune_id=c and statut='valide' returning mois into m;
  if not found then raise exception 'La paie doit être validée avant ordonnancement'; end if;
  insert into public.decisions(commune_id,type,objet,created_by) values (c,'Décision','Ordonnancement de la paie du personnel : '||to_char(m,'MM/YYYY'),auth.uid());
end $function$;