-- Archivage réversible d'une mairie + suppression LIMITÉE aux mairies vides.
-- Plateforme uniquement (private.pgarde : MFA AAL2). N'ajoute aucun statut : une mairie archivée est
-- « resilie » (les garde-fous RLS existants la bloquent) + marqueur archive_le.
begin;
alter table public.communes add column if not exists archive_le timestamptz;
alter table public.communes add column if not exists archive_statut text;

create or replace function public.saas_archives() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.pgarde(array['proprietaire','admin']);
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'archive_le',archive_le)) from public.communes where archive_le is not null),'[]'::jsonb);
end $$;

create or replace function public.saas_archiver_commune(p_commune uuid,p_motif text)
returns void language plpgsql security definer set search_path = ''
as $$
declare s text; a timestamptz;
begin
  perform private.pgarde(array['proprietaire','admin']);
  if coalesce(length(trim(p_motif)),0)<5 then raise exception 'Motif obligatoire (5 caractères minimum)'; end if;
  select statut,archive_le into s,a from public.communes where id=p_commune for update;
  if not found then raise exception 'Mairie introuvable'; end if;
  if a is not null then raise exception 'Mairie déjà archivée'; end if;
  perform public.saas_set_statut(p_commune,'resilie',trim(p_motif));
  update public.communes set archive_le=now(),archive_statut=s where id=p_commune;
  perform private.paudit('commune_archiver',p_commune,jsonb_build_object('statut_precedent',s,'motif',trim(p_motif)));
end $$;

create or replace function public.saas_restaurer_commune(p_commune uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare s text; a timestamptz; cible text;
begin
  perform private.pgarde(array['proprietaire','admin']);
  select archive_statut,archive_le into s,a from public.communes where id=p_commune for update;
  if not found then raise exception 'Mairie introuvable'; end if;
  if a is null then raise exception 'Mairie non archivée'; end if;
  cible:=case when s in ('essai','actif') then s else 'suspendu' end;
  perform public.saas_set_statut(p_commune,cible,case when cible='suspendu' then 'Restaurée depuis l’archive (suspendue)' end);
  update public.communes set archive_le=null,archive_statut=null where id=p_commune;
  perform private.paudit('commune_restaurer',p_commune,jsonb_build_object('statut',cible));
end $$;

-- Suppression : mairie ARCHIVÉE, slug re-saisi, et totalement vide (seuls l'abonnement, les indicateurs,
-- les compteurs créés automatiquement et les comptes admin_mairie sont tolérés). Les comptes admin_mairie
-- sont libérés (retour citoyen, sans commune), jamais supprimés.
create or replace function public.saas_supprimer_commune(p_commune uuid,p_slug text)
returns void language plpgsql security definer set search_path = ''
as $$
declare c record; r record; n bigint; a uuid;
begin
  perform private.pgarde(array['proprietaire','admin']);
  select id,slug,nom,archive_le into c from public.communes where id=p_commune for update;
  if not found then raise exception 'Mairie introuvable'; end if;
  if c.archive_le is null then raise exception 'Archivez d’abord la mairie avant de la supprimer'; end if;
  if lower(trim(coalesce(p_slug,'')))<>c.slug then raise exception 'Confirmation incorrecte : saisissez l’identifiant exact de la mairie'; end if;
  if exists(select 1 from public.profiles where commune_id=p_commune and role::text<>'admin_mairie') then
    raise exception 'Suppression refusée : la mairie a des utilisateurs autres que son administrateur';
  end if;
  for r in select distinct conrelid::regclass::text tbl from pg_constraint
           where contype='f' and confrelid='public.communes'::regclass
             and conrelid::regclass::text not in ('public.abonnements','public.indicateurs','public.compteurs','public.profiles') loop
    execute format('select count(*) from %s where commune_id=$1',r.tbl) into n using p_commune;
    if n>0 then raise exception 'Suppression refusée : la mairie contient des données (%)',replace(r.tbl,'public.',''); end if;
  end loop;
  perform private.paudit('commune_supprimer',p_commune,jsonb_build_object('nom',c.nom,'slug',c.slug));
  for a in select id from public.profiles where commune_id=p_commune and role::text='admin_mairie' loop
    update public.profiles set role='citoyen',commune_id=null,actif=true,statut_admin=null where id=a;
  end loop;
  delete from public.communes where id=p_commune;
end $$;

revoke all on function public.saas_archives() from public, anon;
revoke all on function public.saas_archiver_commune(uuid,text) from public, anon;
revoke all on function public.saas_restaurer_commune(uuid) from public, anon;
revoke all on function public.saas_supprimer_commune(uuid,text) from public, anon;
grant execute on function public.saas_archives() to authenticated;
grant execute on function public.saas_archiver_commune(uuid,text) to authenticated;
grant execute on function public.saas_restaurer_commune(uuid) to authenticated;
grant execute on function public.saas_supprimer_commune(uuid,text) to authenticated;
commit;
