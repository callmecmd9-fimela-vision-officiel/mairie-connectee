alter table public.indicateurs add column if not exists departement text, add column if not exists region text, add column if not exists pays text;
update public.indicateurs set departement='Fatick', region='Fatick', pays='Sénégal' where commune_id='98002283-4fc0-4eff-8182-af1eec9a321d' and departement is null;

create table public.marches(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 numero text check (char_length(numero)<=60),
 objet text not null check (char_length(objet) between 1 and 300),
 mode text check (mode in ('Appel d''offres ouvert','Appel d''offres restreint','Demande de renseignements et de prix','Gré à gré','Autre')),
 montant numeric not null default 0 check (montant>=0),
 attributaire text check (char_length(attributaire)<=200),
 service text check (char_length(service)<=120),
 statut text not null default 'preparation' check (statut in ('preparation','lance','evaluation','attribue','approuve','en_cours','receptionne','annule')),
 date_lancement date, date_attribution date, date_fin date,
 observations text check (char_length(observations)<=3000),
 created_by uuid default auth.uid(), created_at timestamptz not null default now());
create table public.patrimoine(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 reference text check (char_length(reference)<=60),
 designation text not null check (char_length(designation) between 1 and 200),
 categorie text check (categorie in ('Bâtiment','Terrain','Équipement','Véhicule','Mobilier','Infrastructure','Autre')),
 localisation text check (char_length(localisation)<=200),
 etat text not null default 'bon' check (etat in ('bon','moyen','mauvais','hors_service')),
 valeur numeric check (valeur>=0), date_acquisition date,
 observations text check (char_length(observations)<=3000),
 created_by uuid default auth.uid(), created_at timestamptz not null default now());
create table public.commissions(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 nom text not null check (char_length(nom) between 1 and 160),
 domaine text check (char_length(domaine)<=160), president text check (char_length(president)<=160),
 membres text check (char_length(membres)<=2000), actif boolean not null default true,
 observations text check (char_length(observations)<=3000),
 created_by uuid default auth.uid(), created_at timestamptz not null default now());
create table public.decisions(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 jour date not null default current_date,
 type text not null default 'Décision' check (type in ('Arrêté','Décision','Instruction','Validation','Autre')),
 objet text not null check (char_length(objet) between 1 and 300),
 reference text check (char_length(reference)<=60),
 observations text check (char_length(observations)<=3000),
 created_by uuid default auth.uid(), created_at timestamptz not null default now());

do $$
declare t text; rl text; rw text; sa boolean;
begin
 for t, rl, rw, sa in select * from (values
  ('marches','{maire,finances,secretariat}','{maire,finances}',true),
  ('patrimoine','{maire,secretariat,technique,finances,adjoint}','{maire,secretariat,technique}',false),
  ('commissions','{maire,secretariat,adjoint,cabinet}','{maire,secretariat}',false),
  ('decisions','{maire,secretariat}','{maire}',true)) v(a,b,c,d)
 loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from anon', t);
  execute format('create policy %I on public.%I for select to authenticated using ((select private.can(%L::text[])) and (commune_id=(select private.my_commune()) or (select private.my_role())=''super_admin''))', t||'_lecture', t, rl);
  execute format('create policy %I on public.%I for all to authenticated using ((select private.can(%L::text[])) and (commune_id=(select private.my_commune()) or (select private.my_role())=''super_admin'')) with check ((select private.can(%L::text[])) and (commune_id=(select private.my_commune()) or (select private.my_role())=''super_admin''))', t||'_ecriture', t, rw, rw);
  execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
  execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
  if sa then
   execute format('create policy sa_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_super_admin())', t);
   execute format('create policy sa_no_update on public.%I as restrictive for update to authenticated using (not public.is_super_admin()) with check (not public.is_super_admin())', t);
   execute format('create policy sa_no_delete on public.%I as restrictive for delete to authenticated using (not public.is_super_admin())', t);
  end if;
  execute format('create trigger audit_%s after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  execute format('create trigger historise_%s after insert or update or delete on public.%I for each row execute function private.historise()', t, t);
  execute format('create index on public.%I(commune_id)', t);
 end loop;
end $$;