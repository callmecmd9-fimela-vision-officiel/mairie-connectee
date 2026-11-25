-- LOT 1 bis : lecture publique minimale des signalements d'une commune pour la carte 3D du portail citoyen.
-- N'expose NI description, NI photo, NI auteur : seulement catégorie, statut, position et date. Les signalements « rejete » sont exclus.
-- Le front appelle signalements_carte ; sans elle, il se replie sur la table (lisible seulement par les agents, RLS sigc_staff_sel).
create or replace function public.signalements_carte(p_commune text)
returns table(id uuid, categorie text, statut text, latitude double precision, longitude double precision, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id::uuid, s.categorie::text, coalesce(s.statut::text, 'nouveau'), s.latitude::double precision, s.longitude::double precision, s.created_at::timestamptz
  from public.signalements_citoyens s
  join public.communes c on c.id = s.commune_id
  where c.slug = lower(trim(p_commune)) and c.statut in ('essai','actif')
    and coalesce(s.statut::text, 'nouveau') <> 'rejete'
    and s.latitude is not null and s.longitude is not null
  order by s.created_at desc
  limit 1000;
$$;
revoke all on function public.signalements_carte(text) from public;
grant execute on function public.signalements_carte(text) to anon, authenticated;
