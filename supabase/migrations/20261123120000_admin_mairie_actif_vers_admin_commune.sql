-- Interface « Administration Système » pour les administrateurs de mairie, dans le périmètre de LEUR commune.
-- Le rôle super_admin est limité à sa commune (RLS restrictive isolation_commune + garde _garde « autre commune »).
-- Le rôle réellement global est platform_admins : il n'est jamais attribué ici.
-- Un compte admin_mairie ACTIVÉ avec une commune devient super_admin de cette commune (la double authentification
-- TOTP est alors exigée : js/core.js côté front, is_super_admin() aal2 côté base). Les comptes en attente
-- (inactifs ou sans commune) restent admin_mairie : le circuit d'invitation et d'activation est inchangé.
create or replace function private._admin_mairie_actif_vers_admin_commune()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.role::text = 'admin_mairie' and coalesce(new.actif, false) and new.commune_id is not null then
    new.role := 'super_admin';
  end if;
  return new;
end;
$$;
revoke all on function private._admin_mairie_actif_vers_admin_commune() from public, anon, authenticated;

drop trigger if exists admin_mairie_actif_vers_admin_commune on public.profiles;
create trigger admin_mairie_actif_vers_admin_commune
  before insert or update of role, actif, commune_id on public.profiles
  for each row execute function private._admin_mairie_actif_vers_admin_commune();
