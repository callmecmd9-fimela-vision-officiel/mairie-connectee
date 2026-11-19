-- Idempotent. Aucune donnée existante modifiée ou supprimée.
create table if not exists public.demarches(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 type text not null check (type in ('État civil','Audience','Aide sociale','Travaux publics','Urbanisme','Environnement','Éducation','Sport et culture','Commerce','Agriculture et pêche','Réclamations','Associations')),
 titre text not null check (length(titre) between 3 and 150),
 description text, pieces text, conditions text, delai text, autorite text,
 actif boolean not null default true, created_at timestamptz not null default now());
create index if not exists demarches_commune_idx on public.demarches(commune_id);
alter table public.demarches enable row level security;
drop policy if exists demarches_staff on public.demarches;
create policy demarches_staff on public.demarches for all to authenticated
 using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=demarches.commune_id and p.role in ('maire','cabinet','secretariat')))
 with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=demarches.commune_id and p.role in ('maire','cabinet','secretariat')));
revoke all on public.demarches from anon;
revoke truncate,references,trigger on public.demarches from authenticated;
grant select,insert,update,delete on public.demarches to authenticated;

create or replace function public.demarches_commune(p_commune text)
returns table(id uuid,type text,titre text,description text,pieces text,conditions text,delai text,autorite text)
language sql stable security definer set search_path=public as $$
 select d.id,d.type,d.titre,d.description,d.pieces,d.conditions,d.delai,d.autorite
 from demarches d join communes c on c.id=d.commune_id
 where c.slug=p_commune and c.statut in ('essai','actif') and d.actif order by d.type,d.titre $$;
revoke all on function public.demarches_commune(text) from public;
grant execute on function public.demarches_commune(text) to anon,authenticated;

-- Nouveaux statuts (colonne text + CHECK)
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.demandes'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%statut%' loop
  execute format('alter table public.demandes drop constraint %I',c.conname); end loop;
 alter table public.demandes add constraint demandes_statut_check check (statut in ('nouvelle','orientee','en_cours','a_valider','traitee','redirigee','en_attente_pieces','rejetee','cloturee'));
end $$;

create or replace function public.completer_demande(p_commune text,p_numero text,p_pieces text[])
returns boolean language plpgsql security definer set search_path=public as $$
declare c record; d record; p text; begin
 select id into c from communes where slug=p_commune and statut in ('essai','actif');
 if c.id is null or p_pieces is null or array_length(p_pieces,1) is null or array_length(p_pieces,1)>3 then return false; end if;
 foreach p in array p_pieces loop if p not like c.id::text||'/%' or p like '%..%' or char_length(p)>200 then return false; end if; end loop;
 select id,pieces into d from demandes where commune_id=c.id and numero=upper(trim(p_numero)) and statut='en_attente_pieces' for update;
 if d.id is null or coalesce(array_length(d.pieces,1),0)+array_length(p_pieces,1)>12 then return false; end if;
 update demandes set pieces=coalesce(pieces,'{}')||p_pieces,statut='en_cours' where id=d.id;
 return true; end $$;
revoke all on function public.completer_demande(text,text,text[]) from public;
grant execute on function public.completer_demande(text,text,text[]) to anon,authenticated;

-- Le citoyen voit le motif de rejet / les pièces demandées / la clôture
create or replace function public.suivre_demande(p_commune text,p_numero text)
returns table(type text,statut text,service text,reponse text,cree timestamptz,historique jsonb)
language sql stable security definer set search_path='' as $$
  select d.type,d.statut,d.service,case when d.statut in ('traitee','redirigee','rejetee','en_attente_pieces','cloturee') then d.reponse end,d.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('statut',h.statut,'date',h.created_at) order by h.created_at) from public.demande_historique h where h.demande_id=d.id),'[]'::jsonb)
  from public.demandes d join public.communes c on c.id=d.commune_id
  where c.slug=p_commune and d.numero=upper(trim(p_numero)) $$;

-- Comptes citoyens + notifications
create table if not exists public.citoyens(user_id uuid primary key references auth.users(id) on delete cascade,nom text check(length(nom)<=120),village text check(length(village)<=120),updated_at timestamptz default now());
create table if not exists public.citoyen_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,commune_id uuid references public.communes(id) on delete cascade,demande_id uuid,titre text not null,corps text,lu boolean not null default false,created_at timestamptz not null default now());
create index if not exists cn_user_idx on public.citoyen_notifications(user_id,created_at desc);
create index if not exists cn_commune_idx on public.citoyen_notifications(commune_id);
alter table public.citoyens enable row level security;alter table public.citoyen_notifications enable row level security;
drop policy if exists citoyens_own on public.citoyens;
create policy citoyens_own on public.citoyens for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
drop policy if exists cn_select on public.citoyen_notifications;
create policy cn_select on public.citoyen_notifications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists cn_update on public.citoyen_notifications;
create policy cn_update on public.citoyen_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.citoyens,public.citoyen_notifications from anon;
revoke all on public.citoyens,public.citoyen_notifications from authenticated;
grant select,insert,update on public.citoyens to authenticated;
grant select on public.citoyen_notifications to authenticated;
grant update(lu) on public.citoyen_notifications to authenticated;

create or replace function public.mes_demandes_compte(p_commune text)
returns table(numero text,type text,statut text,created_at timestamptz) language sql stable security definer set search_path=public as $$
 select d.numero,d.type,d.statut::text,d.created_at from demandes d join communes c on c.id=d.commune_id
 where c.slug=p_commune and d.citoyen_id=(select auth.uid()) order by d.created_at desc limit 100 $$;
revoke all on function public.mes_demandes_compte(text) from public,anon;
grant execute on function public.mes_demandes_compte(text) to authenticated;

create or replace function public.trg_notif_demande() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.citoyen_id is not null and exists(select 1 from citoyens where user_id=new.citoyen_id) then
  insert into citoyen_notifications(user_id,commune_id,demande_id,titre,corps)
  values(new.citoyen_id,new.commune_id,new.id,'Demande '||new.numero,
   case new.statut::text when 'orientee' then 'Votre demande a été transmise au service compétent.'
    when 'en_cours' then 'Votre demande est en cours de traitement.'
    when 'a_valider' then 'Votre demande est en cours de validation.'
    when 'en_attente_pieces' then 'Des pièces complémentaires sont demandées. Ouvrez votre dossier.'
    when 'traitee' then 'Votre demande a été traitée. Une réponse est disponible.'
    when 'redirigee' then 'Votre demande a été orientée vers l’organisme compétent.'
    when 'rejetee' then 'Votre demande a été rejetée. Consultez le motif.'
    when 'cloturee' then 'Votre dossier est clôturé.' else 'Le statut de votre demande a changé.' end);
 end if; return new; end $$;
revoke all on function public.trg_notif_demande() from public,anon,authenticated;
drop trigger if exists notif_demande on public.demandes;
create trigger notif_demande after update of statut on public.demandes for each row when(old.statut is distinct from new.statut) execute function public.trg_notif_demande();