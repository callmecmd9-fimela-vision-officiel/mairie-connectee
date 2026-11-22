-- PRÊT POUR LA PRODUCTION — NON APPLIQUÉ (accord requis). Dépend de 20261121_sms_outbox.sql. Mise en file automatique d'un SMS quand le statut d'une demande change.
-- Opt-in par commune (sms_parametres.actif=false par défaut) ; ne bloque JAMAIS la mise à jour de la demande (bloc d'exception) ;
-- numéro invalide (demandes.contact) => aucun SMS ; texte en français uniquement (wolof/sérère : après validation linguistique).
create or replace function private.sms_normaliser(p text) returns text language sql immutable set search_path='' as $$
 select case when s ~ '^\+221(7[05678]|3[03348])[0-9]{7}$' then s else null end
 from (select case when regexp_replace(coalesce(p,''),'[\s.\-()]','','g') ~ '^\+' then regexp_replace(coalesce(p,''),'[\s.\-()]','','g')
        when regexp_replace(coalesce(p,''),'[\s.\-()]','','g') ~ '^00' then '+'||substr(regexp_replace(coalesce(p,''),'[\s.\-()]','','g'),3)
        else '+221'||regexp_replace(regexp_replace(coalesce(p,''),'[\s.\-()]','','g'),'^0+','') end s) x $$;
create or replace function private.sms_sur_statut_demande() returns trigger language plpgsql security definer set search_path='' as $$
declare t text; b text; nom text;
begin
 if new.statut is not distinct from old.statut then return new; end if;
 begin
  t:=private.sms_normaliser(new.contact); if t is null then return new; end if;
  select c.nom into nom from public.communes c where c.id=new.commune_id; nom:=coalesce(nom,'Mairie');
  if new.statut='pret_a_retirer' then
   b:=nom||' : votre document (dossier '||coalesce(new.numero,'')||') est prêt. Retrait au guichet avec une pièce d’identité.';
   perform public.sms_enfiler(new.commune_id,t,'pret_a_retirer',b,case when length(b)>160 then 2 else 1 end);
  elsif new.statut in ('acceptee','rejetee','traitee','en_attente_pieces') then
   b:=nom||' : votre dossier '||coalesce(new.numero,'')||' est passé à « '||replace(new.statut,'_',' ')||' ».';
   perform public.sms_enfiler(new.commune_id,t,'statut_change',b,case when length(b)>160 then 2 else 1 end);
  end if;
 exception when others then null;   -- un SMS ne doit jamais empêcher le traitement d'une demande
 end;
 return new;
end $$;
revoke all on function private.sms_normaliser(text),private.sms_sur_statut_demande() from public,anon,authenticated;
drop trigger if exists trg_sms_statut_demande on public.demandes;
create trigger trg_sms_statut_demande after update of statut on public.demandes for each row execute function private.sms_sur_statut_demande();
