create table public.personnel(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 matricule text check (char_length(matricule)<=40),
 prenom text not null check (char_length(prenom) between 1 and 100),
 nom text not null check (char_length(nom) between 1 and 100),
 fonction text check (char_length(fonction)<=160),
 service text check (char_length(service)<=120),
 type_contrat text not null default 'Permanent' check (type_contrat in ('Permanent','Contractuel','Temporaire','Stagiaire','Autre')),
 date_embauche date, date_sortie date,
 telephone text check (char_length(telephone)<=40),
 email text check (char_length(email)<=160),
 actif boolean not null default true,
 observations text check (char_length(observations)<=3000),
 created_by uuid default auth.uid(), created_at timestamptz not null default now());
create unique index personnel_matricule_uq on public.personnel(commune_id, matricule) where matricule is not null;
create table public.conges(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 personnel_id uuid not null references public.personnel(id) on delete cascade,
 type text not null default 'Annuel' check (type in ('Annuel','Maladie','Maternité','Paternité','Exceptionnel','Autre')),
 date_debut date not null, date_fin date not null,
 statut text not null default 'demande' check (statut in ('demande','approuve','refuse')),
 motif text check (char_length(motif)<=1000),
 decide_par uuid, decide_le timestamptz,
 created_by uuid default auth.uid(), created_at timestamptz not null default now(),
 check (date_fin>=date_debut));
create index on public.conges(personnel_id);
do $$
declare t text;
begin
 foreach t in array array['personnel','conges'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from anon', t);
  execute format('create policy %I on public.%I for all to authenticated using ((select private.my_role()) in (''maire'',''rh'') and commune_id=(select private.my_commune())) with check ((select private.my_role()) in (''maire'',''rh'') and commune_id=(select private.my_commune()))', t||'_gestion', t);
  execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
  execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
  execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  execute format('create index on public.%I(commune_id)', t);
 end loop;
end $$;