-- Démarches configurables + nouveaux statuts + complément de dossier
create table if not exists public.demarches(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 type text not null check (type in ('État civil','Audience','Aide sociale','Travaux publics','Urbanisme','Environnement','Éducation','Sport et culture','Commerce','Agriculture et pêche','Réclamations','Associations')),
 titre text not null check (length(titre) between 3 and 150),
 description text, pieces text, conditions text, delai text, autorite text,
 actif boolean not null default true, created_at timestamptz not null default now());
alter table public.demarches enable row level security;
create policy demarches_staff on public.demarches for all to authenticated
 using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=demarches.commune_id and p.role in ('maire','cabinet','secretariat')))
 with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=demarches.commune_id and p.role in ('maire','cabinet','secretariat')));
revoke all on public.demarches from anon;
grant select,insert,update,delete on public.demarches to authenticated;

create or replace function public.demarches_commune(p_commune text)
returns table(id uuid,type text,titre text,description text,pieces text,conditions text,delai text,autorite text)
language sql stable security definer set search_path=public as $$
 select d.id,d.type,d.titre,d.description,d.pieces,d.conditions,d.delai,d.autorite
 from demarches d join communes c on c.id=d.commune_id
 where c.slug=p_commune and c.statut in ('essai','actif') and d.actif order by d.type,d.titre $$;
revoke all on function public.demarches_commune(text) from public;
grant execute on function public.demarches_commune(text) to anon,authenticated;

-- Nouveaux statuts de demandes (enum ou contrainte CHECK)
do $$ declare dt text; un text; c record; begin
 select data_type,udt_name into dt,un from information_schema.columns where table_schema='public' and table_name='demandes' and column_name='statut';
 if dt='USER-DEFINED' then
  execute format('alter type public.%I add value if not exists %L',un,'en_attente_pieces');
  execute format('alter type public.%I add value if not exists %L',un,'rejetee');
  execute format('alter type public.%I add value if not exists %L',un,'cloturee');
 else
  for c in select conname from pg_constraint where conrelid='public.demandes'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%statut%' loop
   execute format('alter table public.demandes drop constraint %I',c.conname); end loop;
  alter table public.demandes add constraint demandes_statut_check check (statut in ('nouvelle','orientee','en_cours','a_valider','traitee','redirigee','en_attente_pieces','rejetee','cloturee'));
 end if; end $$;

-- Le citoyen complète son dossier avec son numéro de suivi
create or replace function public.completer_demande(p_commune text,p_numero text,p_pieces text[])
returns boolean language plpgsql security definer set search_path=public as $$
declare c record; d record; p text; begin
 select id into c from communes where slug=p_commune and statut in ('essai','actif');
 if c.id is null or p_pieces is null or array_length(p_pieces,1) is null or array_length(p_pieces,1)>3 then return false; end if;
 foreach p in array p_pieces loop if p not like c.id::text||'/%' or p like '%..%' then return false; end if; end loop;
 select id,pieces into d from demandes where commune_id=c.id and numero=p_numero and statut='en_attente_pieces' for update;
 if d.id is null or coalesce(array_length(d.pieces,1),0)+array_length(p_pieces,1)>12 then return false; end if;
 update demandes set pieces=coalesce(pieces,'{}')||p_pieces,statut='en_cours' where id=d.id;
 return true; end $$;
revoke all on function public.completer_demande(text,text,text[]) from public;
grant execute on function public.completer_demande(text,text,text[]) to anon,authenticated;
