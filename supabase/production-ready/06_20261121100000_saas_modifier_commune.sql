-- Modification des informations d'une mairie (plateforme, MFA AAL2).
-- Modifiable : nom et domaine personnalisé. Le slug (liens citoyen/mairie) reste inchangé.
-- Idempotent ; ne touche ni aux administrateurs, ni aux abonnements, ni au statut.
begin;
create or replace function public.saas_modifier_commune(p_commune uuid,p_nom text,p_domaine text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare n text:=trim(coalesce(p_nom,'')); d text:=nullif(lower(trim(coalesce(p_domaine,''))),'');
begin
  perform private.pgarde(array['proprietaire','admin']);
  if n='' or length(n)>100 then raise exception 'Nom obligatoire (100 caractères maximum)'; end if;
  if d is not null and d !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$' then
    raise exception 'Domaine invalide (ex. mairie.exemple.sn)';
  end if;
  perform 1 from public.communes where id=p_commune for update;
  if not found then raise exception 'Commune introuvable'; end if;
  if d is not null and exists(select 1 from public.communes where lower(domaine_perso)=d and id<>p_commune) then
    raise exception 'Ce domaine est déjà utilisé par une autre mairie';
  end if;
  update public.communes set nom=n,domaine_perso=d where id=p_commune and (nom is distinct from n or domaine_perso is distinct from d);
  perform private.paudit('commune_modifier',p_commune,jsonb_build_object('nom',n,'domaine_perso',d));
end
$$;
revoke all on function public.saas_modifier_commune(uuid,text,text) from public, anon;
grant execute on function public.saas_modifier_commune(uuid,text,text) to authenticated;
commit;
