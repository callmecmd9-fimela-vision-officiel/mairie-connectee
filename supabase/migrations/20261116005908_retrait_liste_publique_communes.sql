-- Retire la liste publique des communes pour anon ; accès uniquement par slug exact via RPC.
drop policy if exists communes_lecture_anon on public.communes;

create or replace function public.commune_par_slug(p_slug text)
returns table(id uuid, slug text, nom text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.nom from public.communes c
  where c.slug = lower(trim(p_slug)) and c.statut = any (array['essai','actif'])
$$;
revoke all on function public.commune_par_slug(text) from public;
grant execute on function public.commune_par_slug(text) to anon, authenticated;

-- ia_usage : policy explicite (déjà sans accès anon/authenticated ; clarifie l'intention)
drop policy if exists iau_deny on public.ia_usage;
create policy iau_deny on public.ia_usage for all to anon, authenticated using (false) with check (false);