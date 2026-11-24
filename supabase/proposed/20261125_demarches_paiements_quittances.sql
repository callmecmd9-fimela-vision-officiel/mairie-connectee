-- Démarches payantes, encaissement, quittance vérifiable (QR) et livraison du document final.
-- Table réelle des demandes : public.demandes (« demandes_services » dans le cahier des charges). Isolation par commune_id partout.

-- 1. paiements_taxes : référence générée par PostgreSQL (jamais par le client)
create table if not exists public.paiements_taxes(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 citoyen_id uuid references auth.users(id) on delete set null,
 type_taxe text not null,
 montant numeric not null check(montant>=0),
 reference_paiement text,
 statut text not null default 'en_attente',
 quittance_url text,
 created_at timestamptz not null default now());
alter table public.paiements_taxes
 add column if not exists demande_id uuid references public.demandes(id) on delete set null,
 add column if not exists nom text check(nom is null or char_length(nom)<=120),
 add column if not exists source text not null default 'taxe' check(source in('taxe','en_ligne_simule','guichet')),
 add column if not exists date_paiement timestamptz;
update public.paiements_taxes set reference_paiement='QT-'||upper(replace(gen_random_uuid()::text,'-','')) where reference_paiement is null;
update public.paiements_taxes p set reference_paiement='QT-'||upper(replace(gen_random_uuid()::text,'-',''))
 where p.id in(select id from(select id,row_number() over(partition by reference_paiement order by created_at,id) rn from public.paiements_taxes) x where rn>1);
update public.paiements_taxes set date_paiement=coalesce(date_paiement,created_at) where statut='paye' and date_paiement is null;
alter table public.paiements_taxes
 alter column reference_paiement set default('QT-'||upper(replace(gen_random_uuid()::text,'-',''))),
 alter column reference_paiement set not null;
create unique index if not exists paiements_taxes_reference_uq on public.paiements_taxes(reference_paiement);
create index if not exists paiements_taxes_demande_idx on public.paiements_taxes(demande_id) where demande_id is not null;
create index if not exists paiements_taxes_commune_idx on public.paiements_taxes(commune_id,created_at desc);

create or replace function public.trg_ptx_garde() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.reference_paiement:='QT-'||upper(replace(gen_random_uuid()::text,'-',''));
  if new.statut='paye' then new.date_paiement:=coalesce(new.date_paiement,now()); end if;
  return new;
 end if;
 if new.reference_paiement is distinct from old.reference_paiement or new.montant is distinct from old.montant
  or new.commune_id is distinct from old.commune_id or new.citoyen_id is distinct from old.citoyen_id
  or new.demande_id is distinct from old.demande_id then raise exception 'Champ non modifiable'; end if;
 if new.statut='paye' and old.statut is distinct from 'paye' then
  new.date_paiement:=coalesce(new.date_paiement,now());
  if new.demande_id is not null then
   perform set_config('app.paiement_rpc','1',true);
   update public.demandes set statut_paiement='paye',mode_paiement=coalesce(mode_paiement,'guichet') where id=new.demande_id and commune_id=new.commune_id;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.trg_ptx_garde() from public,anon,authenticated;
drop trigger if exists ptx_garde on public.paiements_taxes;
create trigger ptx_garde before insert or update on public.paiements_taxes for each row execute function public.trg_ptx_garde();
-- le client ne peut plus fournir la référence ni la date
revoke insert on public.paiements_taxes from authenticated;
grant insert(commune_id,citoyen_id,type_taxe,montant,statut) on public.paiements_taxes to authenticated;

-- 2. demandes : montant, paiement, échéance, téléphone, document final
alter table public.demandes
 add column if not exists montant numeric not null default 0 check(montant>=0),
 add column if not exists statut_paiement text not null default 'non_paye' check(statut_paiement in('non_paye','paye','gratuit')),
 add column if not exists date_limite timestamptz,
 add column if not exists telephone text check(telephone is null or telephone ~ '^\+?[0-9 ]{8,16}$'),
 add column if not exists mode_paiement text check(mode_paiement in('en_ligne','guichet')),
 add column if not exists document_url text check(document_url is null or char_length(document_url)<=200);
update public.demandes set statut_paiement='gratuit' where montant=0 and statut_paiement='non_paye';
create index if not exists demandes_paiement_idx on public.demandes(commune_id,statut_paiement,date_limite);

