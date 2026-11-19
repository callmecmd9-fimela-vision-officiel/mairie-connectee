-- Idempotent. Aucune donnée/table/policy supprimée. RLS déjà actif : on retire les droits SQL inutiles du rôle anon (défense en profondeur).
do $$ declare t text; begin
 foreach t in array array['abonnements','acces_techniques','factures','incidents','journal_audit','paiements','parametres_systeme','permissions_roles','plans','platform_admins','platform_audit','sauvegardes'] loop
  if to_regclass('public.'||t) is not null then execute format('revoke all on public.%I from anon',t); end if;
 end loop; end $$;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
-- Perf : auth.jwt() évalué une seule fois (advisor auth_rls_initplan), même logique
alter policy citoyens_own on public.citoyens
 using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
create index if not exists communes_admin_principal_idx on public.communes(admin_principal);