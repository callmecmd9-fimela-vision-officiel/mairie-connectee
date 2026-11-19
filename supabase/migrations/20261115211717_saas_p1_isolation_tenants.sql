
-- 1) Isolation stricte : RESTRICTIVE sur toutes les tables à commune_id (le super_admin local ne sort plus de sa commune)
do $$ declare t text; begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  join information_schema.columns k on k.table_schema='public' and k.table_name=c.relname and k.column_name='commune_id'
  where n.nspname='public' and c.relkind='r' and c.relname not in ('communes','abonnements','factures','paiements','acces_techniques','platform_audit','platform_admins','plans','profiles') loop
  execute format('drop policy if exists isolation_commune on public.%I',t);
  execute format('create policy isolation_commune on public.%I as restrictive for all to authenticated using (commune_id::text=(select private.my_commune())::text) with check (commune_id::text=(select private.my_commune())::text)',t);
 end loop; end $$;
drop policy if exists isolation_commune on public.profiles;
create policy isolation_commune on public.profiles as restrictive for all to authenticated
 using (id=(select auth.uid()) or commune_id=(select private.my_commune()))
 with check (id=(select auth.uid()) or commune_id=(select private.my_commune()));

-- 2) Les RPC sa_* n'acceptent plus qu'une commune = la commune du super_admin appelant
create or replace function public._garde(p_commune text) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_super_admin() then raise exception 'Accès refusé' using errcode='42501'; end if;
 if p_commune is distinct from (select p.commune_id::text from public.profiles p where p.id=(select auth.uid())) then
  raise exception 'Accès refusé : autre commune' using errcode='42501'; end if;
end $$;
revoke execute on function public._garde(text) from public, anon;
do $$ declare f record; begin
 for f in select p.oid, pg_get_functiondef(p.oid) d from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'sa\_%'
   and 'p_commune' = any(p.proargnames) and pg_get_functiondef(p.oid) like '%perform public._garde();%' loop
  execute replace(f.d,'perform public._garde();','perform public._garde(p_commune);');
 end loop; end $$;
