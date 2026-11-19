create or replace function private.hors_maintenance() returns boolean language sql stable security definer set search_path='' as $$
select coalesce((select p.role='super_admin' from public.profiles p where p.id=(select auth.uid())),false)
 or not exists (select 1 from public.parametres_systeme s
   where s.cle='maintenance' and jsonb_typeof(s.valeur)='object' and coalesce((s.valeur->>'actif')::boolean,false)
   and s.commune_id=(select p.commune_id::text from public.profiles p where p.id=(select auth.uid())))
$$;
revoke all on function private.hors_maintenance() from public, anon;
grant execute on function private.hors_maintenance() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['rdv','audit_log','medias','publications','demande_historique','finances','adjoints','demandes','indicateurs','delegations','deliberations','reunions','reunion_participants','projets','rapports','messages','notifications','instructions','ops_historique','services','courrier','actes','dossiers','conseillers','documents','documents_consultations','sessions_conseil','session_presences']
  loop
    execute format('drop policy if exists maintenance_serveur on public.%I', t);
    execute format('create policy maintenance_serveur on public.%I as restrictive for all to authenticated using ((select private.hors_maintenance())) with check ((select private.hors_maintenance()))', t);
  end loop;
end $$;

create or replace function private.purge_anonymes() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  delete from auth.users where is_anonymous and created_at < now() - interval '2 days';
  get diagnostics n = row_count; return n;
end $$;
revoke all on function private.purge_anonymes() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname='purge-anonymes';
select cron.schedule('purge-anonymes','17 3 * * *','select private.purge_anonymes()');