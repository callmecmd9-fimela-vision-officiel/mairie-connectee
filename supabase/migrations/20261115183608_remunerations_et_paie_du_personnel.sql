create table public.remunerations(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 personnel_id uuid not null unique references public.personnel(id) on delete cascade,
 salaire_base numeric not null default 0 check (salaire_base>=0),
 indemnites numeric not null default 0 check (indemnites>=0),
 retenues numeric not null default 0 check (retenues>=0),
 date_effet date, observations text check (char_length(observations)<=1000),
 updated_by uuid default auth.uid(), updated_at timestamptz not null default now(),
 check (retenues <= salaire_base + indemnites));
create table public.paies(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null default private.my_commune() references public.communes(id),
 mois date not null check (mois = date_trunc('month', mois)::date),
 statut text not null default 'brouillon' check (statut in ('brouillon','valide','ordonnance','paye')),
 total_brut numeric not null default 0, total_retenues numeric not null default 0, total_net numeric not null default 0, nb_agents int not null default 0,
 valide_par uuid, valide_le timestamptz, ordonne_par uuid, ordonne_le timestamptz,
 date_paiement date, reference_paiement text check (char_length(reference_paiement)<=120), paye_par uuid,
 created_by uuid default auth.uid(), created_at timestamptz not null default now(),
 unique (commune_id, mois));
create table public.paie_lignes(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id),
 paie_id uuid not null references public.paies(id) on delete cascade,
 personnel_id uuid not null references public.personnel(id),
 brut numeric not null default 0 check (brut>=0), retenues numeric not null default 0 check (retenues>=0),
 net numeric generated always as (brut - retenues) stored,
 check (retenues<=brut), unique (paie_id, personnel_id));
create index on public.paie_lignes(paie_id); create index on public.paies(commune_id); create index on public.remunerations(commune_id);

alter table public.remunerations enable row level security; alter table public.paies enable row level security; alter table public.paie_lignes enable row level security;
revoke all on public.remunerations, public.paies, public.paie_lignes from anon;
revoke insert, update, delete on public.paies, public.paie_lignes from authenticated;
create policy rem_gestion on public.remunerations for all to authenticated using ((select private.my_role()) in ('maire','rh') and commune_id=(select private.my_commune())) with check ((select private.my_role()) in ('maire','rh') and commune_id=(select private.my_commune()));
create policy paies_lecture on public.paies for select to authenticated using ((select private.my_role()) in ('maire','rh','finances') and commune_id=(select private.my_commune()));
create policy plig_lecture on public.paie_lignes for select to authenticated using ((select private.my_role()) in ('maire','rh') and commune_id=(select private.my_commune()));
do $$ declare t text; begin
 foreach t in array array['remunerations','paies','paie_lignes'] loop
  execute format('create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false) with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean,false)=false)', t, t);
  execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
 end loop;
 execute 'create trigger audit_remunerations after insert or update or delete on public.remunerations for each row execute function private.audit()';
 execute 'create trigger audit_paies after insert or update or delete on public.paies for each row execute function private.audit()';
end $$;

create or replace function private.paie_garde(p_roles text[]) returns uuid language plpgsql stable security definer set search_path='' as $$
declare c uuid := private.my_commune();
begin
  if c is null or (select private.my_role()) <> all (p_roles) or not private.hors_maintenance() then raise exception 'Accès refusé' using errcode='42501'; end if;
  return c;
end $$;
create or replace function private.paie_totaux(p_paie uuid) returns void language sql security definer set search_path='' as $$
update public.paies p set total_brut=coalesce(s.b,0), total_retenues=coalesce(s.r,0), total_net=coalesce(s.n,0), nb_agents=coalesce(s.k,0)
from (select sum(brut) b, sum(retenues) r, sum(net) n, count(*) k from public.paie_lignes where paie_id=p_paie) s where p.id=p_paie $$;

