-- Lot A : organigramme, rôles, permissions, délégations. EXPORT de l'état appliqué en production (2026-11-17).
-- Idempotent (create if not exists / create or replace / drop policy if exists). À appliquer AVANT 20261126_lot_c_rls.sql.
-- Dépendances existantes : communes, profiles, permissions_utilisateurs, journal_audit. Aucune table/RLS existante modifiée.

-- 1) Tables (ordre des clés étrangères)
create table if not exists public.org_roles(commune_id uuid not null, code text not null, nom text not null, famille text, description text, systeme boolean not null default false, actif boolean not null default true,
 check (code ~ '^[a-z][a-z0-9_]{1,40}$'), foreign key (commune_id) references communes(id) on delete cascade, primary key (commune_id, code));
create table if not exists public.org_postes(commune_id uuid not null, code text not null, nom text not null, famille text, role_code text not null, parent_code text, service_code text, systeme boolean not null default false, actif boolean not null default true,
 foreign key (commune_id, role_code) references org_roles(commune_id, code), primary key (commune_id, code));
create table if not exists public.org_role_droits(commune_id uuid not null, role_code text not null, module text not null, action text not null,
 check (action = any (array['consulter','creer','modifier','supprimer','valider','rejeter','signer','exporter','imprimer','partager','administrer'])),
 foreign key (commune_id, role_code) references org_roles(commune_id, code) on delete cascade, primary key (commune_id, role_code, module, action));
create table if not exists public.org_affectations(id uuid not null default gen_random_uuid(), commune_id uuid not null, user_id uuid not null, poste_code text not null, service_code text, debut date not null default current_date, fin date, actif boolean not null default true, created_by uuid, created_at timestamptz not null default now(),
 foreign key (commune_id, poste_code) references org_postes(commune_id, code), primary key (id), foreign key (user_id) references profiles(id) on delete cascade);
create table if not exists public.org_delegations_droits(id uuid not null default gen_random_uuid(), commune_id uuid not null, de_user uuid not null, a_user uuid not null, module text not null, action text not null, debut timestamptz not null default now(), fin timestamptz not null, motif text, revoque_le timestamptz, revoque_par uuid, created_at timestamptz not null default now(),
 foreign key (a_user) references profiles(id), check (fin > debut), check (de_user <> a_user), foreign key (commune_id) references communes(id) on delete cascade, foreign key (de_user) references profiles(id), primary key (id));
alter table public.org_roles enable row level security;
alter table public.org_postes enable row level security;
alter table public.org_role_droits enable row level security;
alter table public.org_affectations enable row level security;
alter table public.org_delegations_droits enable row level security;

-- 2) Fonctions (ordre de dépendance)
create or replace function public.org_commune() returns uuid language sql stable security definer set search_path to 'public' as $function$ select commune_id from public.profiles where id=auth.uid() and coalesce(actif,true) $function$;
create or replace function public.org_log(c uuid, act text, cible text, det jsonb) returns void language sql security definer set search_path to 'public' as $function$
 insert into journal_audit(commune_id,user_id,email,action,cible,detail) values(c::text,auth.uid(),(select email from auth.users where id=auth.uid()),act,cible,det) $function$;
create or replace function public.org_droit_propre(u uuid, m text, a text) returns boolean language plpgsql stable security definer set search_path to 'public' as $function$
declare p record; o boolean;
begin
 select role,commune_id into p from profiles where id=u and coalesce(actif,true);
 if not found then return false; end if;
 if p.role in ('super_admin','maire') then return true; end if;
 if a='consulter' then select autorise into o from permissions_utilisateurs where commune_id=p.commune_id::text and user_id=u and cle=m; if found then return o; end if; end if;
 return exists(select 1 from org_affectations f join org_postes po on po.commune_id=f.commune_id and po.code=f.poste_code and po.actif join org_roles r on r.commune_id=po.commune_id and r.code=po.role_code and r.actif join org_role_droits d on d.commune_id=r.commune_id and d.role_code=r.code where f.user_id=u and f.commune_id=p.commune_id and f.actif and f.debut<=current_date and (f.fin is null or f.fin>=current_date) and d.module=m and d.action=a);
end $function$;
create or replace function public.org_droit_user(u uuid, m text, a text) returns boolean language sql stable security definer set search_path to 'public' as $function$
 select org_droit_propre(u,m,a) or exists(select 1 from org_delegations_droits d where d.a_user=u and d.module=m and d.action=a and d.revoque_le is null and now() between d.debut and d.fin and d.commune_id=(select commune_id from profiles where id=u) and org_droit_propre(d.de_user,m,a)) $function$;
