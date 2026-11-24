-- LOT 1 : insertion des signalements citoyens verrouillée par commune (à appliquer après vérification).
-- Le front appelle creer_signalement ; tant qu'elle n'est pas déployée, il se replie sur l'insertion directe.
create or replace function public.creer_signalement(p_commune text, p_categorie text, p_description text, p_photo_url text, p_latitude double precision, p_longitude double precision)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.communes; v_id uuid;
begin
  select * into c from public.communes where slug = lower(trim(p_commune)) and statut in ('essai','actif');
  if c.id is null then raise exception 'Commune inconnue'; end if;
  if char_length(trim(coalesce(p_description,''))) not between 5 and 2000 or char_length(coalesce(p_categorie,'')) not between 1 and 60
     or p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Signalement invalide';
  end if;
  if p_photo_url is not null and position('/storage/v1/object/public/signalements-photos/'||c.id::text||'/' in p_photo_url) = 0 then
    raise exception 'Photo invalide pour cette commune';
  end if;
  insert into public.signalements_citoyens(commune_id, categorie, description, photo_url, latitude, longitude)
  values (c.id, p_categorie, trim(p_description), p_photo_url, p_latitude, p_longitude) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.creer_signalement(text,text,text,text,double precision,double precision) from public;
grant execute on function public.creer_signalement(text,text,text,text,double precision,double precision) to anon, authenticated;

-- Plus d'insertion directe dans la table : seule la RPC (commune déduite du slug) peut créer un signalement.
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='signalements_citoyens' and cmd='INSERT' loop
    execute format('drop policy %I on public.signalements_citoyens', r.policyname);
  end loop;
end $$;
revoke insert on public.signalements_citoyens from anon, authenticated;

-- Photos : le dossier racine doit être l'id d'une commune active (policy restrictive, s'ajoute aux existantes).
drop policy if exists signalements_photos_commune_active on storage.objects;
create policy signalements_photos_commune_active on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'signalements-photos' or (name ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
    and exists (select 1 from public.communes c where c.id::text = split_part(name,'/',1) and c.statut in ('essai','actif'))));
