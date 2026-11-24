-- MAJ27 : état « demande consultée » partagé entre tous les appareils d'un agent (pastille de la cloche de la mairie).
-- Table privée par utilisateur ; écriture uniquement par la fonction ci-dessous ; lecture : ses propres lignes, dans SA commune. Idempotent.
-- Sans ce script, l'application fonctionne comme avant (mémoire locale à l'appareil) : aucun risque de régression.
create table if not exists public.demandes_vues(
 user_id uuid not null references auth.users(id) on delete cascade,
 demande_id uuid not null references public.demandes(id) on delete cascade,
 commune_id uuid not null references public.communes(id) on delete cascade,
 vu_le timestamptz not null default now(),
 primary key(user_id,demande_id));
create index if not exists demandes_vues_demande_idx on public.demandes_vues(demande_id);
create index if not exists demandes_vues_commune_idx on public.demandes_vues(commune_id);
alter table public.demandes_vues enable row level security;
drop policy if exists demandes_vues_sel on public.demandes_vues;
create policy demandes_vues_sel on public.demandes_vues for select to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=demandes_vues.commune_id));
revoke all on public.demandes_vues from public,anon,authenticated;
grant select on public.demandes_vues to authenticated;

-- Marque une demande comme consultée par l'appelant. Refuse (false) toute demande hors de SA commune ; ne révèle rien ; idempotente.
create or replace function public.marquer_demande_vue(p_demande uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare c uuid;
begin
 if auth.uid() is null or p_demande is null then return false; end if;
 select d.commune_id into c from public.demandes d
  where d.id=p_demande and exists(select 1 from public.profiles p where p.id=auth.uid() and p.commune_id=d.commune_id);
 if c is null then return false; end if;
 insert into public.demandes_vues(user_id,demande_id,commune_id) values(auth.uid(),p_demande,c) on conflict(user_id,demande_id) do nothing;
 return true;
end $$;
revoke all on function public.marquer_demande_vue(uuid) from public,anon;
grant execute on function public.marquer_demande_vue(uuid) to authenticated;
