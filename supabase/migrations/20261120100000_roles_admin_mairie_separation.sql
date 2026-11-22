-- =====================================================================
-- Rôles : séparation Super Admin / Admin municipal / Maire
-- Statut : PROPOSITION. NON APPLIQUÉE en production (accord requis).
--
-- Objectifs
--   1. Nouveau rôle applicatif `admin_mairie` : administre l'organisation de
--      SA commune uniquement (organigramme, rôles/droits des postes,
--      affectations, services). Aucun accès aux données métier.
--   2. `maire` : supervision, validations, signatures, décisions. Il ne reçoit
--      plus automatiquement l'administration technique (module `org`).
--   3. Interdire toute élévation de privilèges par un admin municipal.
--   4. Seule la plateforme (Super Admin / admin plateforme AAL2) crée,
--      modifie, active ou désactive un `admin_mairie`.
--
-- Sources des corps de fonctions : dernières définitions du dépôt
--   org_gest / org_peut_accorder  -> 20261118210521, 20261118212309
--   org_droit_propre              -> 20261118212626
--   saas_creer_commune            -> 20261118210757
--   admin_attribuer               -> 20261118153749 (définition déployée)
--   lier_adjoint                  -> 20261119070000 (candidate, non déployée)
--
-- Les gardes « anti-élévation » sont des TRIGGERS additifs : ils ne
-- réécrivent aucune fonction opérationnelle existante. Ils laissent passer
-- les appels sans utilisateur authentifié (service_role, migrations,
-- trigger d'inscription Auth) et les appels plateforme/super-admin AAL2.
--
-- Retour arrière : docs/ROLES_ET_PERMISSIONS.md (section « Retour arrière »).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Contrainte de rôle : ajout de admin_mairie (liste existante + 1)
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (
  role = any (array[
    'super_admin','maire','adjoint','cabinet','secretariat','finances',
    'rh','etat_civil','technique','agent','citoyen','admin_mairie'
  ]::text[])
);

-- Statut du cycle de vie d'un administrateur municipal (dérivé par trigger) :
--   en_attente : pas de commune, jamais actif, AUCUN droit
--   affecte    : commune attribuée, compte pas encore activé
--   actif      : activé par la plateforme
--   suspendu   : désactivé après avoir été actif
alter table public.profiles add column if not exists statut_admin text;
alter table public.profiles drop constraint if exists profiles_statut_admin_check;
alter table public.profiles add constraint profiles_statut_admin_check check (
  statut_admin is null or statut_admin in ('en_attente','affecte','actif','suspendu')
);
alter table public.profiles drop constraint if exists profiles_admin_mairie_coherence;
alter table public.profiles add constraint profiles_admin_mairie_coherence check (
  role::text<>'admin_mairie'
  or (statut_admin is not null and not (coalesce(actif,false) and commune_id is null))
);

create or replace function private.profil_statut_admin()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.role::text<>'admin_mairie' then
    new.statut_admin:=null;
  elsif new.commune_id is null then
    new.statut_admin:='en_attente'; new.actif:=false;
  elsif coalesce(new.actif,false) then
    new.statut_admin:='actif';
  elsif tg_op='UPDATE' and old.role::text='admin_mairie' and old.statut_admin in ('actif','suspendu') then
    new.statut_admin:='suspendu';
  else
    new.statut_admin:='affecte';
  end if;
  return new;
end
$$;
drop trigger if exists trg_profil_statut_admin on public.profiles;
create trigger trg_profil_statut_admin before insert or update on public.profiles
  for each row execute function private.profil_statut_admin();

-- ---------------------------------------------------------------------
-- 2. Helpers d'autorisation
-- ---------------------------------------------------------------------
-- Vrai seulement pour un admin_mairie ACTIF de la commune demandée.
create or replace function private.is_commune_admin(p_commune uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select coalesce(p.actif,true) and p.role::text='admin_mairie'
           and p_commune is not null and p.commune_id=p_commune
    from public.profiles p where p.id=(select auth.uid())
  ),false)
