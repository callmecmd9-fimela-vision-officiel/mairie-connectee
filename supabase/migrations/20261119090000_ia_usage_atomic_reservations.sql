-- Quota IA atomique : réservation avant fournisseur, validation après génération.
-- Les RPC sont réservées à service_role ; aucune exposition aux rôles API publics.
-- Les réservations expirées sont libérées lors de la prochaine tentative du même utilisateur/jour.

begin;

create table private.ia_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  jour date not null,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  created_at timestamptz not null default now()
);

create index ia_usage_reservations_expiry_idx
  on private.ia_usage_reservations (user_id, jour, expires_at);

alter table private.ia_usage_reservations enable row level security;
revoke all on table private.ia_usage_reservations from public, anon, authenticated, service_role;

create or replace function public.ia_usage_reserver(
  p_user_id uuid,
  p_jour date,
  p_limite integer
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_reservation uuid;
  v_expirees integer := 0;
  v_n integer;
begin
  if p_user_id is null or p_jour is null or p_limite is null or p_limite < 1 then
    raise exception 'Paramètres de réservation invalides' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_jour::text, 0)
  );

  with supprimees as (
    delete from private.ia_usage_reservations
    where user_id = p_user_id
      and jour = p_jour
      and expires_at <= pg_catalog.now()
    returning 1
  )
  select pg_catalog.count(*)::integer into v_expirees from supprimees;

  if v_expirees > 0 then
    update public.ia_usage
       set n = greatest(n - v_expirees, 0)
     where user_id = p_user_id and jour = p_jour;
  end if;

  insert into public.ia_usage(user_id, jour, n)
  values (p_user_id, p_jour, 0)
  on conflict (user_id, jour) do nothing;

  update public.ia_usage
     set n = n + 1
   where user_id = p_user_id
     and jour = p_jour
     and n < p_limite
  returning n into v_n;

  if not found then
    return null;
  end if;

  insert into private.ia_usage_reservations(user_id, jour)
  values (p_user_id, p_jour)
  returning id into v_reservation;

  return v_reservation;
end
$function$;

create or replace function public.ia_usage_finaliser(
  p_reservation_id uuid,
  p_succes boolean
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_jour date;
begin
  if p_reservation_id is null or p_succes is null then
    return false;
  end if;

  select user_id, jour
    into v_user_id, v_jour
    from private.ia_usage_reservations
   where id = p_reservation_id;

  if not found then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || v_jour::text, 0)
  );

  select user_id, jour
    into v_user_id, v_jour
    from private.ia_usage_reservations
   where id = p_reservation_id
   for update;

  if not found then
    return false;
  end if;

  if not p_succes then
    update public.ia_usage
       set n = greatest(n - 1, 0)
     where user_id = v_user_id and jour = v_jour;
  end if;

  delete from private.ia_usage_reservations where id = p_reservation_id;
  return true;
end
$function$;

revoke all on function public.ia_usage_reserver(uuid, date, integer) from public, anon, authenticated;
revoke all on function public.ia_usage_finaliser(uuid, boolean) from public, anon, authenticated;
grant execute on function public.ia_usage_reserver(uuid, date, integer) to service_role;
grant execute on function public.ia_usage_finaliser(uuid, boolean) to service_role;

commit;
