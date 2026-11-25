-- Version 14 chiffres (ordre correct après 20261123120000 pour la CLI Supabase).
-- Repli sur le nom si le slug exact est absent (ex. Djilass dont le slug n'est pas confirmé).
-- LOT A : socle géographique des communes (carte 3D / Leaflet / signalements).
-- Idempotent : ADD COLUMN IF NOT EXISTS + UPDATE rejouable. Aucune donnée existante supprimée.
-- bbox = rectangle approximatif autour du centre (PAS un contour administratif officiel).
-- geojson_perimetre = polygone rectangulaire dérivé de la bbox (provisoire, à remplacer par le tracé officiel).

alter table public.communes
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists zoom_defaut smallint,
  add column if not exists bbox jsonb,
  add column if not exists geojson_perimetre jsonb;

alter table public.communes drop constraint if exists communes_geo_chk;
alter table public.communes add constraint communes_geo_chk check (
  (latitude is null or latitude between -90 and 90)
  and (longitude is null or longitude between -180 and 180)
  and (zoom_defaut is null or zoom_defaut between 1 and 22)
);

comment on column public.communes.latitude is 'Latitude du centre de la commune (WGS84).';
comment on column public.communes.longitude is 'Longitude du centre de la commune (WGS84).';
comment on column public.communes.zoom_defaut is 'Niveau de zoom par défaut des cartes.';
comment on column public.communes.bbox is 'Emprise rectangulaire approximative {south,west,north,east}.';
comment on column public.communes.geojson_perimetre is 'Périmètre GeoJSON (Polygon) ; provisoire = rectangle de la bbox.';

with g(slugs, nom, lat, lng, zoom, s, w, n, e) as (
  values
    (array['fimela'], 'Fimela', 14.133, -16.659, 11, 14.033, -16.759, 14.233, -16.559),
    (array['commune-de-diofior','diofior'], 'Diofior', 14.189, -16.661, 13, 14.139, -16.711, 14.239, -16.611),
    (array['djilass'], 'Djilass', 14.25, -16.633, 12, 14.19, -16.693, 14.31, -16.573),
    (array['fatick'], 'Fatick', 14.316, -16.416, 12, 14.236, -16.496, 14.396, -16.336),
    (array['djirnda'], 'Djirnda', 13.981, -16.608, 12, 13.911, -16.678, 14.051, -16.538)
)
update public.communes c
set latitude = g.lat,
    longitude = g.lng,
    zoom_defaut = g.zoom,
    bbox = jsonb_build_object('south', g.s, 'west', g.w, 'north', g.n, 'east', g.e),
    geojson_perimetre = jsonb_build_object(
      'type', 'Feature',
      'properties', jsonb_build_object('nom', g.nom, 'approximatif', true),
      'geometry', jsonb_build_object('type', 'Polygon', 'coordinates', jsonb_build_array(jsonb_build_array(
        jsonb_build_array(g.w, g.s), jsonb_build_array(g.e, g.s), jsonb_build_array(g.e, g.n),
        jsonb_build_array(g.w, g.n), jsonb_build_array(g.w, g.s))))
    )
from g
where c.slug = any(g.slugs)
   or (c.nom ilike '%' || g.nom || '%' and not exists (
        select 1 from public.communes c2 where c2.slug = any(g.slugs)));
