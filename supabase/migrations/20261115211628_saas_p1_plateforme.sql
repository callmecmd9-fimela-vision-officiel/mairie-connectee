
alter table public.communes
 add column if not exists statut text not null default 'actif',
 add column if not exists suspendu_motif text,
 add column if not exists sous_domaine text,
 add column if not exists domaine_perso text,
 add column if not exists admin_principal uuid references auth.users(id) on delete set null;
alter table public.communes drop constraint if exists communes_statut_chk;
alter table public.communes add constraint communes_statut_chk check (statut in ('essai','actif','suspendu','resilie'));
create unique index if not exists communes_slug_uq on public.communes(slug);
create unique index if not exists communes_sous_domaine_uq on public.communes(lower(sous_domaine)) where sous_domaine is not null;
create unique index if not exists communes_domaine_uq on public.communes(lower(domaine_perso)) where domaine_perso is not null;

create table public.platform_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 niveau text not null default 'support' check (niveau in ('proprietaire','admin','support','finance')),
 actif boolean not null default true,
 created_at timestamptz not null default now());
create table public.plans(
 code text primary key, nom text not null, prix_mensuel integer not null check (prix_mensuel>=0),
 modules jsonb not null default '{}', actif boolean not null default true, ordre int not null default 0);
insert into public.plans(code,nom,prix_mensuel,ordre) values ('essentiel','Essentiel',30000,1),('professionnel','Professionnel',60000,2),('premium','Premium',120000,3);
create table public.abonnements(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null unique references public.communes(id) on delete cascade,
 plan_code text references public.plans(code),
 statut text not null default 'essai' check (statut in ('essai','actif','impaye','suspendu','resilie')),
 debut date not null default current_date, fin_essai date, prochaine_echeance date,
 prix_perso integer check (prix_perso is null or prix_perso>=0),
 options jsonb not null default '{}', created_at timestamptz not null default now());
create table public.factures(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 numero text not null unique, periode text, montant integer not null check (montant>=0),
 statut text not null default 'emise' check (statut in ('emise','payee','impayee','annulee')),
 echeance date, created_at timestamptz not null default now());
create table public.paiements(
 id uuid primary key default gen_random_uuid(),
 facture_id uuid references public.factures(id) on delete set null,
 commune_id uuid not null references public.communes(id) on delete cascade,
 montant integer not null check (montant>0),
 mode text not null check (mode in ('wave','orange_money','virement','especes','autre')),
 reference text, recu_le date not null default current_date, saisi_par uuid, created_at timestamptz not null default now());
create table public.acces_techniques(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 admin_id uuid not null, motif text not null check (length(motif)>=10),
 expire_le timestamptz not null, revoque_le timestamptz, created_at timestamptz not null default now());
create table public.platform_audit(
 id bigserial primary key, admin_id uuid, email text, action text not null,
 commune_id uuid, detail jsonb, created_at timestamptz not null default now());
create index on public.abonnements(plan_code);
create index on public.factures(commune_id);
create index on public.paiements(commune_id);
create index on public.paiements(facture_id);
create index on public.acces_techniques(commune_id);
create index on public.platform_audit(commune_id);

create or replace function private.is_platform_admin(p_niveaux text[] default null) returns boolean
language sql stable security definer set search_path='' as $$
select coalesce((select auth.jwt()->>'aal'),'')='aal2'
 and exists(select 1 from public.platform_admins a where a.user_id=(select auth.uid()) and a.actif and (p_niveaux is null or a.niveau=any(p_niveaux))) $$;