create or replace function public.org_droit(m text, a text) returns boolean language sql stable security definer set search_path to 'public' as $function$ select coalesce(org_droit_user(auth.uid(),m,a),false) $function$;

create or replace function public.org_seed(p uuid) returns void language plpgsql security definer set search_path to 'public' as $function$
declare r record; acts text[]; m text; a text; ac text; ax text[];
begin
 for r in select * from (values
  ('maire','Maire','Direction municipale',array[]::text[],'none',false,null),
  ('adjoint','Adjoint au maire','Direction municipale',array[]::text[],'none',false,'maire'),
  ('secretaire_municipal','Secrétaire municipal','Administration générale',array['cin','cout','actes','conseil','dossiers','archives','instr','rapports','citoyens'],'resp',false,'maire'),
  ('secretariat','Secrétariat','Administration générale',array['cin','cout','dossiers','archives','instr','conseil'],'oper',false,'secretaire_municipal'),
  ('conseiller_municipal','Conseiller municipal','Gouvernance municipale',array['conseil','rapports','projets'],'lect',false,'maire'),
  ('resp_finances','Responsable finances','Services financiers',array['budget','rapports'],'resp',true,'maire'),
  ('resp_marches','Responsable commande publique et marchés','Services financiers',array['marches'],'resp',true,'resp_finances'),
  ('regie','Régie municipale','Services financiers',array['regie'],'oper',false,'resp_finances'),
  ('resp_rh','Responsable RH','Ressources humaines',array['personnel','conges','rapports'],'resp',false,'secretaire_municipal'),
  ('agent_rh','Agent RH','Ressources humaines',array['personnel','conges'],'agent',false,'resp_rh'),
  ('resp_etat_civil','Responsable état civil','Services spécialisés',array['civil','citoyens','archives'],'resp',true,'secretaire_municipal'),
  ('resp_technique','Responsable des services techniques','Services spécialisés',array['projets','territoire','patrimoine'],'resp',true,'secretaire_municipal'),
  ('resp_urbanisme','Responsable urbanisme et foncier','Services spécialisés',array['territoire','dossiers','citoyens'],'resp',true,'secretaire_municipal'),
  ('resp_juridique','Responsable juridique','Services spécialisés',array['actes','dossiers','conseil','archives'],'resp',true,'secretaire_municipal'),
  ('resp_archives','Responsable archives et documentation','Services spécialisés',array['archives','dossiers'],'resp',true,'secretaire_municipal'),
  ('resp_communication','Responsable communication','Services spécialisés',array['pub','med'],'resp',true,'secretaire_municipal'),
  ('resp_dev_social','Responsable développement local et social','Services spécialisés',array['projets','citoyens'],'resp',true,'secretaire_municipal'),
  ('resp_hygiene','Responsable hygiène et assainissement','Services spécialisés',array['projets','territoire','citoyens'],'resp',true,'secretaire_municipal'),
  ('resp_environnement','Responsable environnement et cadre de vie','Services spécialisés',array['projets','territoire'],'resp',true,'secretaire_municipal'),
  ('resp_voirie','Responsable voirie et infrastructures','Services spécialisés',array['projets','territoire','patrimoine'],'resp',true,'secretaire_municipal'),
  ('resp_education','Responsable éducation et affaires scolaires','Services spécialisés',array['projets','citoyens'],'resp',true,'secretaire_municipal'),
  ('resp_sante_social','Responsable santé et action sociale','Services spécialisés',array['citoyens','projets'],'resp',true,'secretaire_municipal'),
  ('resp_cooperation','Responsable coopération et partenariats','Services spécialisés',array['projets','rapports'],'resp',true,'secretaire_municipal'),
  ('personnel_cabinet','Personnel du cabinet','Cabinet du maire',array['cabinet','instr','rapports'],'oper',false,'maire'),
  ('agent_polyvalent','Agent municipal polyvalent','Agents municipaux',array['dossiers','instr'],'agent',false,'secretaire_municipal')
 ) v(code,nom,fam,mods,niv,ag,par)
 loop
  insert into org_roles(commune_id,code,nom,famille,systeme) values(p,r.code,r.nom,r.fam,true) on conflict do nothing;
  insert into org_postes(commune_id,code,nom,famille,role_code,parent_code,systeme) values(p,r.code,r.nom,r.fam,r.code,r.par,true) on conflict do nothing;
  acts:=case r.niv when 'resp' then array['consulter','creer','modifier','valider','rejeter','exporter','imprimer','partager'] when 'oper' then array['consulter','creer','modifier','imprimer'] when 'agent' then array['consulter','creer','imprimer'] when 'lect' then array['consulter','imprimer'] else array[]::text[] end;
  foreach m in array r.mods loop foreach a in array acts loop
   insert into org_role_droits(commune_id,role_code,module,action) values(p,r.code,m,a) on conflict do nothing;
  end loop; end loop;
  if r.ag then
   ac:='agent_'||regexp_replace(r.code,'^resp_','');
   insert into org_roles(commune_id,code,nom,famille,systeme) values(p,ac,replace(r.nom,'Responsable ','Agent '),r.fam,true) on conflict do nothing;
   insert into org_postes(commune_id,code,nom,famille,role_code,parent_code,systeme) values(p,ac,replace(r.nom,'Responsable ','Agent '),r.fam,ac,r.code,true) on conflict do nothing;
   foreach m in array r.mods loop foreach a in array array['consulter','creer','imprimer'] loop
    insert into org_role_droits(commune_id,role_code,module,action) values(p,ac,m,a) on conflict do nothing;
   end loop; end loop;
  end if;
 end loop;