-- 3. tarifs_demarches
create table if not exists public.tarifs_demarches(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 type_service text not null check(char_length(trim(type_service)) between 2 and 120),
 montant numeric not null check(montant>=0 and montant<=10000000),
 updated_at timestamptz not null default now(),
 unique(commune_id,type_service));
alter table public.tarifs_demarches enable row level security;
drop policy if exists tarifs_staff_sel on public.tarifs_demarches;
create policy tarifs_staff_sel on public.tarifs_demarches for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=tarifs_demarches.commune_id and p.role in('maire','adjoint','cabinet','secretariat','finances','agent','etat_civil','technique')));
revoke all on public.tarifs_demarches from anon,authenticated;
grant select on public.tarifs_demarches to authenticated;

-- 4. calcul serveur du montant et de l'échéance à la création (le client ne décide jamais du prix)
create or replace function public.trg_demande_tarif() returns trigger language plpgsql security definer set search_path='' as $$
declare m numeric;
begin
 select t.montant into m from public.tarifs_demarches t where t.commune_id=new.commune_id
  and lower(t.type_service) in(lower(coalesce(new.objet,'')),lower(new.type)) order by (lower(t.type_service)=lower(coalesce(new.objet,''))) desc limit 1;
 new.montant:=coalesce(m,0);
 new.statut_paiement:=case when new.montant=0 then 'gratuit' else 'non_paye' end;
 new.mode_paiement:=null; new.document_url:=null;
 new.date_limite:=now()+interval '15 days';
 return new;
end $$;
revoke all on function public.trg_demande_tarif() from public,anon,authenticated;
drop trigger if exists demande_tarif on public.demandes;
create trigger demande_tarif before insert on public.demandes for each row execute function public.trg_demande_tarif();

-- 5. colonnes financières protégées : modifiables uniquement par les fonctions ci-dessous
create or replace function public.trg_demande_fin_garde() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.montant is distinct from old.montant or new.statut_paiement is distinct from old.statut_paiement or new.date_limite is distinct from old.date_limite
  or new.telephone is distinct from old.telephone or new.mode_paiement is distinct from old.mode_paiement or new.document_url is distinct from old.document_url)
  and coalesce(current_setting('app.paiement_rpc',true),'')<>'1' and current_user in('authenticated','anon') then
  raise exception 'Champ protégé';
 end if;
 return new;
end $$;
revoke all on function public.trg_demande_fin_garde() from public,anon,authenticated;
drop trigger if exists demande_fin_garde on public.demandes;
create trigger demande_fin_garde before update on public.demandes for each row execute function public.trg_demande_fin_garde();

-- 6. fonctions publiques / citoyen
create or replace function public.tarifs_commune(p_commune text)
returns table(type_service text,montant numeric) language sql stable security definer set search_path='' as $$
 select t.type_service,t.montant from public.tarifs_demarches t join public.communes c on c.id=t.commune_id
 where c.slug=p_commune and c.statut in('essai','actif') order by t.type_service $$;
revoke all on function public.tarifs_commune(text) from public;
grant execute on function public.tarifs_commune(text) to anon,authenticated;

create or replace function public.choisir_paiement_demande(p_commune text,p_numero text,p_telephone text,p_mode text)
returns table(statut_paiement text,montant numeric,reference text) language plpgsql security definer set search_path='' as $$
declare d public.demandes; r text; tel text:=regexp_replace(trim(coalesce(p_telephone,'')),'\s+',' ','g');
begin
 if auth.uid() is null then raise exception 'Session citoyenne requise'; end if;
 if tel !~ '^\+?[0-9 ]{8,16}$' then raise exception 'Téléphone invalide'; end if;
 if p_mode not in('en_ligne','guichet') then raise exception 'Mode invalide'; end if;
 select x.* into d from public.demandes x join public.communes c on c.id=x.commune_id
  where c.slug=p_commune and x.numero=upper(trim(p_numero)) and x.citoyen_id=auth.uid() for update of x;
 if d.id is null then raise exception 'Demande introuvable'; end if;
 perform set_config('app.paiement_rpc','1',true);
 if d.statut_paiement='gratuit' then
  update public.demandes set telephone=tel where id=d.id;
  return query select 'gratuit'::text,d.montant,null::text; return;
 end if;
 if d.statut_paiement<>'non_paye' or d.mode_paiement is not null then raise exception 'Paiement déjà choisi'; end if;
 if p_mode='guichet' then
  update public.demandes set telephone=tel,mode_paiement='guichet' where id=d.id;
  return query select 'non_paye'::text,d.montant,null::text; return;
 end if;
 insert into public.paiements_taxes(commune_id,citoyen_id,type_taxe,montant,statut,demande_id,nom,source)
  values(d.commune_id,auth.uid(),coalesce(nullif(d.objet,''),d.type),d.montant,'paye',d.id,d.nom,'en_ligne_simule') returning reference_paiement into r;
 update public.demandes set telephone=tel,mode_paiement='en_ligne',statut_paiement='paye' where id=d.id;
 return query select 'paye'::text,d.montant,r;