create or replace function private.pgarde(p_niveaux text[] default null) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_platform_admin(p_niveaux) then raise exception 'Accès plateforme refusé (compte autorisé et MFA requis)'; end if;
end $$;
create or replace function private.paudit(p_action text,p_commune uuid,p_detail jsonb default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into public.platform_audit(admin_id,email,action,commune_id,detail)
 select a.user_id,a.email,p_action,p_commune,p_detail from public.platform_admins a where a.user_id=(select auth.uid());
end $$;
create or replace function private.acces_actif(p_commune uuid) returns boolean
language sql stable security definer set search_path='' as $$
select exists(select 1 from public.acces_techniques t where t.commune_id=p_commune and t.admin_id=(select auth.uid()) and t.revoque_le is null and t.expire_le>now()) $$;

do $$ declare t text; begin
 foreach t in array array['platform_admins','plans','abonnements','factures','paiements','acces_techniques','platform_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy %I on public.%I for select to authenticated using ((select private.is_platform_admin()))','pf_lecture_'||t,t);
 end loop; end $$;
create policy pa_self on public.platform_admins for select to authenticated using (user_id=(select auth.uid()));

-- communes : un super_admin local ne gère que SA commune ; masquage des mairies suspendues
drop policy if exists communes_admin on public.communes;
create policy communes_admin on public.communes for all to authenticated
 using ((select private.my_role())='super_admin' and id=(select p.commune_id from public.profiles p where p.id=(select auth.uid())))
 with check ((select private.my_role())='super_admin' and id=(select p.commune_id from public.profiles p where p.id=(select auth.uid())));
drop policy if exists communes_lecture on public.communes;
create policy communes_lecture on public.communes for select using (
 statut in ('essai','actif') or id=(select p.commune_id from public.profiles p where p.id=(select auth.uid())) or (select private.is_platform_admin()));

-- suspension = blocage serveur (même mécanisme que la maintenance), y compris super_admin local
create or replace function private.hors_maintenance() returns boolean
language sql stable security definer set search_path='' as $$
select not exists(select 1 from public.communes c join public.profiles p on p.commune_id=c.id where p.id=(select auth.uid()) and c.statut in ('suspendu','resilie'))
 and (coalesce((select p.role='super_admin' from public.profiles p where p.id=(select auth.uid())),false)
 or not exists (select 1 from public.parametres_systeme s
   where s.cle='maintenance' and jsonb_typeof(s.valeur)='object' and coalesce((s.valeur->>'actif')::boolean,false)
   and s.commune_id=(select p.commune_id::text from public.profiles p where p.id=(select auth.uid())))) $$;

create or replace function public.saas_creer_commune(p_nom text,p_slug text,p_plan text,p_essai_jours int,p_admin uuid,p_admin_nom text) returns uuid
language plpgsql security definer set search_path='' as $$
declare cid uuid; s text:=lower(trim(p_slug));
begin
 perform private.pgarde(array['proprietaire','admin']);
 if coalesce(trim(p_nom),'')='' then raise exception 'Nom obligatoire'; end if;
 if s !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then raise exception 'Identifiant invalide (3 à 40 caractères : a-z, 0-9, tiret)'; end if;
 if s = any(array['www','app','saas','admin','api','mairie','citoyen','mail','static','cdn','support']) then raise exception 'Identifiant réservé'; end if;
 if not exists(select 1 from public.plans where code=p_plan and actif) then raise exception 'Offre inconnue'; end if;
 if coalesce(p_essai_jours,0)<0 or coalesce(p_essai_jours,0)>90 then raise exception 'Essai : 0 à 90 jours'; end if;
 insert into public.communes(nom,slug,statut,sous_domaine,admin_principal) values (trim(p_nom),s,case when coalesce(p_essai_jours,0)>0 then 'essai' else 'actif' end,s,p_admin) returning id into cid;
 insert into public.profiles(id,role,commune_id,nom,actif) values (p_admin,'maire',cid,p_admin_nom,true);
 insert into public.indicateurs(commune_id) select cid where not exists(select 1 from public.indicateurs where commune_id=cid);
 insert into public.abonnements(commune_id,plan_code,statut,fin_essai,prochaine_echeance)
  values (cid,p_plan,case when coalesce(p_essai_jours,0)>0 then 'essai' else 'actif' end,
   case when p_essai_jours>0 then current_date+p_essai_jours end, current_date+coalesce(nullif(p_essai_jours,0),30));
 perform private.paudit('commune_creer',cid,jsonb_build_object('nom',p_nom,'slug',s,'plan',p_plan,'essai',p_essai_jours));
 return cid;
end $$;

create or replace function public.saas_set_statut(p_commune uuid,p_statut text,p_motif text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.pgarde(array['proprietaire','admin']);
 if p_statut not in ('actif','essai','suspendu','resilie') then raise exception 'Statut invalide'; end if;
 if p_statut in ('suspendu','resilie') and coalesce(length(trim(p_motif)),0)<5 then raise exception 'Motif obligatoire'; end if;
 update public.communes set statut=p_statut,suspendu_motif=case when p_statut in ('suspendu','resilie') then p_motif end where id=p_commune;
 if not found then raise exception 'Mairie introuvable'; end if;
 update public.abonnements set statut=case p_statut when 'suspendu' then 'suspendu' when 'resilie' then 'resilie' when 'essai' then 'essai' else 'actif' end where commune_id=p_commune;
 perform private.paudit('commune_statut',p_commune,jsonb_build_object('statut',p_statut,'motif',p_motif));
end $$;

create or replace function public.saas_liste_communes() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r jsonb; begin
 perform private.pgarde();
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'nom',c.nom,'statut',c.statut,'sous_domaine',c.sous_domaine,'domaine_perso',c.domaine_perso,'created_at',c.created_at,
  'plan',a.plan_code,'abo_statut',a.statut,'echeance',a.prochaine_echeance,'fin_essai',a.fin_essai,
  'users',(select count(*) from public.profiles p where p.commune_id=c.id and p.actif is not false),
  'demandes',(select count(*) from public.demandes d where d.commune_id=c.id)) order by c.nom),'[]')
 into r from public.communes c left join public.abonnements a on a.commune_id=c.id;
 return r; end $$;