end $function$;

create or replace function public.org_init() returns void language plpgsql security definer set search_path to 'public' as $function$
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if; perform org_seed(org_commune()); perform org_log(org_commune(),'org_init',null,null); end $function$;
create or replace function public.org_role_save(p_code text, p_nom text, p_desc text default null) returns void language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune();
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if p_code in ('maire') then raise exception 'Rôle protégé'; end if;
 if coalesce(trim(p_nom),'')='' then raise exception 'Nom obligatoire'; end if;
 insert into org_roles(commune_id,code,nom,description) values(c,p_code,trim(p_nom),p_desc) on conflict(commune_id,code) do update set nom=excluded.nom,description=excluded.description;
 perform org_log(c,'org_role_save',p_code,jsonb_build_object('nom',p_nom)); end $function$;
create or replace function public.org_role_droit_set(p_role text, p_module text, p_action text, p_on boolean) returns void language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune(); u uuid:=auth.uid();
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if p_role='maire' or not exists(select 1 from org_roles where commune_id=c and code=p_role) then raise exception 'Rôle invalide'; end if;
 if p_on then
  if not org_droit_propre(u,p_module,p_action) then raise exception 'Vous ne pouvez accorder que les droits que vous détenez'; end if;
  insert into org_role_droits(commune_id,role_code,module,action) values(c,p_role,p_module,p_action) on conflict do nothing;
 else delete from org_role_droits where commune_id=c and role_code=p_role and module=p_module and action=p_action; end if;
 perform org_log(c,'org_role_droit',p_role,jsonb_build_object('module',p_module,'action',p_action,'accorde',p_on)); end $function$;
create or replace function public.org_poste_save(p_code text, p_nom text, p_famille text, p_role text, p_parent text, p_service text, p_actif boolean default true) returns void language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune(); x text:=p_parent; n int:=0;
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if not exists(select 1 from org_roles where commune_id=c and code=p_role and actif) then raise exception 'Rôle invalide'; end if;
 if p_parent is not null and not exists(select 1 from org_postes where commune_id=c and code=p_parent) then raise exception 'Poste supérieur introuvable'; end if;
 while x is not null and n<30 loop if x=p_code then raise exception 'Lien hiérarchique circulaire'; end if; select parent_code into x from org_postes where commune_id=c and code=x; n:=n+1; end loop;
 insert into org_postes(commune_id,code,nom,famille,role_code,parent_code,service_code,actif) values(c,p_code,trim(p_nom),p_famille,p_role,p_parent,p_service,coalesce(p_actif,true))
 on conflict(commune_id,code) do update set nom=excluded.nom,famille=excluded.famille,role_code=excluded.role_code,parent_code=excluded.parent_code,service_code=excluded.service_code,actif=excluded.actif;
 perform org_log(c,'org_poste_save',p_code,jsonb_build_object('role',p_role,'parent',p_parent,'actif',p_actif)); end $function$;