end $$;
revoke all on function public.choisir_paiement_demande(text,text,text,text) from public,anon;
grant execute on function public.choisir_paiement_demande(text,text,text,text) to authenticated;

create or replace function public.paiement_demande(p_commune text,p_numero text)
returns table(montant numeric,statut_paiement text,reference text,date_limite timestamptz,mode_paiement text,document_url text) language sql stable security definer set search_path='' as $$
 select d.montant,d.statut_paiement,(select p.reference_paiement from public.paiements_taxes p where p.demande_id=d.id and p.statut='paye' order by p.created_at desc limit 1),d.date_limite,d.mode_paiement,d.document_url
 from public.demandes d join public.communes c on c.id=d.commune_id
 where c.slug=p_commune and d.numero=upper(trim(p_numero))
  and (upper(trim(p_numero)) ~ '^[A-Z0-9]{3}-[0-9]{4}-[0-9A-F]{32}$' or (auth.uid() is not null and d.citoyen_id=auth.uid())) $$;
revoke all on function public.paiement_demande(text,text) from public;
grant execute on function public.paiement_demande(text,text) to anon,authenticated;

-- 7. vérification anti-fraude (sans connexion) : la référence non devinable est le secret
create or replace function public.verifier_quittance(p_ref text)
returns table(nom text,montant numeric,date_paiement timestamptz,commune text,objet text,source text) language sql stable security definer set search_path='' as $$
 select coalesce(p.nom,(select nullif(trim(coalesce(ci.prenom,'')||' '||coalesce(ci.nom,'')),'') from public.citoyens ci where ci.user_id=p.citoyen_id)),
  p.montant,coalesce(p.date_paiement,p.created_at),c.nom,p.type_taxe,p.source
 from public.paiements_taxes p join public.communes c on c.id=p.commune_id
 where upper(trim(p_ref)) ~ '^[A-Z0-9-]{10,60}$' and p.reference_paiement=upper(trim(p_ref)) and p.statut='paye' $$;
revoke all on function public.verifier_quittance(text) from public;
grant execute on function public.verifier_quittance(text) to anon,authenticated;

-- 8. fonctions mairie (rôle + commune vérifiés côté serveur)
create or replace function public.mairie_role_ok(p_commune uuid,p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.commune_id=p_commune and p.role=any(p_roles)) $$;
revoke all on function public.mairie_role_ok(uuid,text[]) from public,anon,authenticated;

