
alter table public.abonnements alter column options set default '[]';
update public.abonnements set options='[]' where jsonb_typeof(options)<>'array';
create sequence if not exists public.facture_seq;
create or replace function private.prix_abo(a public.abonnements) returns integer language sql stable set search_path='' as $$
select coalesce(a.prix_perso,(select p.prix_mensuel from public.plans p where p.code=a.plan_code),0)
 + coalesce((select sum((o->>'prix')::int) from jsonb_array_elements(a.options) o),0)::int $$;

create or replace function public.saas_plan_maj(p_code text,p_nom text,p_prix int,p_actif boolean,p_ordre int default 0) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.pgarde(array['proprietaire','admin']);
 if p_code !~ '^[a-z0-9_]{2,30}$' then raise exception 'Code invalide (a-z, 0-9, _)'; end if;
 if coalesce(trim(p_nom),'')='' or p_prix<0 then raise exception 'Nom et prix valides requis'; end if;
 insert into public.plans(code,nom,prix_mensuel,actif,ordre) values (p_code,trim(p_nom),p_prix,coalesce(p_actif,true),coalesce(p_ordre,0))
 on conflict (code) do update set nom=excluded.nom,prix_mensuel=excluded.prix_mensuel,actif=excluded.actif,ordre=excluded.ordre;
 perform private.paudit('plan_maj',null,jsonb_build_object('code',p_code,'prix',p_prix,'actif',p_actif));
end $$;

create or replace function public.saas_abo_maj(p_commune uuid,p_plan text,p_statut text,p_prix_perso int,p_fin_essai date,p_echeance date,p_options jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare o jsonb;
begin
 perform private.pgarde(array['proprietaire','admin','finance']);
 if not exists(select 1 from public.communes where id=p_commune) then raise exception 'Mairie introuvable'; end if;
 if not exists(select 1 from public.plans where code=p_plan) then raise exception 'Offre inconnue'; end if;
 if p_statut not in ('essai','actif','impaye','suspendu','resilie') then raise exception 'Statut invalide'; end if;
 if p_prix_perso is not null and p_prix_perso<0 then raise exception 'Prix invalide'; end if;
 p_options:=coalesce(p_options,'[]');
 if jsonb_typeof(p_options)<>'array' then raise exception 'Options invalides'; end if;
 for o in select * from jsonb_array_elements(p_options) loop
  if coalesce(o->>'nom','')='' or (o->>'prix') !~ '^[0-9]{1,9}$' then raise exception 'Option invalide (nom et prix entier requis)'; end if;
 end loop;
 insert into public.abonnements(commune_id,plan_code,statut,fin_essai,prochaine_echeance,prix_perso,options)
 values (p_commune,p_plan,p_statut,p_fin_essai,p_echeance,p_prix_perso,p_options)
 on conflict (commune_id) do update set plan_code=excluded.plan_code,statut=excluded.statut,fin_essai=excluded.fin_essai,prochaine_echeance=excluded.prochaine_echeance,prix_perso=excluded.prix_perso,options=excluded.options;
 perform private.paudit('abo_maj',p_commune,jsonb_build_object('plan',p_plan,'statut',p_statut,'prix_perso',p_prix_perso));
end $$;

create or replace function public.saas_facture_creer(p_commune uuid,p_periode text,p_montant int default null,p_echeance date default null) returns text
language plpgsql security definer set search_path='' as $$
declare a public.abonnements; m int; n text;
begin
 perform private.pgarde(array['proprietaire','admin','finance']);
 select * into a from public.abonnements where commune_id=p_commune;
 if not found then raise exception 'Aucun abonnement pour cette mairie'; end if;
 if p_periode !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Période invalide (AAAA-MM)'; end if;
 if exists(select 1 from public.factures where commune_id=p_commune and periode=p_periode and statut<>'annulee') then raise exception 'Une facture existe déjà pour cette période'; end if;
 m:=coalesce(p_montant,private.prix_abo(a));
 if m<=0 then raise exception 'Montant nul : renseignez un montant'; end if;
 n:='FAC-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.facture_seq')::text,5,'0');
 insert into public.factures(commune_id,numero,periode,montant,echeance) values (p_commune,n,p_periode,m,coalesce(p_echeance,current_date+15));
 perform private.paudit('facture_creer',p_commune,jsonb_build_object('numero',n,'montant',m));
 return n;
end $$;

