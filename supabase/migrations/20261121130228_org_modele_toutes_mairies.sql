-- Organisation modèle pour TOUTES les mairies : mêmes rôles, postes, droits et services que la mairie de référence (Fimela).
-- Additive et idempotente. Ne s'applique jamais à une commune qui possède déjà une organisation.
-- (Source : supabase_migrations.schema_migrations, version 20261121130228, relevée en lecture seule le 2026-11-22.)

create or replace function private.org_commune_modele() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.communes where slug = 'fimela' $$;

create or replace function private.org_modele_copier(p_source uuid, p_cible uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_source is null or p_cible is null or p_source = p_cible then return; end if;

  insert into public.org_roles(commune_id,code,nom,famille,description,systeme,actif)
  select p_cible,code,nom,famille,description,systeme,actif from public.org_roles where commune_id = p_source
  on conflict do nothing;

  insert into public.org_role_droits(commune_id,role_code,module,action)
  select p_cible,d.role_code,d.module,d.action from public.org_role_droits d
  where d.commune_id = p_source
    and not (d.module = 'org' and d.action in ('creer','modifier','supprimer','administrer'))
    and exists(select 1 from public.org_roles r where r.commune_id = p_cible and r.code = d.role_code)
  on conflict do nothing;

  insert into public.services(commune_id,code,nom,type,ordre,description,actif)
  select p_cible,code,nom,type,ordre,description,actif from public.services where commune_id = p_source
  on conflict do nothing;

  update public.services t set parent_id = tp.id
  from public.services s
  join public.services sp on sp.id = s.parent_id
  join public.services tp on tp.commune_id = p_cible and tp.code = sp.code
  where s.commune_id = p_source and t.commune_id = p_cible and t.code = s.code and t.parent_id is null;

  insert into public.org_postes(commune_id,code,nom,famille,role_code,parent_code,service_code,systeme,actif)
  select p_cible,code,nom,famille,role_code,parent_code,service_code,systeme,actif from public.org_postes where commune_id = p_source
  on conflict do nothing;
end
$$;

create or replace function private.org_provisionner_commune(p_commune uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare ref uuid; src text;
begin
  if p_commune is null then raise exception 'Commune obligatoire'; end if;
  if exists(select 1 from public.org_roles where commune_id = p_commune)
     or exists(select 1 from public.org_postes where commune_id = p_commune) then
    return jsonb_build_object('applique', false, 'raison', 'organisation_deja_presente');
  end if;
  ref := private.org_commune_modele();
  if ref is not null and ref <> p_commune and exists(select 1 from public.org_roles where commune_id = ref) then
    perform private.org_modele_copier(ref, p_commune); src := 'modele';
  else
    perform public.org_seed(p_commune); src := 'catalogue_defaut';
  end if;
  return jsonb_build_object('applique', true, 'source', src,
    'roles',    (select count(*) from public.org_roles where commune_id = p_commune),
    'postes',   (select count(*) from public.org_postes where commune_id = p_commune),
    'droits',   (select count(*) from public.org_role_droits where commune_id = p_commune),
    'services', (select count(*) from public.services where commune_id = p_commune));
end
$$;

create or replace function private.trg_org_provisionner_commune() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  begin
    perform private.org_provisionner_commune(new.id);
  exception when others then
    raise warning 'Organisation non provisionnée pour la commune % : %', new.id, sqlerrm;
  end;
  return new;
end
$$;
drop trigger if exists trg_org_provisionner_commune on public.communes;
create trigger trg_org_provisionner_commune after insert on public.communes
  for each row execute function private.trg_org_provisionner_commune();

create or replace function public.saas_org_provisionner(p_slug text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare c uuid; r jsonb;
begin
  perform private.pgarde(array['proprietaire','admin']);
  select id into c from public.communes where slug = lower(trim(p_slug));
  if c is null then raise exception 'Commune inconnue'; end if;
  r := private.org_provisionner_commune(c);
  perform private.paudit('org_modele_appliquer', c, r);
  return r;
end
$$;

revoke all on function private.org_commune_modele(), private.org_modele_copier(uuid,uuid),
  private.org_provisionner_commune(uuid), private.trg_org_provisionner_commune() from public, anon, authenticated;
revoke all on function public.saas_org_provisionner(text) from public, anon;
grant execute on function public.saas_org_provisionner(text) to authenticated;

do $$
declare c record;
begin
  for c in select id from public.communes order by created_at loop
    perform private.org_provisionner_commune(c.id);
  end loop;
end $$;
