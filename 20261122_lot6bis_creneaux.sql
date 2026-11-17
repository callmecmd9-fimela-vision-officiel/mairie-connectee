-- Lot 6 bis : jours/heures de rendez-vous, créneaux libres, annulation par le citoyen (idempotent)
-- À appliquer APRÈS 20261121_lot6_rdv.sql

-- 1) Planning de rendez-vous par commune (saisi par la mairie, jamais inventé)
create table if not exists public.rdv_planning(
 commune_id uuid primary key references public.communes(id) on delete cascade,
 actif boolean not null default false,
 jours int[] not null default '{1,2,3,4,5}',
 heure_debut time not null default '08:00',
 heure_fin time not null default '17:00',
 pause_debut time default '12:30',
 pause_fin time default '14:00',
 duree_min int not null default 30,
 updated_at timestamptz not null default now(),
 constraint rdvp_jours check(jours <@ array[1,2,3,4,5,6,7] and cardinality(jours)>=1),
 constraint rdvp_heures check(heure_fin>heure_debut),
 constraint rdvp_pause check((pause_debut is null and pause_fin is null) or (pause_debut is not null and pause_fin is not null and pause_fin>pause_debut and pause_debut>=heure_debut and pause_fin<=heure_fin)),
 constraint rdvp_duree check(duree_min between 10 and 120));
alter table public.rdv_planning enable row level security;
drop policy if exists rdvp_staff_sel on public.rdv_planning;
drop policy if exists rdvp_staff_ins on public.rdv_planning;
drop policy if exists rdvp_staff_upd on public.rdv_planning;
create policy rdvp_staff_sel on public.rdv_planning for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=rdv_planning.commune_id and p.role in('maire','cabinet','secretariat')));
create policy rdvp_staff_ins on public.rdv_planning for insert to authenticated
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=rdv_planning.commune_id and p.role in('maire','cabinet','secretariat')));
create policy rdvp_staff_upd on public.rdv_planning for update to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=rdv_planning.commune_id and p.role in('maire','cabinet','secretariat')))
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=rdv_planning.commune_id and p.role in('maire','cabinet','secretariat')));
revoke all on public.rdv_planning from anon,authenticated;
grant select,insert,update on public.rdv_planning to authenticated;

-- Réglage annoncé par la mairie de Fimela : lundi-vendredi, 08h-17h, pause 12h30-14h (1h30), créneaux de 30 min.
-- Modifiable ou désactivable dans l'espace mairie > Citoyens > Rendez-vous.
insert into public.rdv_planning(commune_id,actif) select id,true from public.communes where slug='fimela' on conflict(commune_id) do nothing;

-- 2) Colonnes ajoutées à rdv_demandes
alter table public.rdv_demandes add column if not exists heure_souhaitee time;
alter table public.rdv_demandes add column if not exists annule_le timestamptz;
-- un seul rendez-vous confirmé par service, jour et heure (garde-fou serveur)
create unique index if not exists rdv_creneau_uq on public.rdv_demandes(commune_id,service,date_confirmee,heure_confirmee) where statut='confirmee';

-- 3) Créneaux d'un jour (interne) : jours ouvrables, heures, hors pause
create or replace function public.rdv_slots(p_commune uuid,p_date date)
returns table(heure time) language sql stable security definer set search_path=public as $$
 select s.t::time from rdv_planning p,
  lateral generate_series(p_date::timestamp+p.heure_debut, p_date::timestamp+p.heure_fin-make_interval(mins=>p.duree_min), make_interval(mins=>p.duree_min)) as s(t)
 where p.commune_id=p_commune and p.actif and extract(isodow from p_date)::int=any(p.jours)
  and (p.pause_debut is null or not(s.t::time<p.pause_fin and s.t::time+make_interval(mins=>p.duree_min)>p.pause_debut))
 order by 1 $$;
revoke all on function public.rdv_slots(uuid,date) from public,anon,authenticated;

-- 4) Lecture publique du planning (commune lue par slug, jamais par id)
create or replace function public.planning_rdv(p_commune text)
returns table(actif boolean,jours int[],heure_debut time,heure_fin time,pause_debut time,pause_fin time,duree_min int)
language sql stable security definer set search_path=public as $$
 select p.actif,p.jours,p.heure_debut,p.heure_fin,p.pause_debut,p.pause_fin,p.duree_min
 from rdv_planning p join communes c on c.id=p.commune_id where c.slug=p_commune and c.statut in('essai','actif') $$;
revoke all on function public.planning_rdv(text) from public;
grant execute on function public.planning_rdv(text) to anon,authenticated;

