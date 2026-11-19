-- Lot F1 : personnel sans compte, services dynamiques, affectations d'agents (additif, idempotent)
-- Restauration : drop table org_agent_affectations; retirer colonnes ajoutées ; recréer services_code_check si besoin.
alter table public.services add column if not exists type text not null default 'service';
alter table public.services add column if not exists parent_id uuid references public.services(id) on delete set null;
alter table public.services add column if not exists ordre int not null default 0;
alter table public.services drop constraint if exists services_code_check;
do $$ begin
 if not exists (select 1 from pg_constraint where conname='services_code_format') then
  alter table public.services add constraint services_code_format check (code ~ '^[a-z][a-z0-9_]{1,60}$'); end if;
 if not exists (select 1 from pg_constraint where conname='services_type_check') then
  alter table public.services add constraint services_type_check check (type in ('direction','division','service','bureau','unite')); end if;
end $$;
create unique index if not exists services_commune_code_uq on public.services(commune_id, code);

alter table public.personnel add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.personnel add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.personnel add column if not exists fusionne_dans uuid references public.personnel(id);
create unique index if not exists personnel_user_uq on public.personnel(user_id) where user_id is not null;

create table if not exists public.org_agent_affectations(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 personnel_id uuid references public.personnel(id),
 adjoint_id uuid references public.adjoints(id),
 poste_code text not null,
 service_id uuid references public.services(id),
 debut date not null default current_date,
 fin date,
 motif text check (char_length(motif)<=300),
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 foreign key (commune_id, poste_code) references public.org_postes(commune_id, code),
 check ((personnel_id is null) <> (adjoint_id is null)),
 check (fin is null or fin >= debut));
create index if not exists oaa_pers_idx on public.org_agent_affectations(personnel_id);
create index if not exists oaa_adj_idx on public.org_agent_affectations(adjoint_id);
create index if not exists oaa_poste_idx on public.org_agent_affectations(commune_id, poste_code);
create index if not exists oaa_svc_idx on public.org_agent_affectations(service_id);

create or replace function public.org_aa_check() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare pc uuid;
begin
 if new.personnel_id is not null then select commune_id into pc from personnel where id=new.personnel_id;
 else select commune_id into pc from adjoints where id=new.adjoint_id; end if;
 if pc is distinct from new.commune_id then raise exception 'Personne d''une autre commune'; end if;
 if new.service_id is not null and not exists(select 1 from services where id=new.service_id and commune_id=new.commune_id) then raise exception 'Service d''une autre commune'; end if;
 if exists(select 1 from org_agent_affectations o where o.id is distinct from new.id and o.commune_id=new.commune_id and o.poste_code=new.poste_code
   and o.personnel_id is not distinct from new.personnel_id and o.adjoint_id is not distinct from new.adjoint_id
   and daterange(o.debut,coalesce(o.fin,'infinity'::date),'[]') && daterange(new.debut,coalesce(new.fin,'infinity'::date),'[]'))
 then raise exception 'Affectation contradictoire : cette personne occupe déjà ce poste sur la période'; end if;
 return new; end $$;
drop trigger if exists oaa_check on public.org_agent_affectations;
create trigger oaa_check before insert or update on public.org_agent_affectations for each row execute function public.org_aa_check();
drop trigger if exists audit_oaa on public.org_agent_affectations;
create trigger audit_oaa after insert or update or delete on public.org_agent_affectations for each row execute function private.audit();

alter table public.org_agent_affectations enable row level security;
drop policy if exists oaa_sel on public.org_agent_affectations;
create policy oaa_sel on public.org_agent_affectations for select to authenticated using (commune_id=(select public.org_commune()) or (select public.is_super_admin()));
revoke all on public.org_agent_affectations from anon, authenticated, public;
grant select on public.org_agent_affectations to authenticated;
revoke all on function public.org_aa_check() from public, anon, authenticated;