create or replace function public.saas_stats() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r jsonb; begin
 perform private.pgarde();
 select jsonb_build_object(
  'mairies',(select count(*) from public.communes),
  'par_statut',(select coalesce(jsonb_object_agg(statut,n),'{}') from (select statut,count(*) n from public.communes group by 1) s),
  'utilisateurs',(select count(*) from public.profiles where actif is not false),
  'demandes',(select count(*) from public.demandes),
  'abonnements_actifs',(select count(*) from public.abonnements where statut='actif'),
  'mrr',(select coalesce(sum(coalesce(a.prix_perso,p.prix_mensuel)),0) from public.abonnements a join public.plans p on p.code=a.plan_code where a.statut='actif'),
  'impayes',(select coalesce(sum(montant),0) from public.factures where statut in ('emise','impayee')),
  'incidents_ouverts',(select count(*) from public.incidents where statut<>'resolu'),
  'inscriptions',(select coalesce(jsonb_agg(jsonb_build_object('m',m,'n',n) order by m),'[]') from (select to_char(date_trunc('month',created_at),'YYYY-MM') m,count(*) n from public.communes where created_at>=date_trunc('month',now())-interval '11 months' group by 1) s)
 ) into r; return r; end $$;

create or replace function public.saas_acces_ouvrir(p_commune uuid,p_motif text,p_minutes int default 60) returns uuid
language plpgsql security definer set search_path='' as $$
declare i uuid; begin
 perform private.pgarde(array['proprietaire','admin','support']);
 if coalesce(length(trim(p_motif)),0)<10 then raise exception 'Motif détaillé obligatoire (10 caractères min.)'; end if;
 if p_minutes<5 or p_minutes>240 then raise exception 'Durée : 5 à 240 minutes'; end if;
 if not exists(select 1 from public.communes where id=p_commune) then raise exception 'Mairie introuvable'; end if;
 insert into public.acces_techniques(commune_id,admin_id,motif,expire_le) values (p_commune,(select auth.uid()),trim(p_motif),now()+make_interval(mins=>p_minutes)) returning id into i;
 perform private.paudit('acces_ouvert',p_commune,jsonb_build_object('acces',i,'minutes',p_minutes,'motif',p_motif));
 return i; end $$;
create or replace function public.saas_acces_fermer(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c uuid; begin
 perform private.pgarde(array['proprietaire','admin','support']);
 update public.acces_techniques set revoque_le=now() where id=p_id and revoque_le is null and (admin_id=(select auth.uid()) or private.is_platform_admin(array['proprietaire'])) returning commune_id into c;
 if c is null then raise exception 'Accès introuvable ou déjà clos'; end if;
 perform private.paudit('acces_ferme',c,jsonb_build_object('acces',p_id)); end $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and p.proname like 'saas\_%') or (n.nspname='private' and p.proname in ('is_platform_admin','pgarde','paudit','acces_actif')) loop
  execute format('revoke execute on function %s from public, anon',f.sig);
  execute format('grant execute on function %s to authenticated',f.sig);
 end loop; end $$;
