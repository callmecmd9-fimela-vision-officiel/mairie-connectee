-- PROPOSÉ — NON APPLIQUÉ. Notifications push Web (VAPID) pour les citoyens. À répéter en staging avant production (accord requis).
-- Idempotent. Aucune donnée existante modifiée.
create table if not exists public.push_subscriptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check(length(endpoint) between 20 and 2000 and endpoint like 'https://%'),
 p256dh text not null check(length(p256dh) between 20 and 200),
 auth text not null check(length(auth) between 8 and 100),
 user_agent text check(length(user_agent)<=300),
 failures int not null default 0,
 created_at timestamptz not null default now(),
 last_ok_at timestamptz,
 unique(endpoint));
create index if not exists push_sub_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
-- lecture de ses propres abonnements seulement ; les écritures passent par les RPC ci-dessous
grant select on public.push_subscriptions to authenticated;
drop policy if exists push_sub_own_select on public.push_subscriptions;
create policy push_sub_own_select on public.push_subscriptions for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.push_enregistrer(p_endpoint text,p_p256dh text,p_auth text,p_ua text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then raise exception 'Connexion requise'; end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,user_agent)
 values((select auth.uid()),p_endpoint,p_p256dh,p_auth,left(p_ua,300))
 on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,user_agent=excluded.user_agent,failures=0;
end $$;
create or replace function public.push_supprimer(p_endpoint text)
returns void language sql security definer set search_path='' as $$
 delete from public.push_subscriptions where endpoint=p_endpoint and user_id=(select auth.uid()) $$;
revoke all on function public.push_enregistrer(text,text,text,text),public.push_supprimer(text) from public,anon;
grant execute on function public.push_enregistrer(text,text,text,text),public.push_supprimer(text) to authenticated;

-- Lecture réservée à l'Edge Function push-send (service_role) : abonnements d'un citoyen + nettoyage des points d'arrivée expirés
create or replace function public.push_abonnements(p_user uuid)
returns table(endpoint text,p256dh text,auth text) language sql stable security definer set search_path='' as $$
 select s.endpoint,s.p256dh,s.auth from public.push_subscriptions s where s.user_id=p_user and s.failures<5 $$;
create or replace function public.push_resultat(p_endpoint text,p_ok boolean,p_gone boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_gone then delete from public.push_subscriptions where endpoint=p_endpoint;
 elsif p_ok then update public.push_subscriptions set failures=0,last_ok_at=now() where endpoint=p_endpoint;
 else update public.push_subscriptions set failures=failures+1 where endpoint=p_endpoint; end if;
end $$;
revoke all on function public.push_abonnements(uuid),public.push_resultat(text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.push_abonnements(uuid),public.push_resultat(text,boolean,boolean) to service_role;
-- Déclenchement : Supabase > Database > Webhooks > table citoyen_notifications, événement INSERT, HTTP POST vers la fonction push-send,
-- en-tête x-push-secret = PUSH_WEBHOOK_SECRET (aucun trigger SQL : le secret ne transite pas par la base).
