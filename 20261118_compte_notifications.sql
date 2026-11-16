-- Comptes citoyens (téléphone) + notifications de suivi
create table if not exists public.citoyens(user_id uuid primary key references auth.users(id) on delete cascade,nom text check(length(nom)<=120),village text check(length(village)<=120),updated_at timestamptz default now());
create table if not exists public.citoyen_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,commune_id uuid references public.communes(id) on delete cascade,demande_id uuid,titre text not null,corps text,lu boolean not null default false,created_at timestamptz not null default now());
create index if not exists cn_user_idx on public.citoyen_notifications(user_id,created_at desc);
alter table public.citoyens enable row level security;alter table public.citoyen_notifications enable row level security;
create policy citoyens_own on public.citoyens for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy cn_select on public.citoyen_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy cn_update on public.citoyen_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.citoyens,public.citoyen_notifications from anon;
revoke insert,delete on public.citoyen_notifications from authenticated;
grant select,insert,update on public.citoyens to authenticated;grant select,update(lu) on public.citoyen_notifications to authenticated;

create or replace function public.mes_demandes_compte(p_commune text)
returns table(numero text,type text,statut text,created_at timestamptz) language sql stable security definer set search_path=public as $$
 select d.numero,d.type,d.statut::text,d.created_at from demandes d join communes c on c.id=d.commune_id
 where c.slug=p_commune and d.citoyen_id=(select auth.uid()) order by d.created_at desc limit 100 $$;
revoke all on function public.mes_demandes_compte(text) from public,anon;grant execute on function public.mes_demandes_compte(text) to authenticated;

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