create or replace function public.definir_tarif(p_type_service text,p_montant numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; i uuid; t text:=regexp_replace(trim(coalesce(p_type_service,'')),'\s+',' ','g');
begin
 select p.commune_id into cid from public.profiles p where p.id=auth.uid() and p.role in('maire','finances','secretariat');
 if cid is null then raise exception 'Droits insuffisants'; end if;
 if char_length(t) not between 2 and 120 or p_montant is null or p_montant<0 or p_montant>10000000 or p_montant<>trunc(p_montant) then raise exception 'Tarif invalide'; end if;
 insert into public.tarifs_demarches(commune_id,type_service,montant) values(cid,t,p_montant)
  on conflict(commune_id,type_service) do update set montant=excluded.montant,updated_at=now() returning id into i;
 return i;
end $$;
revoke all on function public.definir_tarif(text,numeric) from public,anon;
grant execute on function public.definir_tarif(text,numeric) to authenticated;

create or replace function public.supprimer_tarif(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 select p.commune_id into cid from public.profiles p where p.id=auth.uid() and p.role in('maire','finances','secretariat');
 if cid is null then raise exception 'Droits insuffisants'; end if;
 delete from public.tarifs_demarches where id=p_id and commune_id=cid;
 return found;
end $$;
revoke all on function public.supprimer_tarif(uuid) from public,anon;
grant execute on function public.supprimer_tarif(uuid) to authenticated;

create or replace function public.encaisser_demande(p_demande uuid) returns text language plpgsql security definer set search_path='' as $$
declare d public.demandes; r text;
begin
 select * into d from public.demandes where id=p_demande for update;
 if d.id is null or not public.mairie_role_ok(d.commune_id,array['maire','finances','secretariat','agent']) then raise exception 'Droits insuffisants'; end if;
 if d.statut in('rejetee','cloturee') then raise exception 'Demande close'; end if;
 if d.statut_paiement<>'non_paye' or d.montant<=0 then raise exception 'Rien à encaisser'; end if;
 perform set_config('app.paiement_rpc','1',true);
 insert into public.paiements_taxes(commune_id,citoyen_id,type_taxe,montant,statut,demande_id,nom,source)
  values(d.commune_id,d.citoyen_id,coalesce(nullif(d.objet,''),d.type),d.montant,'paye',d.id,d.nom,'guichet') returning reference_paiement into r;
 update public.demandes set statut_paiement='paye',mode_paiement='guichet' where id=d.id;
 return r;
end $$;
revoke all on function public.encaisser_demande(uuid) from public,anon;
grant execute on function public.encaisser_demande(uuid) to authenticated;

create or replace function public.rejeter_demande(p_demande uuid,p_motif text) returns boolean language plpgsql security definer set search_path='' as $$
declare d public.demandes; m text:=trim(coalesce(p_motif,''));
begin
 select * into d from public.demandes where id=p_demande for update;
 if d.id is null or not public.mairie_role_ok(d.commune_id,array['maire','adjoint','cabinet','secretariat','agent','etat_civil','technique']) then raise exception 'Droits insuffisants'; end if;
 if char_length(m) not between 5 and 500 then raise exception 'Motif obligatoire'; end if;
 if d.statut in('rejetee','cloturee') or d.document_url is not null then raise exception 'Demande close'; end if;
 update public.demandes set statut='rejetee',reponse=m where id=d.id;
 return true;
end $$;
revoke all on function public.rejeter_demande(uuid,text) from public,anon;
grant execute on function public.rejeter_demande(uuid,text) to authenticated;

create or replace function public.delivrer_demande(p_demande uuid,p_path text) returns boolean language plpgsql security definer set search_path='' as $$
declare d public.demandes;
begin
 select * into d from public.demandes where id=p_demande for update;
 if d.id is null or not public.mairie_role_ok(d.commune_id,array['maire','adjoint','cabinet','secretariat','agent','etat_civil','technique']) then raise exception 'Droits insuffisants'; end if;
 if d.statut_paiement not in('paye','gratuit') then raise exception 'Paiement requis'; end if;
 if d.statut in('rejetee','cloturee') then raise exception 'Demande close'; end if;
 if p_path !~* ('^'||d.commune_id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$')
  or not exists(select 1 from storage.objects o where o.bucket_id='documents-delivres' and o.name=p_path) then raise exception 'Document invalide'; end if;
 perform set_config('app.paiement_rpc','1',true);
 update public.demandes set document_url=p_path,statut='traitee',
  reponse='Votre document est prêt : téléchargez-le depuis le suivi de votre dossier.' where id=d.id;
 return true;
end $$;
revoke all on function public.delivrer_demande(uuid,text) from public,anon;
grant execute on function public.delivrer_demande(uuid,text) to authenticated;

-- 9. stockage privé des documents délivrés (PDF, 5 Mo, un dossier par commune)
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('documents-delivres','documents-delivres',false,5242880,array['application/pdf']) on conflict(id) do nothing;
drop policy if exists docdel_staff_ins on storage.objects;
drop policy if exists docdel_staff_sel on storage.objects;
drop policy if exists docdel_cit_sel on storage.objects;
create policy docdel_staff_ins on storage.objects for insert to authenticated
 with check(bucket_id='documents-delivres' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id::text=split_part(name,'/',1) and p.role in('maire','adjoint','cabinet','secretariat','agent','etat_civil','technique')));
create policy docdel_staff_sel on storage.objects for select to authenticated
 using(bucket_id='documents-delivres' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id::text=split_part(name,'/',1)));
create policy docdel_cit_sel on storage.objects for select to authenticated
 using(bucket_id='documents-delivres' and exists(select 1 from public.demandes d where d.document_url=name and d.citoyen_id=(select auth.uid())));
