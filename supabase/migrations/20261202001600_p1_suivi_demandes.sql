-- P1 Suivi anonyme des demandes citoyennes (loi 2008-12 : aucun compte obligatoire) — PROPOSÉE, non appliquée.
-- Version 001600 : la version 20261202001500 est déjà utilisée (p1_fix_paiements_taxes_citoyen_fk, appliquée en production).
-- Socle : numéro de suivi FIM-YYYY-NNNNNN, jetons de suivi, vue publique sans donnée personnelle, RPC de consultation (numéro + téléphone).
-- Les numéros existants (colonne `numero`) ne sont pas modifiés ; les demandes déjà en base n'ont pas de num_suivi (pas de rétro-remplissage ici).
-- Idempotente : peut être rejouée sans erreur.

-- 1) Colonnes de suivi (lieu_retrait ajouté car exposé par la vue demandée et absent de public.demandes)
alter table public.demandes
  add column if not exists num_suivi text unique,
  add column if not exists montant_du numeric(12,2),
  add column if not exists lieu_retrait text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'demandes_montant_du_check' and conrelid = 'public.demandes'::regclass) then
    alter table public.demandes add constraint demandes_montant_du_check check (montant_du is null or montant_du >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'demandes_lieu_retrait_check' and conrelid = 'public.demandes'::regclass) then
    alter table public.demandes add constraint demandes_lieu_retrait_check check (lieu_retrait is null or char_length(lieu_retrait) <= 200);
  end if;
end $$;

-- 2) Séquence + trigger : num_suivi généré à l'INSERT (jamais choisi par le client), immuable ensuite
create sequence if not exists public.demandes_num_suivi_seq as bigint minvalue 1 start 1;
revoke all on sequence public.demandes_num_suivi_seq from public, anon, authenticated;

create or replace function public.demandes_set_num_suivi() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.num_suivi := 'FIM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.demandes_num_suivi_seq')::text, 6, '0');
  elsif old.num_suivi is not null and new.num_suivi is distinct from old.num_suivi then
    raise exception 'Le numéro de suivi est immuable' using errcode = '55000';
  end if;
  return new;
end $$;
revoke all on function public.demandes_set_num_suivi() from public, anon, authenticated;

drop trigger if exists trg_demandes_num_suivi on public.demandes;
create trigger trg_demandes_num_suivi before insert or update of num_suivi on public.demandes
  for each row execute function public.demandes_set_num_suivi();

-- 3) Jetons de suivi (empreintes uniquement : aucun téléphone ni PIN en clair). Aucun accès direct : RLS sans politique + aucun droit client.
create table if not exists public.suivi_tokens(
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references public.demandes(id) on delete cascade,
  telephone_hash text not null check (telephone_hash ~ '^[0-9a-f]{64}$'),
  pin_hash text check (pin_hash is null or char_length(pin_hash) between 20 and 200),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists suivi_tokens_demande_idx on public.suivi_tokens(demande_id);
alter table public.suivi_tokens enable row level security;
revoke all on public.suivi_tokens from public, anon, authenticated;

-- 4) Vue publique : aucune donnée personnelle (ni nom, téléphone, message, pièces, citoyen_id)
create or replace view public.v_suivi_public with (security_invoker = true, security_barrier = true) as
  select d.num_suivi,
         d.statut,
         d.montant_du,
         coalesce(d.updated_at, d.created_at) as date_maj,
         d.lieu_retrait
    from public.demandes d
   where d.num_suivi is not null;

-- 6) Droits : la vue n'est jamais lisible directement par l'API ; seule la RPC l'expose
revoke all on public.v_suivi_public from public, anon, authenticated;

-- 5) RPC : numéro de suivi + téléphone -> état du dossier. Réponse vide (jamais d'erreur) si rien ne correspond : pas d'énumération.
create or replace function public.suivi_public(p_num text, p_tel text)
returns setof public.v_suivi_public
language plpgsql stable security definer set search_path = '' as $$
declare
  n text := upper(btrim(coalesce(p_num, '')));
  digits text := regexp_replace(coalesce(p_tel, ''), '\D', '', 'g');
  h text;
begin
  -- 9 derniers chiffres : « +221 77 123 45 67 », « 77 123 45 67 » et « 771234567 » donnent la même empreinte
  if n !~ '^FIM-[0-9]{4}-[0-9]{6}$' or char_length(digits) < 9 or char_length(digits) > 15 then
    perform pg_sleep(0.5);
    return;
  end if;
  h := encode(extensions.digest(convert_to(right(digits, 9), 'UTF8'), 'sha256'), 'hex');

  return query
    select v.*
      from public.v_suivi_public v
      join public.demandes d on d.num_suivi = v.num_suivi
     where v.num_suivi = n
       and (
         encode(extensions.digest(convert_to(right(regexp_replace(coalesce(d.telephone, ''), '\D', '', 'g'), 9), 'UTF8'), 'sha256'), 'hex') = h
         or exists (select 1 from public.suivi_tokens t where t.demande_id = d.id and t.telephone_hash = h and t.expires_at > now())
       );

  if not found then
    perform pg_sleep(0.5); -- ralentit la recherche par force brute
  end if;
  return;
end $$;

-- Les citoyens sans compte utilisent une session anonyme (rôle authenticated) : les deux rôles reçoivent EXECUTE.
revoke all on function public.suivi_public(text, text) from public;
grant execute on function public.suivi_public(text, text) to anon, authenticated;