create or replace function public.org_affecter(p_user uuid, p_poste text, p_service text default null, p_debut date default null, p_fin date default null) returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune(); did uuid; d date:=coalesce(p_debut,current_date);
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 if not exists(select 1 from profiles where id=p_user and commune_id=c and role<>'super_admin') then raise exception 'Utilisateur invalide'; end if;
 if not exists(select 1 from org_postes where commune_id=c and code=p_poste and actif) then raise exception 'Poste invalide'; end if;
 if p_fin is not null and p_fin<d then raise exception 'Période invalide'; end if;
 insert into org_affectations(commune_id,user_id,poste_code,service_code,debut,fin,created_by) values(c,p_user,p_poste,p_service,d,p_fin,auth.uid()) returning id into did;
 perform org_log(c,'org_affecter',p_user::text,jsonb_build_object('poste',p_poste,'debut',d,'fin',p_fin)); return did; end $function$;
create or replace function public.org_affectation_fin(p_id uuid) returns void language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune();
begin if not org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
 update org_affectations set actif=false,fin=least(coalesce(fin,current_date),current_date) where id=p_id and commune_id=c;
 perform org_log(c,'org_affectation_fin',p_id::text,null); end $function$;
create or replace function public.org_deleguer(p_a uuid, p_module text, p_action text, p_debut timestamptz, p_fin timestamptz, p_motif text default null) returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune(); u uuid:=auth.uid(); t record; did uuid; d timestamptz:=coalesce(p_debut,now());
begin if c is null or u is null then raise exception 'Accès refusé'; end if;
 if p_action not in ('consulter','creer','modifier','supprimer','valider','rejeter','signer','exporter','imprimer','partager','administrer') then raise exception 'Action inconnue'; end if;
 select role,commune_id into t from profiles where id=p_a and coalesce(actif,true);
 if not found or t.commune_id<>c or t.role in ('super_admin','citoyen') then raise exception 'Bénéficiaire invalide'; end if;
 if p_a=u then raise exception 'Délégation à soi-même impossible'; end if;
 if p_fin is null or p_fin<=d or p_fin>d+interval '1 year' then raise exception 'Période invalide (1 an maximum)'; end if;
 if not org_droit_propre(u,p_module,p_action) then raise exception 'Vous ne pouvez déléguer que les droits que vous détenez'; end if;
 insert into org_delegations_droits(commune_id,de_user,a_user,module,action,debut,fin,motif) values(c,u,p_a,p_module,p_action,d,p_fin,p_motif) returning id into did;
 perform org_log(c,'org_deleguer',p_a::text,jsonb_build_object('module',p_module,'action',p_action,'debut',d,'fin',p_fin)); return did; end $function$;
create or replace function public.org_revoquer(p_id uuid) returns void language plpgsql security definer set search_path to 'public' as $function$
declare c uuid:=org_commune(); u uuid:=auth.uid(); n int;
begin update org_delegations_droits set revoque_le=now(),revoque_par=u where id=p_id and commune_id=c and revoque_le is null and (de_user=u or org_droit('org','administrer'));
 get diagnostics n=row_count; if n=0 then raise exception 'Délégation introuvable ou accès refusé'; end if;
 perform org_log(c,'org_revoquer',p_id::text,null); end $function$;

-- 3) Droits d'exécution : jamais anon
do $$ declare f record; begin for f in select p.oid::regprocedure s from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'org\_%' escape '\' and p.proname<>'org_tracer' loop
 execute format('revoke all on function %s from public, anon',f.s); execute format('grant execute on function %s to authenticated',f.s); end loop; end $$;

-- 4) RLS : lecture limitée à sa commune ; aucune écriture directe (uniquement via les fonctions ci-dessus)
drop policy if exists org_roles_sel on public.org_roles; create policy org_roles_sel on public.org_roles for select to authenticated using (commune_id = (select org_commune()));
drop policy if exists org_postes_sel on public.org_postes; create policy org_postes_sel on public.org_postes for select to authenticated using (commune_id = (select org_commune()));
drop policy if exists org_role_droits_sel on public.org_role_droits; create policy org_role_droits_sel on public.org_role_droits for select to authenticated using (commune_id = (select org_commune()));
drop policy if exists org_affectations_sel on public.org_affectations; create policy org_affectations_sel on public.org_affectations for select to authenticated using (commune_id = (select org_commune()));
drop policy if exists org_delegations_droits_sel on public.org_delegations_droits; create policy org_delegations_droits_sel on public.org_delegations_droits for select to authenticated
 using (commune_id = (select org_commune()) and (de_user = (select auth.uid()) or a_user = (select auth.uid()) or (select org_droit('org','administrer'))));
