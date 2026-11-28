-- Présence requise en mairie (+ documents à apporter), sans changer le statut ni le circuit des demandes.
alter table public.demandes add column if not exists presence_requise boolean not null default false, add column if not exists presence_pieces text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='demandes_presence_pieces_check' and conrelid='public.demandes'::regclass) then
  alter table public.demandes add constraint demandes_presence_pieces_check check (presence_pieces is null or char_length(presence_pieces)<=1000);
 end if; end $$;

-- Suivi par numéro : la convocation est ajoutée au message, signature inchangée.
create or replace function public.suivre_demande(p_commune text, p_numero text)
returns table(type text,statut text,service text,reponse text,cree timestamptz,historique jsonb)
language sql stable security definer set search_path to '' as $f$
  select d.type, d.statut, d.service,
    nullif(concat_ws(E'\n',
      case when d.statut in ('traitee','redirigee','rejetee','en_attente_pieces','cloturee','acceptee','pret_a_retirer') then d.reponse end,
      case when d.presence_requise and d.statut not in ('retire','rejetee','cloturee') then
        'Votre présence en mairie est requise. À apporter : '||coalesce(nullif(d.presence_pieces,''),'selon les indications de la mairie') end),''),
    d.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('statut',h.statut,'date',h.created_at) order by h.created_at) from public.demande_historique h where h.demande_id=d.id),'[]'::jsonb)
  from public.demandes d join public.communes c on c.id=d.commune_id
  where c.slug=p_commune and d.numero=upper(trim(p_numero))
    and (upper(trim(p_numero)) ~ '^[A-Z0-9]{3}-[0-9]{4}-[0-9A-F]{32}$' or (auth.uid() is not null and d.citoyen_id=auth.uid()))
$f$;

-- Suivi public (numéro + téléphone) : colonnes ajoutées en fin de vue.
create or replace view public.v_suivi_public with (security_invoker = true, security_barrier = true) as
  select d.num_suivi, d.statut, d.montant_du, coalesce(d.updated_at, d.created_at) as date_maj, d.lieu_retrait,
         d.presence_requise, d.presence_pieces
    from public.demandes d where d.num_suivi is not null;
revoke all on public.v_suivi_public from public, anon, authenticated;

-- Notification citoyen à la convocation.
create or replace function private.notif_presence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.presence_requise and new.citoyen_id is not null and (old.presence_requise is distinct from true or old.presence_pieces is distinct from new.presence_pieces) then
  begin
   insert into public.citoyen_notifications(user_id,commune_id,demande_id,titre,corps)
   values(new.citoyen_id,new.commune_id,new.id,'Présence requise – '||new.numero,
     'Merci de vous présenter en mairie. À apporter : '||coalesce(nullif(new.presence_pieces,''),'selon les indications de la mairie'));
  exception when others then null; end;
 end if;
 return new;
end $$;
drop trigger if exists trg_notif_presence on public.demandes;
create trigger trg_notif_presence after update of presence_requise,presence_pieces on public.demandes for each row execute function private.notif_presence();