$$;

-- Vrai pour l'appelant « privilégié » : plateforme AAL2 ou super-admin AAL2.
create or replace function private.est_privilegie()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(private.is_platform_admin(),false) or coalesce(public.is_super_admin(),false)
$$;

-- Vrai quand l'appel ne vient pas d'un utilisateur final (service_role,
-- migration, trigger d'inscription Auth) : les gardes ne s'y appliquent pas.
create or replace function private.appel_systeme()
returns boolean language sql stable set search_path = ''
as $$
  select (select auth.uid()) is null or coalesce((select auth.role()),'')='service_role'
$$;

-- Droits d'administration technique réservés (module org, actions d'écriture).
create or replace function private.droit_reserve(p_module text,p_action text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_module='org' and p_action in ('creer','modifier','supprimer','administrer')
$$;

revoke all on function private.is_commune_admin(uuid) from public, anon;
revoke all on function private.est_privilegie() from public, anon;
revoke all on function private.appel_systeme() from public, anon;
revoke all on function private.droit_reserve(text,text) from public, anon;
grant execute on function private.is_commune_admin(uuid) to authenticated;
grant execute on function private.est_privilegie() to authenticated;
grant execute on function private.appel_systeme() to authenticated;
grant execute on function private.droit_reserve(text,text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. org_gest : le maire n'administre plus l'organisation par défaut
--    (ancienne règle : maire de la commune). Nouvelle règle : plateforme,
--    super-admin, ou admin_mairie de CETTE commune.
-- ---------------------------------------------------------------------
create or replace function public.org_gest(p_slug text)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare c uuid;
begin
  select id into c from public.communes where slug=p_slug;
  if c is null then raise exception 'Commune introuvable'; end if;
  if auth.uid() is null or not coalesce(
    private.is_platform_admin() or public.is_super_admin()
    or private.is_commune_admin(c),false
  ) then raise exception 'Accès refusé'; end if;
  return c;
end
$$;

-- ---------------------------------------------------------------------
-- 4. org_droit_propre
--    - admin_mairie : uniquement le module `org` (organigramme et droits),
--      jamais les modules métier, jamais via affectation/délégation.
--    - maire : tous les droits métier, SAUF l'écriture sur `org`.
--    Le reste de la fonction est inchangé.
-- ---------------------------------------------------------------------
create or replace function public.org_droit_propre(u uuid,m text,a text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare p record; o boolean;
begin
 select role,commune_id into p
 from public.profiles
 where id=u and coalesce(actif,true);
 if not found then return false; end if;
 if u=(select auth.uid()) and private.is_platform_admin() then return true; end if;
 if p.role='admin_mairie' then
   return m='org' and a in ('consulter','creer','modifier','supprimer','administrer');
 end if;
 if p.role='maire' then
   return not private.droit_reserve(m,a);
 end if;
 if p.role='super_admin' then
   return u=(select auth.uid()) and public.is_super_admin();
 end if;
 if a='consulter' then
   select autorise into o
   from public.permissions_utilisateurs
   where commune_id=p.commune_id::text and user_id=u and cle=m;
   if found then return o; end if;
 end if;
 return exists(
   select 1 from public.org_affectations f
   join public.org_postes po on po.commune_id=f.commune_id and po.code=f.poste_code and po.actif
   join public.org_roles r on r.commune_id=po.commune_id and r.code=po.role_code and r.actif
   join public.org_role_droits d on d.commune_id=r.commune_id and d.role_code=r.code
   where f.user_id=u and f.commune_id=p.commune_id and f.actif
     and f.debut<=current_date and (f.fin is null or f.fin>=current_date)
     and d.module=m and d.action=a
 );
end
$$;

-- ---------------------------------------------------------------------
-- 5. org_peut_accorder : admin_mairie peut affecter à un poste (son métier),
--    les gardes triggers ci-dessous empêchent l'auto-élévation.
-- ---------------------------------------------------------------------
create or replace function public.org_peut_accorder(p_role text)
returns boolean language sql stable security definer set search_path = ''
as $$
 select coalesce((
   select coalesce(p.actif,true) and (
     p.role::text in ('maire','admin_mairie')
     or (p.role::text='super_admin' and public.is_super_admin())
   )
   from public.profiles p where p.id=(select auth.uid())
 ),false)
 or not exists(
   select 1 from public.org_role_droits d
   where d.commune_id=public.org_commune()
     and d.role_code=p_role
     and not public.org_droit_propre((select auth.uid()),d.module,d.action)
 )
$$;

-- ---------------------------------------------------------------------
-- 6. Lecture des profils de sa commune par l'admin_mairie (annuaire des
--    comptes). Lecture seule : l'écriture reste réservée à la plateforme.
-- ---------------------------------------------------------------------
drop policy if exists profiles_lecture_admin_mairie on public.profiles;
create policy profiles_lecture_admin_mairie on public.profiles
  for select to authenticated
  using (
    commune_id is not null
    and commune_id=(select private.my_commune())
    and (select private.my_role())='admin_mairie'
  );

-- ---------------------------------------------------------------------
-- 7. GARDES ANTI-ÉLÉVATION (triggers additifs)
-- ---------------------------------------------------------------------

-- 7a. profiles : seul le privilégié crée/modifie/active/désactive un
--     admin_mairie ; personne ne change son propre rôle ou sa commune.
create or replace function private.garde_profil_roles()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare actor uuid:=(select auth.uid());
begin
  if private.appel_systeme() then return new; end if;
  if private.est_privilegie() then return new; end if;
  if tg_op='INSERT' then
    if new.role::text in ('admin_mairie','super_admin') then
      raise exception 'Seule la plateforme peut créer ce type de compte' using errcode='42501';
    end if;
    return new;
  end if;
  if (old.role::text='admin_mairie' or new.role::text='admin_mairie')
     and (old.role is distinct from new.role
          or old.commune_id is distinct from new.commune_id
          or old.actif is distinct from new.actif) then
    raise exception 'Seule la plateforme gère les administrateurs municipaux' using errcode='42501';
  end if;
  if actor is not null and new.id=actor
     and (old.role is distinct from new.role or old.commune_id is distinct from new.commune_id) then
    raise exception 'Modification de son propre rôle ou de sa commune interdite' using errcode='42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_garde_profil_roles on public.profiles;
create trigger trg_garde_profil_roles before insert or update on public.profiles
  for each row execute function private.garde_profil_roles();

-- 7b. org_affectations : un admin_mairie ne peut pas recevoir de poste
--     (sinon il obtiendrait des droits métier) ; personne ne s'affecte
--     lui-même sans privilège.
create or replace function private.garde_org_affectation()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if private.appel_systeme() or private.est_privilegie() then return new; end if;
  if tg_op='UPDATE' and new.user_id is not distinct from old.user_id
     and new.poste_code is not distinct from old.poste_code then
    return new;
  end if;
  if exists(select 1 from public.profiles p where p.id=new.user_id and p.role::text='admin_mairie') then
    raise exception 'Un administrateur municipal ne peut pas être affecté à un poste' using errcode='42501';
  end if;
  if new.user_id=(select auth.uid()) then
    raise exception 'Auto-affectation interdite' using errcode='42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_garde_org_affectation on public.org_affectations;
create trigger trg_garde_org_affectation before insert or update of user_id,poste_code,actif on public.org_affectations
  for each row execute function private.garde_org_affectation();

-- 7c. org_role_droits : les droits d'écriture sur `org` ne sont jamais
--     accordables à un poste par un acteur municipal.
create or replace function private.garde_org_role_droits()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if private.appel_systeme() or private.est_privilegie() then return new; end if;
  if private.droit_reserve(new.module,new.action) then
    raise exception 'Ce droit d''administration est réservé à la plateforme' using errcode='42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_garde_org_role_droits on public.org_role_droits;
create trigger trg_garde_org_role_droits before insert or update on public.org_role_droits
  for each row execute function private.garde_org_role_droits();

-- 7d. org_delegations_droits : pas de délégation du module d'administration
--     et pas de délégation à un admin_mairie.
create or replace function private.garde_org_delegation()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if private.appel_systeme() or private.est_privilegie() then return new; end if;
  if private.droit_reserve(new.module,new.action) then
    raise exception 'Ce droit d''administration ne peut pas être délégué' using errcode='42501';
  end if;
  if exists(select 1 from public.profiles p where p.id=new.a_user and p.role::text='admin_mairie') then
    raise exception 'Délégation à un administrateur municipal interdite' using errcode='42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_garde_org_delegation on public.org_delegations_droits;
create trigger trg_garde_org_delegation before insert or update on public.org_delegations_droits
  for each row execute function private.garde_org_delegation();

-- 7e. Journal des changements de rôle / commune / activation de profil.
create or replace function private.journaliser_profil_role()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare actor uuid:=(select auth.uid()); mail text;
begin
  select u.email into mail from auth.users u where u.id=actor;
  if tg_op='INSERT' then
    insert into public.journal_audit(commune_id,user_id,email,action,cible,detail)
    values(new.commune_id::text,actor,mail,'profil_role_change',new.id::text,
      jsonb_build_object('op','INSERT','role_apres',new.role,'actif_apres',new.actif,'commune_apres',new.commune_id));
  else
    if old.role is not distinct from new.role
       and old.commune_id is not distinct from new.commune_id
       and old.actif is not distinct from new.actif then
      return new;
    end if;
    insert into public.journal_audit(commune_id,user_id,email,action,cible,detail)
    values(coalesce(new.commune_id,old.commune_id)::text,actor,mail,'profil_role_change',new.id::text,
      jsonb_build_object('op','UPDATE',
        'role_avant',old.role,'role_apres',new.role,
        'actif_avant',old.actif,'actif_apres',new.actif,
        'commune_avant',old.commune_id,'commune_apres',new.commune_id));
  end if;
  return new;
end
$$;
drop trigger if exists trg_journaliser_profil_role_ins on public.profiles;
drop trigger if exists trg_journaliser_profil_role_upd on public.profiles;
drop trigger if exists trg_journaliser_profil_role on public.profiles;
create trigger trg_journaliser_profil_role_ins after insert on public.profiles
  for each row when (new.role::text<>'citoyen')
  execute function private.journaliser_profil_role();
create trigger trg_journaliser_profil_role_upd after update on public.profiles
  for each row when (new.role::text<>'citoyen' or old.role::text<>'citoyen')
  execute function private.journaliser_profil_role();

-- ---------------------------------------------------------------------
-- 8. saas_creer_commune : le compte créé devient ADMIN MUNICIPAL
--    (admin_mairie, inactif jusqu'à activation par la plateforme) et non
--    plus « maire ». Le maire sera attribué ensuite via admin_attribuer.
-- ---------------------------------------------------------------------
create or replace function public.saas_creer_commune(
  p_nom text,p_slug text,p_plan text,p_essai_jours integer,p_admin uuid,p_admin_nom text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare cid uuid; s text:=lower(trim(p_slug));
begin
  perform private.pgarde(array['proprietaire','admin']);
  if coalesce(trim(p_nom),'')='' then raise exception 'Nom obligatoire'; end if;
  if s !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then raise exception 'Identifiant invalide (3 à 40 caractères : a-z, 0-9, tiret)'; end if;
  if s=any(array['www','app','saas','admin','api','mairie','citoyen','mail','static','cdn','support']) then raise exception 'Identifiant réservé'; end if;
  if not exists(select 1 from public.plans where code=p_plan and actif) then raise exception 'Offre inconnue'; end if;
  if coalesce(p_essai_jours,0)<0 or coalesce(p_essai_jours,0)>90 then raise exception 'Essai : 0 à 90 jours'; end if;
  if p_admin is null or not exists(select 1 from auth.users where id=p_admin) then raise exception 'Compte administrateur municipal introuvable'; end if;
  perform 1 from public.platform_admins where user_id=p_admin for key share;
  if found then raise exception 'Un compte administrateur plateforme ne peut pas être administrateur municipal'; end if;
  perform 1 from public.profiles where id=p_admin for update;
  if found and exists(select 1 from public.profiles where id=p_admin and (commune_id is not null or coalesce(role::text,'citoyen') not in ('citoyen','admin_mairie'))) then
    raise exception 'Ce compte possède déjà une affectation municipale ou un rôle privilégié';
  end if;
  insert into public.communes(nom,slug,statut,sous_domaine,admin_principal)
  values(trim(p_nom),s,case when coalesce(p_essai_jours,0)>0 then 'essai' else 'actif' end,s,p_admin)
  returning id into cid;
  insert into public.profiles(id,role,commune_id,nom,actif)
  values(p_admin,'admin_mairie',cid,p_admin_nom,false)
  on conflict(id) do update set role='admin_mairie',commune_id=excluded.commune_id,nom=excluded.nom,actif=false
  where public.profiles.role::text in ('citoyen','admin_mairie') and public.profiles.commune_id is null;
  if not found then raise exception 'Impossible d’affecter le compte comme administrateur municipal'; end if;
  insert into public.indicateurs(commune_id)
  select cid where not exists(select 1 from public.indicateurs where commune_id=cid);
  insert into public.abonnements(commune_id,plan_code,statut,fin_essai,prochaine_echeance)
  values(cid,p_plan,case when coalesce(p_essai_jours,0)>0 then 'essai' else 'actif' end,
    case when p_essai_jours>0 then current_date+p_essai_jours end,current_date+coalesce(nullif(p_essai_jours,0),30));
  perform private.paudit('commune_creer',cid,jsonb_build_object('nom',p_nom,'slug',s,'plan',p_plan,'essai',p_essai_jours,'admin_inactif',true,'role_admin','admin_mairie'));
  return cid;
end
$$;

-- ---------------------------------------------------------------------
-- 9. Création ANTICIPÉE / affectation d'un administrateur municipal
--    (plateforme AAL2 uniquement). Réutilise un compte Auth EXISTANT :
--    ne crée aucun doublon, ne supprime rien, ne touche ni e-mail ni mot de
--    passe. Le profil reste INACTIF : l'activation est une étape distincte
--    (Edge Function sa-admin, action « activer », e-mail confirmé requis).
--      saas_preparer_admin_mairie : statut en_attente (aucune commune requise)
--      saas_affecter_admin_mairie : statut affecte (commune existante)
-- ---------------------------------------------------------------------
create or replace function private.cible_admin_mairie(p_email text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare u uuid; anon boolean;
begin
  select id,coalesce(is_anonymous,false) into u,anon from auth.users
   where lower(email)=lower(trim(p_email)) for update;
  if u is null or anon then raise exception 'Compte nominatif introuvable : il doit d’abord exister'; end if;
  perform 1 from public.platform_admins where user_id=u for key share;
  if found then raise exception 'Un compte administrateur plateforme ne peut pas être administrateur municipal'; end if;
  return u;
end
$$;
revoke all on function private.cible_admin_mairie(text) from public, anon, authenticated;

create or replace function public.saas_preparer_admin_mairie(p_email text,p_nom text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare u uuid; r text; pc uuid;
begin
  perform private.pgarde(array['proprietaire','admin']);
  u:=private.cible_admin_mairie(p_email);
  select role::text,commune_id into r,pc from public.profiles where id=u for update;
  if found then
    if r='admin_mairie' then return u; end if;
    if r<>'citoyen' or pc is not null then
      raise exception 'Ce compte possède déjà une affectation municipale ou un rôle privilégié';
    end if;
    update public.profiles set role='admin_mairie',commune_id=null,actif=false,
      nom=coalesce(nullif(trim(p_nom),''),nom) where id=u;
  else
    insert into public.profiles(id,role,commune_id,nom,actif)
    values(u,'admin_mairie',null,nullif(trim(p_nom),''),false);
  end if;
  perform private.paudit('admin_mairie_preparer',null,jsonb_build_object('user',u,'statut','en_attente'));
  return u;
end
$$;

create or replace function public.saas_affecter_admin_mairie(p_email text,p_slug text,p_nom text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare u uuid; c uuid; r text; pc uuid; pa boolean;
begin
  perform private.pgarde(array['proprietaire','admin']);
  u:=private.cible_admin_mairie(p_email);
  select id into c from public.communes where slug=lower(trim(p_slug));
  if c is null then raise exception 'Commune inconnue'; end if;
  select role::text,commune_id,coalesce(actif,false) into r,pc,pa from public.profiles where id=u for update;
  if found then
    if r='admin_mairie' and pc=c then return u; end if;
    if r='admin_mairie' and pc is not null and pa then
      raise exception 'Administrateur actif : suspendez-le avant tout changement de commune';
    end if;
    if r not in ('citoyen','admin_mairie') or (r='citoyen' and pc is not null) then
      raise exception 'Ce compte possède déjà une affectation municipale ou un rôle privilégié';
    end if;
    update public.profiles set role='admin_mairie',commune_id=c,actif=false,
      nom=coalesce(nullif(trim(p_nom),''),nom) where id=u;
  else
    insert into public.profiles(id,role,commune_id,nom,actif)
    values(u,'admin_mairie',c,nullif(trim(p_nom),''),false);
  end if;
  perform private.paudit('admin_mairie_affecter',c,jsonb_build_object('user',u,'statut','affecte'));
  return u;
end
$$;

-- Liste des administrateurs municipaux (plateforme AAL2) pour l'interface.
create or replace function public.saas_admins_mairie()
returns table(user_id uuid,email text,nom text,statut text,commune_slug text,commune_nom text,email_confirme boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.pgarde(array['proprietaire','admin']);
  return query
    select p.id,u.email::text,p.nom::text,p.statut_admin,c.slug::text,c.nom::text,(u.email_confirmed_at is not null)
    from public.profiles p
    join auth.users u on u.id=p.id
    left join public.communes c on c.id=p.commune_id
    where p.role::text='admin_mairie'
    order by p.statut_admin,u.email;
end
$$;
revoke all on function public.saas_preparer_admin_mairie(text,text) from public, anon;
revoke all on function public.saas_affecter_admin_mairie(text,text,text) from public, anon;
revoke all on function public.saas_admins_mairie() from public, anon;
grant execute on function public.saas_preparer_admin_mairie(text,text) to authenticated;
grant execute on function public.saas_affecter_admin_mairie(text,text,text) to authenticated;
grant execute on function public.saas_admins_mairie() to authenticated;

-- Recherche d'un compte par e-mail (plateforme AAL2) : évite d'inviter à
-- nouveau un compte existant lors de la création d'une mairie.
create or replace function public.saas_compte_par_email(p_email text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare r jsonb;
begin
  perform private.pgarde(array['proprietaire','admin']);
  select jsonb_build_object(
    'id',u.id,'email_confirme',u.email_confirmed_at is not null,
    'role',coalesce(p.role::text,'citoyen'),'commune_id',p.commune_id,
    'plateforme',exists(select 1 from public.platform_admins a where a.user_id=u.id)
  ) into r
  from auth.users u left join public.profiles p on p.id=u.id
  where lower(u.email)=lower(trim(p_email)) and not coalesce(u.is_anonymous,false);
  return r;
end
$$;
revoke all on function public.saas_compte_par_email(text) from public, anon;
grant execute on function public.saas_compte_par_email(text) to authenticated;

-- ---------------------------------------------------------------------
-- 10. admin_attribuer : ajoute admin_mairie à la liste (plateforme seule).
--     Le corps déployé est conservé ; admin_mairie est créé INACTIF.
-- ---------------------------------------------------------------------
create or replace function public.admin_attribuer(p_email text,p_role text,p_slug text)
returns void language plpgsql security definer set search_path = ''
as $$
declare u uuid; c uuid;
begin
  if not private.is_platform_admin() then
    raise exception 'Accès plateforme refusé : MFA AAL2 requise';
  end if;
  if p_role not in ('maire','adjoint','cabinet','secretariat','finances','rh','etat_civil','technique','agent','citoyen','admin_mairie') then
    raise exception 'Rôle invalide';
  end if;
  select id into u from auth.users
   where lower(email)=lower(trim(p_email)) and not is_anonymous for update;
  if u is null then
    raise exception 'Utilisateur introuvable : un compte nominatif doit d’abord être créé';
  end if;
  perform 1 from public.platform_admins where user_id=u for key share;
  if found then raise exception 'Un compte administrateur plateforme ne peut pas recevoir de rôle municipal'; end if;
  select id into c from public.communes where slug=lower(trim(p_slug));
  if c is null then raise exception 'Commune inconnue'; end if;
  perform 1 from public.profiles where id=u and role::text='super_admin' for update;
  if found then raise exception 'Un profil super_admin ne peut pas être modifié par cette opération'; end if;
  perform 1 from public.profiles where id=u and commune_id is not null and commune_id<>c for update;
  if found then raise exception 'Compte déjà affecté à une autre commune : transfert explicite requis'; end if;
  insert into public.profiles(id,role,commune_id,actif)
  values(u,p_role,c,case when p_role='admin_mairie' then false else true end)
  on conflict(id) do update set role=excluded.role,commune_id=excluded.commune_id,
    actif=case when excluded.role='admin_mairie' then false else public.profiles.actif end
  where public.profiles.role::text<>'super_admin'
    and (public.profiles.commune_id is null or public.profiles.commune_id=c);
  if not found then raise exception 'Attribution du rôle impossible'; end if;
  perform private.paudit('role_attribuer',c,jsonb_build_object('user',u,'role',p_role));
end
$$;

-- ---------------------------------------------------------------------
-- 11. lier_adjoint : n'écrase jamais un admin_mairie ; l'admin municipal de
--     la commune peut lier un adjoint de SA commune (administration).
-- ---------------------------------------------------------------------
create or replace function public.lier_adjoint(p_adjoint uuid, p_email text)
returns void language plpgsql security definer set search_path = ''
as $$
declare u uuid; a public.adjoints;
begin
  if not (
    coalesce(private.is_platform_admin(), false)
    or coalesce(private.my_role() in ('maire','admin_mairie'), false)
    or coalesce(public.is_super_admin(), false)
  ) then
    raise exception 'Accès refusé';
  end if;
  select * into a from public.adjoints where id = p_adjoint;
  if a.id is null or (
    not coalesce(private.is_platform_admin(), false)
    and a.commune_id is distinct from private.my_commune()
  ) then
    raise exception 'Adjoint introuvable';
  end if;
  select id into u from auth.users where lower(email) = lower(trim(p_email));
  if u is null then
    raise exception 'Aucun compte avec cet e-mail : l’administrateur doit d’abord le créer';
  end if;
  if exists (select 1 from public.profiles where id = u and commune_id is distinct from a.commune_id) then
    raise exception 'Ce compte appartient à une autre commune';
  end if;
  if exists (select 1 from public.profiles where id = u and role in ('maire','super_admin','admin_mairie')) then
    raise exception 'Ce compte a un autre rôle';
  end if;
  insert into public.profiles(id,role,commune_id)
  values (u,'adjoint',a.commune_id)
  on conflict (id) do update set role = 'adjoint', commune_id = excluded.commune_id;
  update public.adjoints set user_id = u where id = p_adjoint;
end
$$;

commit;