create or replace function public.paie_generer(p_mois date) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid := private.paie_garde(array['maire','rh']); pid uuid; st text; m date := date_trunc('month', p_mois)::date;
begin
  select id, statut into pid, st from public.paies where commune_id=c and mois=m;
  if pid is not null and st <> 'brouillon' then raise exception 'Cette paie n''est plus modifiable'; end if;
  if pid is null then insert into public.paies(commune_id,mois) values (c,m) returning id into pid;
  else delete from public.paie_lignes where paie_id=pid; end if;
  insert into public.paie_lignes(commune_id,paie_id,personnel_id,brut,retenues)
   select c,pid,p.id,coalesce(r.salaire_base,0)+coalesce(r.indemnites,0),coalesce(r.retenues,0)
   from public.personnel p left join public.remunerations r on r.personnel_id=p.id
   where p.commune_id=c and p.actif and (p.date_sortie is null or p.date_sortie>=m);
  perform private.paie_totaux(pid); return pid;
end $$;
create or replace function public.paie_maj_ligne(p_ligne uuid, p_brut numeric, p_retenues numeric) returns void language plpgsql security definer set search_path='' as $$
declare c uuid := private.paie_garde(array['maire','rh']); pid uuid;
begin
  select l.paie_id into pid from public.paie_lignes l join public.paies p on p.id=l.paie_id where l.id=p_ligne and l.commune_id=c and p.statut='brouillon';
  if pid is null then raise exception 'Ligne introuvable ou paie non modifiable'; end if;
  if p_brut<0 or p_retenues<0 or p_retenues>p_brut then raise exception 'Montants invalides'; end if;
  update public.paie_lignes set brut=p_brut, retenues=p_retenues where id=p_ligne;
  perform private.paie_totaux(pid);
end $$;
create or replace function public.paie_valider(p_paie uuid) returns void language plpgsql security definer set search_path='' as $$
declare c uuid := private.paie_garde(array['maire','rh']);
begin
  update public.paies set statut='valide', valide_par=auth.uid(), valide_le=now() where id=p_paie and commune_id=c and statut='brouillon' and nb_agents>0;
  if not found then raise exception 'Paie introuvable, vide ou déjà validée'; end if;
end $$;
create or replace function public.paie_retour_brouillon(p_paie uuid) returns void language plpgsql security definer set search_path='' as $$
declare c uuid := private.paie_garde(array['maire']);
begin
  update public.paies set statut='brouillon', valide_par=null, valide_le=null where id=p_paie and commune_id=c and statut='valide';
  if not found then raise exception 'Paie introuvable ou non validée'; end if;
end $$;
create or replace function public.paie_ordonnancer(p_paie uuid) returns void language plpgsql security definer set search_path='' as $$
declare c uuid := private.paie_garde(array['maire']); m date;
begin
  update public.paies set statut='ordonnance', ordonne_par=auth.uid(), ordonne_le=now() where id=p_paie and commune_id=c and statut='valide' returning mois into m;
  if not found then raise exception 'La paie doit être validée avant ordonnancement'; end if;
  insert into public.decisions(commune_id,type,objet,created_by) values (c,'Décision','Ordonnancement de la paie du personnel : '||to_char(m,'MM/YYYY'),auth.uid());
end $$;
create or replace function public.paie_payer(p_paie uuid, p_date date, p_ref text) returns void language plpgsql security definer set search_path='' as $$
declare c uuid := private.paie_garde(array['maire','finances']);
begin
  if coalesce(btrim(p_ref),'')='' or p_date is null then raise exception 'Date et référence du paiement obligatoires'; end if;
  update public.paies set statut='paye', date_paiement=p_date, reference_paiement=btrim(p_ref), paye_par=auth.uid() where id=p_paie and commune_id=c and statut='ordonnance';
  if not found then raise exception 'La paie doit être ordonnancée avant paiement'; end if;
end $$;
revoke all on function public.paie_generer(date), public.paie_maj_ligne(uuid,numeric,numeric), public.paie_valider(uuid), public.paie_retour_brouillon(uuid), public.paie_ordonnancer(uuid), public.paie_payer(uuid,date,text) from public, anon;
grant execute on function public.paie_generer(date), public.paie_maj_ligne(uuid,numeric,numeric), public.paie_valider(uuid), public.paie_retour_brouillon(uuid), public.paie_ordonnancer(uuid), public.paie_payer(uuid,date,text) to authenticated;
revoke all on function private.paie_garde(text[]), private.paie_totaux(uuid) from public, anon, authenticated;