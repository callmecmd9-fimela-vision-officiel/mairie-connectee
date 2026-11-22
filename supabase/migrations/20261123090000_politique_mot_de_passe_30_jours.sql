-- Politique de mot de passe : renouvellement obligatoire tous les 30 jours, alerte à J-7.
-- Principes :
--   * Aucun mot de passe n'est jamais lisible (Supabase Auth ne conserve qu'une empreinte bcrypt).
--     Le super-administrateur ne voit donc que l'ÉTAT de renouvellement (dates, jours restants) et
--     garde la réinitialisation par lien sécurisé (Edge Function sa-admin) pour les mots de passe oubliés.
--   * La date de dernier changement est tenue par la base elle-même (déclencheur sur auth.users) :
--     le navigateur ne peut pas la falsifier.
--   * Les comptes existants démarrent avec une échéance de 30 jours à partir de cette migration
--     (aucun blocage massif le jour du déploiement).

create table if not exists public.user_password_policy (
  user_id uuid primary key references auth.users (id) on delete cascade,
  password_changed_at timestamptz not null default now()
);

alter table public.user_password_policy enable row level security;
-- Aucune politique RLS : la table n'est lisible que par les fonctions ci-dessous (security definer).
revoke all on public.user_password_policy from anon, authenticated;

-- Comptes existants : échéance à 30 jours à partir de maintenant.
insert into public.user_password_policy (user_id, password_changed_at)
select u.id, now() from auth.users u
on conflict (user_id) do nothing;

create or replace function public._mdp_trace_changement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_password_policy (user_id, password_changed_at)
  values (new.id, now())
  on conflict (user_id) do update set password_changed_at = excluded.password_changed_at;
  return new;
end;
$$;

revoke all on function public._mdp_trace_changement() from public, anon, authenticated;

drop trigger if exists mdp_trace_creation on auth.users;
create trigger mdp_trace_creation
  after insert on auth.users
  for each row execute function public._mdp_trace_changement();

drop trigger if exists mdp_trace_changement on auth.users;
create trigger mdp_trace_changement
  after update of encrypted_password on auth.users
  for each row
  when (old.encrypted_password is distinct from new.encrypted_password)
  execute function public._mdp_trace_changement();

-- État du renouvellement pour l'utilisateur connecté (utilisé par js/mdp-policy.js).
create or replace function public.mdp_politique_statut()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_at timestamptz;
  v_jours int;
  v_max constant int := 30;
  v_alerte constant int := 7;
begin
  if v_uid is null then
    return null;
  end if;
  select password_changed_at into v_at from public.user_password_policy where user_id = v_uid;
  if v_at is null then
    insert into public.user_password_policy (user_id, password_changed_at)
    values (v_uid, now())
    on conflict (user_id) do nothing;
    v_at := now();
  end if;
  v_jours := greatest(0, floor(extract(epoch from (now() - v_at)) / 86400))::int;
  return jsonb_build_object(
    'changed_at', v_at,
    'jours_ecoules', v_jours,
    'jours_restants', greatest(0, v_max - v_jours),
    'max_jours', v_max,
    'alerte_jours', v_alerte,
    'expire', v_jours >= v_max,
    'alerte', v_jours < v_max and (v_max - v_jours) <= v_alerte
  );
end;
$$;

revoke all on function public.mdp_politique_statut() from public, anon;
grant execute on function public.mdp_politique_statut() to authenticated;

-- Vue super-administrateur : état de renouvellement de tous les comptes (jamais les mots de passe).
create or replace function public.sa_mdp_statuts()
returns table (
  user_id uuid,
  email text,
  role text,
  commune_id text,
  password_changed_at timestamptz,
  jours_ecoules int,
  jours_restants int,
  expire boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'super_admin') then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  return query
  select p.id,
         u.email::text,
         p.role::text,
         p.commune_id::text,
         pp.password_changed_at,
         greatest(0, floor(extract(epoch from (now() - pp.password_changed_at)) / 86400))::int,
         greatest(0, 30 - greatest(0, floor(extract(epoch from (now() - pp.password_changed_at)) / 86400))::int),
         floor(extract(epoch from (now() - pp.password_changed_at)) / 86400) >= 30
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.user_password_policy pp on pp.user_id = p.id
  order by pp.password_changed_at asc nulls first;
end;
$$;

revoke all on function public.sa_mdp_statuts() from public, anon;
grant execute on function public.sa_mdp_statuts() to authenticated;