-- 5) Créneaux libres d'un service un jour donné (exclut les créneaux déjà confirmés)
create or replace function public.creneaux_rdv(p_commune text,p_service text,p_date date)
returns table(heure time) language sql stable security definer set search_path=public as $$
 select s.heure from communes c, lateral rdv_slots(c.id,p_date) s
 where c.slug=p_commune and c.statut in('essai','actif') and p_date>current_date and p_date<=current_date+90
  and p_service in('secretariat','maire','etat_civil','technique','finances')
  and not exists(select 1 from rdv_demandes r where r.commune_id=c.id and r.service=p_service and r.statut='confirmee' and r.date_confirmee=p_date and r.heure_confirmee=s.heure)
 order by s.heure $$;
revoke all on function public.creneaux_rdv(text,text,date) from public;
grant execute on function public.creneaux_rdv(text,text,date) to anon,authenticated;

-- 6) Dépôt : si la mairie a activé son planning, le créneau est contrôlé côté serveur
drop function if exists public.creer_rdv(text,text,text,text,text,date);
create or replace function public.creer_rdv(p_commune text,p_service text,p_nom text,p_contact text,p_motif text,p_date date,p_heure time default null)
returns text language plpgsql security definer set search_path=public as $$
declare c record; n text; u uuid:=auth.uid(); pl boolean; begin
 if u is null then raise exception 'session'; end if;
 select id into c from communes where slug=p_commune and statut in('essai','actif');
 if c.id is null then raise exception 'commune'; end if;
 if p_date is null or p_date<=current_date or p_date>current_date+90 then raise exception 'date'; end if;
 if(select count(*) from rdv_demandes where citoyen_id=u and statut='demandee')>=3 then raise exception 'limite'; end if;
 select exists(select 1 from rdv_planning where commune_id=c.id and actif) into pl;
 if pl then
  if p_heure is null or not exists(select 1 from rdv_slots(c.id,p_date) s where s.heure=p_heure) then raise exception 'creneau'; end if;
  if exists(select 1 from rdv_demandes r where r.commune_id=c.id and r.service=p_service and r.statut='confirmee' and r.date_confirmee=p_date and r.heure_confirmee=p_heure) then raise exception 'creneau'; end if;
 end if;
 n:='RDV-'||upper(substr(md5(random()::text||clock_timestamp()::text||u::text),1,8));
 insert into rdv_demandes(commune_id,citoyen_id,numero,service,nom,contact,motif,date_souhaitee,heure_souhaitee)
 values(c.id,u,n,p_service,trim(p_nom),nullif(trim(coalesce(p_contact,'')),''),trim(p_motif),p_date,case when pl then p_heure end);
 return n; end $$;
revoke all on function public.creer_rdv(text,text,text,text,text,date,time) from public,anon;
grant execute on function public.creer_rdv(text,text,text,text,text,date,time) to authenticated;

-- 7) Lecture citoyen : ajoute l'heure souhaitée
drop function if exists public.mes_rdvs(text,text[]);
create or replace function public.mes_rdvs(p_commune text,p_numeros text[])
returns table(numero text,service text,statut text,date_souhaitee date,heure_souhaitee time,date_confirmee date,heure_confirmee time,reponse text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select r.numero,r.service,r.statut,r.date_souhaitee,r.heure_souhaitee,r.date_confirmee,r.heure_confirmee,r.reponse,r.created_at
 from rdv_demandes r join communes c on c.id=r.commune_id
 where c.slug=p_commune and(r.numero=any(coalesce(p_numeros[1:30],'{}')) or(auth.uid() is not null and r.citoyen_id=auth.uid()))
 order by r.created_at desc limit 50 $$;
revoke all on function public.mes_rdvs(text,text[]) from public;
grant execute on function public.mes_rdvs(text,text[]) to anon,authenticated;

-- 8) Annulation par le citoyen : numéro non devinable (même principe que le suivi), commune imposée par le slug,
--    seulement « en attente » ou « confirmé » et à venir. Le créneau est libéré (l'index ne compte que les « confirmé »).
create or replace function public.annuler_rdv(p_commune text,p_numero text)
returns boolean language plpgsql security definer set search_path=public as $$
declare r record; begin
 select x.id,x.commune_id,x.numero,x.nom,x.service into r
 from rdv_demandes x join communes c on c.id=x.commune_id
 where c.slug=p_commune and x.numero=p_numero and x.statut in('demandee','confirmee') and coalesce(x.date_confirmee,x.date_souhaitee)>=current_date
 for update of x;
 if r.id is null then return false; end if;
 update rdv_demandes set statut='annulee',annule_le=now() where id=r.id;
 -- prévenir le personnel (ne bloque jamais l'annulation si le format de la table notifications diffère)
 begin
  insert into notifications(user_id,commune_id,titre,corps)
  select p.id,r.commune_id,'Rendez-vous annulé '||r.numero,r.nom||' a annulé son rendez-vous ('||r.service||').'
  from profiles p where p.commune_id=r.commune_id and p.role in('maire','cabinet','secretariat');
 exception when others then null; end;
 return true; end $$;
revoke all on function public.annuler_rdv(text,text) from public;
grant execute on function public.annuler_rdv(text,text) to anon,authenticated;
