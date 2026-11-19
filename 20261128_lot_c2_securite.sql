-- Lot C2 : correctifs sécurité. DÉJÀ APPLIQUÉ en base (17/11/2026, migration lot_c2_correctif_securite). Idempotent, additif.
-- 1) TRUNCATE/REFERENCES/TRIGGER retirés partout (tables créées après audit3 incluses)
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
 end loop; end $$;
-- 2) Journal des consultations : lecture seule ; écriture uniquement via org_tracer (security definer)
drop policy if exists acces_sensibles_insert on public.acces_sensibles;
revoke insert, update, delete on public.acces_sensibles from anon, authenticated;
revoke all on public.acces_sensibles from anon;
drop policy if exists acces_sensibles_select on public.acces_sensibles;
create policy acces_sensibles_select on public.acces_sensibles for select to authenticated
 using (commune_id = (select org_commune()) and (select role from public.profiles where id=(select auth.uid())) in ('maire','super_admin'));
-- 3) Tables org_* : écriture uniquement par les fonctions serveur
revoke insert, update, delete on public.org_roles, public.org_postes, public.org_role_droits, public.org_affectations, public.org_delegations_droits from anon, authenticated;
-- 4) Anti-escalade : on n'affecte / ne lie qu'un rôle dont on détient déjà tous les droits (maire et super_admin exemptés)
create or replace function public.org_peut_accorder(p_role text) returns boolean language sql stable security definer set search_path to 'public' as $f$
 select coalesce((select p.role in ('maire','super_admin') from public.profiles p where p.id=auth.uid()),false)
  or not exists(select 1 from public.org_role_droits d where d.commune_id=public.org_commune() and d.role_code=p_role and not public.org_droit_propre(auth.uid(),d.module,d.action)) $f$;
revoke all on function public.org_peut_accorder(text) from public, anon, authenticated;
create or replace function public.org_affecter(p_user uuid, p_poste text, p_service text default null, p_debut date default null, p_fin date default null) returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune(); did uuid; d date:=coalesce(p_debut,current_date);
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if not exists(select 1 from profiles where id=p_user and commune_id=c and role<>'super_admin') then raise exception 'Utilisateur invalide'; end if;
 if not exists(select 1 from org_postes where commune_id=c and code=p_poste and actif) then raise exception 'Poste invalide'; end if;
 if not org_peut_accorder((select role_code from org_postes where commune_id=c and code=p_poste)) then raise exception 'Vous ne pouvez affecter qu''à un poste dont les droits vous appartiennent'; end if;
 if p_fin is not null and p_fin<d then raise exception 'Période invalide'; end if;
 insert into org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,created_by) values(c,p_user,p_poste,p_service,d,p_fin,auth.uid()) returning id into did;
 perform org_log(c,'org_affecter',p_user::text,jsonb_build_object('poste',p_poste,'debut',d,'fin',p_fin)); return did; end $function$;
create or replace function public.org_poste_save(p_code text, p_nom text, p_famille text, p_role text, p_parent text, p_service text, p_actif boolean default true) returns void language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune(); x text:=p_parent; n int:=0;
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if not exists(select 1 from org_roles where commune_id=c and code=p_role and actif) then raise exception 'Rôle invalide'; end if;
 if not org_peut_accorder(p_role) then raise exception 'Vous ne pouvez utiliser qu''un rôle dont les droits vous appartiennent'; end if;
 if p_parent is not null and not exists(select 1 from org_postes where commune_id=c and code=p_parent) then raise exception 'Poste supérieur introuvable'; end if;
 while x is not null and n<30 loop if x=p_code then raise exception 'Lien hiérarchique circulaire'; end if; select parent_code into x from org_postes where commune_id=c and code=x; n:=n+1; end loop;
 insert into org_postes(commune_id,code,nom,famille,role_code,parent_code,service_code,actif) values(c,p_code,trim(p_nom),p_famille,p_role,p_parent,p_service,coalesce(p_actif,true))
 on conflict(commune_id,code) do update set nom=excluded.nom,famille=excluded.famille,role_code=excluded.role_code,parent_code=excluded.parent_code,service_code=excluded.service_code,actif=excluded.actif;
 perform org_log(c,'org_poste_save',p_code,jsonb_build_object('role',p_role,'parent',p_parent,'actif',p_actif)); end $function$;
-- 5) Policies Lot C : authenticated seulement, fonctions évaluées une fois par requête
drop policy if exists personnel_org_select on public.personnel; create policy personnel_org_select on public.personnel for select to authenticated using (commune_id=(select org_commune()) and (select org_droit('personnel','consulter')));
drop policy if exists conges_org_select on public.conges; create policy conges_org_select on public.conges for select to authenticated using (commune_id=(select org_commune()) and (select org_droit('conges','consulter')));
drop policy if exists conges_droits_org_select on public.conges_droits; create policy conges_droits_org_select on public.conges_droits for select to authenticated using (commune_id=(select org_commune()) and (select org_droit('conges','consulter')));
drop policy if exists remun_org_select on public.remunerations; create policy remun_org_select on public.remunerations for select to authenticated using (commune_id=(select org_commune()) and (select org_droit('remun','consulter')));
drop policy if exists paies_org_select on public.paies; create policy paies_org_select on public.paies for select to authenticated using (commune_id=(select org_commune()) and (select org_droit('paie','consulter')));
drop policy if exists paie_lignes_org_select on public.paie_lignes; create policy paie_lignes_org_select on public.paie_lignes for select to authenticated using (exists(select 1 from public.paies p where p.id=paie_lignes.paie_id and p.commune_id=(select org_commune())) and (select org_droit('paie','consulter')));
drop policy if exists marches_org_select on public.marches; create policy marches_org_select on public.marches for select to authenticated using (commune_id=(select org_commune()) and (select org_droit('marches','consulter')));
drop policy if exists documents_org_select on public.documents; create policy documents_org_select on public.documents for select to authenticated using (commune_id=(select org_commune()) and (select org_droit('archives','consulter')) and confidentialite<>'confidentiel');
-- 6) Aligne le dépôt sur la production : fonctions internes jamais exécutables par anon/authenticated
--    (le §3 de 20261125_org_rbac.sql accorde l'exécution à authenticated pour tout org_* ; ces 4 fonctions doivent rester internes). Migration lot_c2b_revoke_fonctions_internes.
revoke all on function public.org_seed(uuid), public.org_log(uuid,text,text,jsonb), public.org_droit_propre(uuid,text,text), public.org_droit_user(uuid,text,text) from public, anon, authenticated;
