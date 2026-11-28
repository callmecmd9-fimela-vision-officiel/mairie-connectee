-- Interrupteur réversible de fonctionnalités (alignement OBFiLoc/GFILOC, ANEC). Suspension globale, appliquée côté serveur.
-- Rétablir : select public.saas_fonctionnalite_set('<code>', false, null);
create table if not exists public.fonctionnalites_plateforme(
  code text primary key, libelle text not null, suspendue boolean not null default false,
  motif text, maj timestamptz not null default now(), maj_par uuid);
alter table public.fonctionnalites_plateforme enable row level security;
drop policy if exists ff_lecture on public.fonctionnalites_plateforme;
create policy ff_lecture on public.fonctionnalites_plateforme for select to authenticated using (true);
revoke all on public.fonctionnalites_plateforme from anon, authenticated; grant select on public.fonctionnalites_plateforme to authenticated;
insert into public.fonctionnalites_plateforme(code,libelle,suspendue,motif) values
 ('etat_civil_registre','Registre d’état civil local',true,'Souveraineté ANEC : registre national (NEKKAL, LGEC, Sama État civil). Les demandes citoyennes restent actives.'),
 ('budget_local','Budget, recettes et rapports budgétaires',true,'Finances locales gérées par GFILOC et consolidées par OBFiLoc (DGCPT). Pas de silo parallèle.')
on conflict(code) do nothing;

create or replace function public.fonctionnalite_active(p_code text) returns boolean
language sql stable security definer set search_path='' as
$$ select not coalesce((select suspendue from public.fonctionnalites_plateforme where code=p_code),false) $$;
create or replace function public.fonctionnalites_suspendues() returns text[]
language sql stable security definer set search_path='' as
$$ select coalesce(array_agg(code order by code),'{}') from public.fonctionnalites_plateforme where suspendue $$;
revoke all on function public.fonctionnalite_active(text), public.fonctionnalites_suspendues() from public, anon;
grant execute on function public.fonctionnalite_active(text), public.fonctionnalites_suspendues() to authenticated;

create or replace function public.saas_fonctionnalite_set(p_code text,p_suspendue boolean,p_motif text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.pgarde(array['proprietaire','admin']);
 update public.fonctionnalites_plateforme set suspendue=p_suspendue, motif=coalesce(p_motif,motif), maj=now(), maj_par=auth.uid() where code=p_code;
 if not found then raise exception 'Fonctionnalité inconnue'; end if;
end $$;
revoke all on function public.saas_fonctionnalite_set(text,boolean,text) from public, anon; grant execute on function public.saas_fonctionnalite_set(text,boolean,text) to authenticated;

create or replace function private.gate_fonctionnalite() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not public.fonctionnalite_active(TG_ARGV[0]) then
  raise exception 'Fonctionnalité suspendue (%): gérée par le système national.',TG_ARGV[0] using errcode='P0001';
 end if;
 return coalesce(new,old);
end $$;

-- Verrouillage serveur : écriture (tous) ; lecture bloquée pour le budget seulement (trigger, couvre aussi les RPC SECURITY DEFINER) + lecture (policy restrictive).
do $$ declare r record; begin
 for r in select * from (values
  ('actes_etat_civil','etat_civil_registre'),('actes_mentions_marginales','etat_civil_registre'),('actes_copies','etat_civil_registre'),
  ('budgets','budget_local'),('budget_lignes','budget_local'),('engagements','budget_local')) v(t,c)
 loop
  if to_regclass('public.'||r.t) is null then continue; end if;
  execute format('drop trigger if exists zz_gate_ff on public.%I',r.t);
  execute format('create trigger zz_gate_ff before insert or update or delete on public.%I for each row execute function private.gate_fonctionnalite(%L)',r.t,r.c);
  execute format('drop policy if exists ff_gate_sel on public.%I',r.t);
  if r.c='etat_civil_registre' then continue; end if; -- registre local : lecture seule (archive, migration vers l’ANEC)
  execute format('create policy ff_gate_sel on public.%I as restrictive for select to authenticated using (public.fonctionnalite_active(%L))',r.t,r.c);
 end loop;
end $$;
