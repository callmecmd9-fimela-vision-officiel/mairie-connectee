alter table public.demandes drop constraint if exists demandes_statut_check;
alter table public.demandes add constraint demandes_statut_check check (statut in ('nouvelle','orientee','en_cours','a_valider','traitee','redirigee','en_attente_pieces','rejetee','cloturee','acceptee','pret_a_retirer'));

create or replace function public.suivre_demande(p_commune text, p_numero text)
returns table(type text, statut text, service text, reponse text, cree timestamptz, historique jsonb)
language sql stable security definer set search_path = '' as $$
  select d.type,d.statut,d.service,case when d.statut in ('traitee','redirigee','rejetee','en_attente_pieces','cloturee','acceptee','pret_a_retirer') then d.reponse end,d.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('statut',h.statut,'date',h.created_at) order by h.created_at) from public.demande_historique h where h.demande_id=d.id),'[]'::jsonb)
  from public.demandes d join public.communes c on c.id=d.commune_id
  where c.slug=p_commune and d.numero=upper(trim(p_numero)) $$;

create or replace function private.garde_demande() returns trigger language plpgsql security definer set search_path = '' as $$
declare r text := (select private.my_role());
begin
  new.updated_at := now();
  if new.statut='traitee' and old.statut is distinct from 'traitee' and r is not null and r not in ('maire','adjoint','super_admin') then
    raise exception 'La validation finale est réservée au maire ou à l’adjoint'; end if;
  if new.service is distinct from old.service and r is not null and r not in ('maire','adjoint','cabinet','secretariat','super_admin') then
    raise exception 'L’orientation est réservée au secrétariat'; end if;
  if new.statut='pret_a_retirer' and old.statut is distinct from 'pret_a_retirer' then
    if old.statut not in ('acceptee','traitee') then
      raise exception 'Le document ne peut être déclaré prêt qu’après acceptation de la demande'; end if;
    if length(trim(coalesce(new.reponse,'')))=0 then
      raise exception 'Indiquez le lieu et les modalités de retrait avant de déclarer le document prêt'; end if;
  end if;
  return new;
end $$;

create or replace function public.trg_notif_demande() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.citoyen_id is not null and exists(select 1 from citoyens where user_id=new.citoyen_id) then
  insert into citoyen_notifications(user_id,commune_id,demande_id,titre,corps)
  values(new.citoyen_id,new.commune_id,new.id,'Demande '||new.numero,
   case new.statut::text when 'orientee' then 'Votre demande a été transmise au service compétent.'
    when 'en_cours' then 'Votre demande est en cours de traitement.'
    when 'a_valider' then 'Votre demande est en cours de vérification.'
    when 'en_attente_pieces' then 'Des informations complémentaires sont nécessaires. Ouvrez votre dossier.'
    when 'acceptee' then 'Votre demande a été acceptée.'
    when 'pret_a_retirer' then 'Votre document est prêt. Ouvrez votre dossier pour savoir où et quand le retirer.'
    when 'traitee' then 'Votre demande a été traitée. Une réponse est disponible.'
    when 'redirigee' then 'Votre demande a été orientée vers l’organisme compétent.'
    when 'rejetee' then 'Votre demande a été rejetée. Consultez le motif.'
    when 'cloturee' then 'Votre dossier est clôturé.' else 'Le statut de votre demande a changé.' end);
 end if; return new; end $$;