-- PRÊT POUR LA PRODUCTION — NON APPLIQUÉ (accord requis). File d'attente SMS indépendante du fournisseur. Staging d'abord ; production sur accord explicite.
create table if not exists public.sms_parametres(
 commune_id uuid primary key references public.communes(id) on delete cascade,
 actif boolean not null default false,
 quota_mensuel int check(quota_mensuel is null or quota_mensuel>=0),
 langue text not null default 'fr' check(langue in ('fr','wo','sr')),
 updated_at timestamptz not null default now());
create table if not exists public.sms_outbox(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 to_phone text not null check(length(to_phone) between 8 and 20),
 modele text not null check(length(modele)<=40),
 body text not null check(length(body) between 1 and 480),
 segments int not null default 1,
 statut text not null default 'en_attente' check(statut in ('en_attente','envoye','echec','annule')),
 attempts int not null default 0,
 next_try_at timestamptz not null default now(),
 provider_ref text, erreur text,
 created_at timestamptz not null default now(), sent_at timestamptz);
create index if not exists sms_outbox_due_idx on public.sms_outbox(next_try_at) where statut='en_attente';
create index if not exists sms_outbox_commune_idx on public.sms_outbox(commune_id,created_at desc);
alter table public.sms_parametres enable row level security; alter table public.sms_outbox enable row level security;
revoke all on public.sms_parametres, public.sms_outbox from anon, authenticated;
-- lecture du statut par le maire/secrétariat de SA commune uniquement (pas d'écriture directe ; pas de lecture des corps pour les autres rôles)
grant select on public.sms_outbox, public.sms_parametres to authenticated;
drop policy if exists sms_outbox_staff on public.sms_outbox;
create policy sms_outbox_staff on public.sms_outbox for select to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=sms_outbox.commune_id and p.role in ('maire','secretariat')));
drop policy if exists sms_param_staff on public.sms_parametres;
create policy sms_param_staff on public.sms_parametres for select to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=sms_parametres.commune_id and p.role in ('maire','secretariat')));

-- Mise en file : service_role uniquement (Edge Functions / triggers serveur). Le corps est déjà rendu côté serveur à partir d'un modèle.
create or replace function public.sms_enfiler(p_commune uuid,p_to text,p_modele text,p_body text,p_segments int default 1)
returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid; begin
 if not exists(select 1 from public.sms_parametres where commune_id=p_commune and actif) then return null; end if;
 insert into public.sms_outbox(commune_id,to_phone,modele,body,segments) values(p_commune,p_to,p_modele,p_body,greatest(1,p_segments)) returning id into v; return v; end $$;
-- Prise en charge concurrente sûre (skip locked) + quota du mois courant
create or replace function public.sms_prendre(p_n int default 20)
returns table(id uuid,to_phone text,body text,attempts int,actif boolean,quota int,utilises int) language plpgsql security definer set search_path='' as $$
begin return query
 with c as (select o.id from public.sms_outbox o where o.statut='en_attente' and o.next_try_at<=now() order by o.next_try_at limit least(greatest(p_n,1),100) for update skip locked),
 u as (update public.sms_outbox o set attempts=o.attempts+1,next_try_at=now()+interval '10 minutes' from c where o.id=c.id returning o.*)
 select u.id,u.to_phone,u.body,u.attempts-1,coalesce(p.actif,false),p.quota_mensuel,
  coalesce((select sum(x.segments)::int from public.sms_outbox x where x.commune_id=u.commune_id and x.statut='envoye' and x.sent_at>=date_trunc('month',now())),0)
 from u left join public.sms_parametres p on p.commune_id=u.commune_id; end $$;
create or replace function public.sms_resultat(p_id uuid,p_ok boolean,p_ref text,p_err text,p_final boolean,p_delay_s int)
returns void language sql security definer set search_path='' as $$
 update public.sms_outbox set statut=case when p_ok then 'envoye' when p_final then 'echec' else 'en_attente' end,
  provider_ref=coalesce(p_ref,provider_ref),erreur=left(p_err,200),sent_at=case when p_ok then now() else sent_at end,
  next_try_at=case when p_ok or p_final then next_try_at else now()+make_interval(secs=>greatest(p_delay_s,30)) end
 where id=p_id $$;
revoke all on function public.sms_enfiler(uuid,text,text,text,int),public.sms_prendre(int),public.sms_resultat(uuid,boolean,text,text,boolean,int) from public,anon,authenticated;
grant execute on function public.sms_enfiler(uuid,text,text,text,int),public.sms_prendre(int),public.sms_resultat(uuid,boolean,text,text,boolean,int) to service_role;