create or replace function public.saas_facture_annuler(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f public.factures;
begin
 perform private.pgarde(array['proprietaire','admin','finance']);
 select * into f from public.factures where id=p_id for update;
 if not found then raise exception 'Facture introuvable'; end if;
 if f.statut='payee' or exists(select 1 from public.paiements where facture_id=p_id) then raise exception 'Facture déjà encaissée (totalement ou partiellement)'; end if;
 update public.factures set statut='annulee' where id=p_id;
 perform private.paudit('facture_annuler',f.commune_id,jsonb_build_object('numero',f.numero));
end $$;

create or replace function public.saas_paiement_enreg(p_facture uuid,p_montant int,p_mode text,p_reference text,p_date date) returns void
language plpgsql security definer set search_path='' as $$
declare f public.factures; paid int;
begin
 perform private.pgarde(array['proprietaire','admin','finance']);
 select * into f from public.factures where id=p_facture for update;
 if not found then raise exception 'Facture introuvable'; end if;
 if f.statut in ('payee','annulee') then raise exception 'Facture déjà soldée ou annulée'; end if;
 select coalesce(sum(montant),0) into paid from public.paiements where facture_id=p_facture;
 if p_montant<=0 or p_montant>f.montant-paid then raise exception 'Montant invalide (reste à payer : % FCFA)',f.montant-paid; end if;
 insert into public.paiements(facture_id,commune_id,montant,mode,reference,recu_le,saisi_par) values (p_facture,f.commune_id,p_montant,p_mode,nullif(trim(p_reference),''),coalesce(p_date,current_date),(select auth.uid()));
 if paid+p_montant>=f.montant then
  update public.factures set statut='payee' where id=p_facture;
  update public.abonnements set statut=case when statut in ('essai','impaye') then 'actif' else statut end,
   prochaine_echeance=(greatest(coalesce(prochaine_echeance,current_date),current_date)+interval '1 month')::date where commune_id=f.commune_id and statut not in ('suspendu','resilie');
  update public.communes set statut='actif' where id=f.commune_id and statut='essai';
 end if;
 perform private.paudit('paiement',f.commune_id,jsonb_build_object('numero',f.numero,'montant',p_montant,'mode',p_mode));
end $$;

create or replace function public.saas_relances() returns jsonb
language plpgsql security definer set search_path='' as $$
declare a int; b int; c int;
begin
 perform private.pgarde(array['proprietaire','admin','finance']);
 update public.factures set statut='impayee' where statut='emise' and echeance<current_date; get diagnostics a=row_count;
 update public.abonnements x set statut='impaye' where x.statut='actif' and exists(select 1 from public.factures f where f.commune_id=x.commune_id and f.statut='impayee'); get diagnostics b=row_count;
 select count(*) into c from public.abonnements where statut='essai' and fin_essai<current_date;
 if a+b>0 then perform private.paudit('relances',null,jsonb_build_object('factures',a,'abonnements',b)); end if;
 return jsonb_build_object('factures_impayees',a,'abonnements_impayes',b,'essais_expires',c);
end $$;

create or replace function public.saas_liste_abos() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r jsonb;
begin
 perform private.pgarde();
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'nom',c.nom,'slug',c.slug,'plan',a.plan_code,'statut',a.statut,'fin_essai',a.fin_essai,'echeance',a.prochaine_echeance,
  'prix_perso',a.prix_perso,'options',a.options,'mensuel',case when a.id is null then null else private.prix_abo(a) end) order by c.nom),'[]') into r
 from public.communes c left join public.abonnements a on a.commune_id=c.id;
 return r;
end $$;

create or replace function public.saas_modules_get(p_commune uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.pgarde();
 return coalesce((select valeur from public.parametres_systeme where commune_id=p_commune::text and cle='modules'),'{}'::jsonb);
end $$;
create or replace function public.saas_modules_set(p_commune uuid,p_modules jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare k text;
begin
 perform private.pgarde(array['proprietaire','admin']);
 if jsonb_typeof(p_modules)<>'object' then raise exception 'Valeur invalide'; end if;
 for k in select jsonb_object_keys(p_modules) loop
  if k not in ('cabinet','adjoints','administration','developpement','conseil','citoyens','pilotage','finances','portail_adjoint','portail_secretariat') then raise exception 'Module inconnu : %',k; end if;
  if jsonb_typeof(p_modules->k)<>'boolean' then raise exception 'Valeur invalide pour %',k; end if;
 end loop;
 if not exists(select 1 from public.communes where id=p_commune) then raise exception 'Mairie introuvable'; end if;
 insert into public.parametres_systeme(commune_id,cle,valeur,updated_by) values (p_commune::text,'modules',p_modules,(select auth.uid()))
 on conflict (commune_id,cle) do update set valeur=excluded.valeur,updated_at=now(),updated_by=(select auth.uid());
 perform private.paudit('modules_maj',p_commune,p_modules);
end $$;

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
  'mrr',(select coalesce(sum(private.prix_abo(a)),0) from public.abonnements a where a.statut='actif'),
  'revenu_mois',(select coalesce(sum(montant),0) from public.paiements where date_trunc('month',recu_le)=date_trunc('month',current_date)),
  'revenu_annuel',(select coalesce(sum(montant),0) from public.paiements where extract(year from recu_le)=extract(year from current_date)),
  'impayes',(select coalesce(sum(f.montant-coalesce((select sum(p.montant) from public.paiements p where p.facture_id=f.id),0)),0) from public.factures f where f.statut in ('emise','impayee')),
  'incidents_ouverts',(select count(*) from public.incidents where statut<>'resolu'),
  'inscriptions',(select coalesce(jsonb_agg(jsonb_build_object('m',m,'n',n) order by m),'[]') from (select to_char(date_trunc('month',created_at),'YYYY-MM') m,count(*) n from public.communes where created_at>=date_trunc('month',now())-interval '11 months' group by 1) s)
 ) into r; return r; end $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('saas_plan_maj','saas_abo_maj','saas_facture_creer','saas_facture_annuler','saas_paiement_enreg','saas_relances','saas_liste_abos','saas_modules_get','saas_modules_set','saas_stats') loop
  execute format('revoke execute on function %s from public, anon',f.sig);
  execute format('grant execute on function %s to authenticated',f.sig);
 end loop; end $$;
