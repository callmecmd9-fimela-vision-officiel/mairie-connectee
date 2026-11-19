alter table public.conges add column jours numeric check (jours>0 and jours<=366);
create table public.conges_droits(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 personnel_id uuid not null references public.personnel(id) on delete cascade,
 annee int not null check (annee between 2000 and 2100),
 jours_droit numeric not null default 0 check (jours_droit>=0 and jours_droit<=366),
 jours_report numeric not null default 0 check (jours_report>=0 and jours_report<=366),
 observations text check (char_length(observations)<=500),
 updated_by uuid default auth.uid(), updated_at timestamptz not null default now(),
 unique (personnel_id, annee));
create index on public.conges_droits(commune_id);
alter table public.conges_droits enable row level security;
revoke all on public.conges_droits from anon;
create policy cdroits_gestion on public.conges_droits for all to authenticated using ((select private.my_role()) in ('maire','rh') and commune_id=(select private.my_commune())) with check ((select private.my_role()) in ('maire','rh') and commune_id=(select private.my_commune()));
create policy bloque_anonymes_conges_droits on public.conges_droits as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false);
create policy maintenance_serveur on public.conges_droits as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()));
create trigger audit_conges_droits after insert or update or delete on public.conges_droits for each row execute function private.audit();