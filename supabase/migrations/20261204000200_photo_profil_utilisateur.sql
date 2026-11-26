-- Photo PAR UTILISATEUR (profiles.photo) : corrige le bug « la photo du responsable s'applique à l'admin ET au maire ».
-- PROPOSÉE, non appliquée. Idempotente. Valable pour toutes les communes, présentes et futures (aucune valeur codée en dur).
-- Garde : public._garde_am(commune) = super admin de la plateforme OU admin_mairie de CETTE commune (isolation multi-communes).
alter table public.profiles add column if not exists photo text;

-- Définit / retire (p_chemin null) la photo d'un utilisateur de la commune. Renvoie l'ancien chemin (à supprimer du stockage).
create or replace function public.sa_set_profil_photo(p_commune text, p_user uuid, p_chemin text) returns text
language plpgsql security definer set search_path = '' as $$
declare old text; n int;
begin
  perform public._garde_am(p_commune);
  if p_chemin is not null and left(p_chemin, length(p_commune) + 9) <> p_commune || '/profils/' then
    raise exception 'Chemin invalide';
  end if;
  select p.photo into old from public.profiles p
   where p.id = p_user and (p.commune_id::text = p_commune or p.id = (select auth.uid()));
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Utilisateur introuvable dans cette commune'; end if;
  update public.profiles set photo = p_chemin where id = p_user;
  perform public._audit(p_commune, 'photo_profil_set', p_user::text, jsonb_build_object('chemin', p_chemin));
  return old;
end $$;

-- Photos des utilisateurs de la commune (affichage dans l'écran Utilisateurs).
create or replace function public.sa_profils_photos(p_commune text) returns table(id uuid, photo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._garde_am(p_commune);
  return query select p.id, p.photo from public.profiles p where p.commune_id::text = p_commune and p.photo is not null;
end $$;

-- Photo de l'utilisateur connecté (jamais celle d'un autre).
create or replace function public.mon_profil_photo() returns text
language sql stable security definer set search_path = '' as $$
  select p.photo from public.profiles p where p.id = (select auth.uid())
$$;

revoke all on function public.sa_set_profil_photo(text, uuid, text) from public, anon;
revoke all on function public.sa_profils_photos(text) from public, anon;
revoke all on function public.mon_profil_photo() from public, anon;
grant execute on function public.sa_set_profil_photo(text, uuid, text) to authenticated;
grant execute on function public.sa_profils_photos(text) to authenticated;
grant execute on function public.mon_profil_photo() to authenticated;
