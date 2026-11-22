-- Correctif : org_role_droit_set refusait à un admin_mairie d'accorder des droits MÉTIER aux rôles de sa commune
-- (org_droit_propre(admin_mairie) ne couvre que le module `org`). Idempotent (create or replace). Aucune donnée modifiée.
-- Règles conservées : droits d'écriture `org` jamais accordables par un acteur municipal (trigger garde_org_role_droits),
-- rôle `maire` intouchable, rôle inexistant refusé, commune = celle de l'appelant, journalisation inchangée.
create or replace function public.org_role_droit_set(p_role text,p_module text,p_action text,p_on boolean)
returns void language plpgsql security definer set search_path to ''
as $function$
declare c uuid:=public.org_commune(); u uuid:=(select auth.uid());
begin
  if c is null or u is null then raise exception 'Accès refusé'; end if;
  if not public.org_droit('org','administrer') then raise exception 'Accès refusé'; end if;
  if coalesce(p_module,'')='' or coalesce(p_action,'')='' then raise exception 'Droit invalide'; end if;
  if p_role='maire' or not exists(select 1 from public.org_roles where commune_id=c and code=p_role) then
    raise exception 'Rôle invalide';
  end if;
  if p_on then
    -- admin_mairie actif de SA commune : peut accorder tout droit métier (les écritures org sont bloquées par le trigger).
    -- Autres appelants : uniquement les droits qu'ils détiennent.
    if not (private.is_commune_admin(c) or public.org_droit_propre(u,p_module,p_action)) then
      raise exception 'Vous ne pouvez accorder que les droits que vous détenez';
    end if;
    insert into public.org_role_droits(commune_id,role_code,module,action)
    values(c,p_role,p_module,p_action) on conflict do nothing;
  else
    delete from public.org_role_droits
    where commune_id=c and role_code=p_role and module=p_module and action=p_action;
  end if;
  perform public.org_log(c,'org_role_droit',p_role,jsonb_build_object('module',p_module,'action',p_action,'accorde',p_on));
end
$function$;
revoke all on function public.org_role_droit_set(text,text,text,boolean) from public, anon;
grant execute on function public.org_role_droit_set(text,text,text,boolean) to authenticated;
