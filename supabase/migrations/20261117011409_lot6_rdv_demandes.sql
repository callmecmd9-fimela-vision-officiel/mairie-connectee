create table if not exists public.rdv_demandes(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 citoyen_id uuid references auth.users(id) on delete set null,
 numero text not null unique,
 service text not null check(service in ('secretariat','maire','etat_civil','technique','finances')),
 nom text not null check(length(nom) between 2 and 120),
 contact text check(length(contact)<=40),
 motif text not null check(length(motif) between 5 and 500),
 date_souhaitee date not null,
 statut text not null default 'demandee' check(statut in ('demandee','confirmee','refusee','annulee')),
 reponse text check(length(reponse)<=500),
 date_confirmee date, heure_confirmee time,
 created_at timestamptz not null default now(),
 constraint rdv_conf check(statut<>'confirmee' or (date_confirmee is not null and heure_confirmee is not null)),
 constraint rdv_ref check(statut<>'refusee' or length(coalesce(reponse,''))>=5));
create index if not exists rdv_demandes_commune_idx on public.rdv_demandes(commune_id,created_at desc);
create index if not exists rdv_demandes_citoyen_idx on public.rdv_demandes(citoyen_id);
alter table public.rdv_demandes enable row level security;
drop policy if exists rdvq_staff_sel on public.rdv_demandes;
drop policy if exists rdvq_staff_upd on public.rdv_demandes;
create policy rdvq_staff_sel on public.rdv_demandes for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=rdv_demandes.commune_id and p.role in('maire','cabinet','secretariat')));
create policy rdvq_staff_upd on public.rdv_demandes for update to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=rdv_demandes.commune_id and p.role in('maire','cabinet','secretariat')))
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=rdv_demandes.commune_id and p.role in('maire','cabinet','secretariat')));
revoke all on public.rdv_demandes from anon,authenticated;
grant select on public.rdv_demandes to authenticated;
grant update(statut,date_confirmee,heure_confirmee,reponse) on public.rdv_demandes to authenticated;

create or replace function public.creer_rdv(p_commune text,p_service text,p_nom text,p_contact text,p_motif text,p_date date)
returns text language plpgsql security definer set search_path=public as $$
declare c record; n text; u uuid:=auth.uid(); begin
 if u is null then raise exception 'session'; end if;
 select id into c from communes where slug=p_commune and statut in('essai','actif');
 if c.id is null then raise exception 'commune'; end if;
 if p_date is null or p_date<=current_date or p_date>current_date+90 then raise exception 'date'; end if;
 if(select count(*) from rdv_demandes where citoyen_id=u and statut='demandee')>=3 then raise exception 'limite'; end if;
 n:='RDV-'||upper(substr(md5(random()::text||clock_timestamp()::text||u::text),1,8));
 insert into rdv_demandes(commune_id,citoyen_id,numero,service,nom,contact,motif,date_souhaitee)
 values(c.id,u,n,p_service,trim(p_nom),nullif(trim(coalesce(p_contact,'')),''),trim(p_motif),p_date);
 return n; end $$;
revoke all on function public.creer_rdv(text,text,text,text,text,date) from public,anon;
grant execute on function public.creer_rdv(text,text,text,text,text,date) to authenticated;

create or replace function public.mes_rdvs(p_commune text,p_numeros text[])
returns table(numero text,service text,statut text,date_souhaitee date,date_confirmee date,heure_confirmee time,reponse text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select r.numero,r.service,r.statut,r.date_souhaitee,r.date_confirmee,r.heure_confirmee,r.reponse,r.created_at
 from rdv_demandes r join communes c on c.id=r.commune_id
 where c.slug=p_commune and(r.numero=any(coalesce(p_numeros[1:30],'{}')) or(auth.uid() is not null and r.citoyen_id=auth.uid()))
 order by r.created_at desc limit 50 $$;
revoke all on function public.mes_rdvs(text,text[]) from public;
grant execute on function public.mes_rdvs(text,text[]) to anon,authenticated;

create or replace function public.trg_notif_rdv() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.citoyen_id is not null and new.statut in('confirmee','refusee') and exists(select 1 from citoyens where user_id=new.citoyen_id) then
  insert into citoyen_notifications(user_id,commune_id,titre,corps) values(new.citoyen_id,new.commune_id,'Rendez-vous '||new.numero,
   case new.statut when 'confirmee' then 'Votre rendez-vous est confirmé le '||to_char(new.date_confirmee,'DD/MM/YYYY')||' à '||to_char(new.heure_confirmee,'HH24:MI')||'.'
   else 'Le service ne peut pas vous recevoir à la date demandée. Consultez sa réponse.' end);
 end if; return new; end $$;
revoke all on function public.trg_notif_rdv() from public,anon,authenticated;
drop trigger if exists notif_rdv on public.rdv_demandes;
create trigger notif_rdv after update of statut on public.rdv_demandes for each row when(old.statut is distinct from new.statut) execute function public.trg_notif_rdv();