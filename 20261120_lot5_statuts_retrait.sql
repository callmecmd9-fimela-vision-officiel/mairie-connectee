-- Lot 5 : statuts « acceptee » et « pret_a_retirer ». Idempotent. DÉJÀ APPLIQUÉ en base (vérifié le 17/11/2026) : ce fichier ne sert qu'à garder le dépôt synchronisé.
-- Garde-fou serveur déjà en place (private.garde_demande) : « pret_a_retirer » seulement après « acceptee »/« traitee » ET avec lieu/modalités dans la réponse.
alter table public.demandes drop constraint if exists demandes_statut_check;
do $$ declare c record; begin for c in select conname from pg_constraint where conrelid='public.demandes'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%nouvelle%' loop execute format('alter table public.demandes drop constraint %I',c.conname); end loop; end $$;
alter table public.demandes add constraint demandes_statut_check check (statut in ('nouvelle','orientee','en_cours','a_valider','traitee','redirigee','en_attente_pieces','rejetee','cloturee','acceptee','pret_a_retirer'));
create or replace function public.suivre_demande(p_commune text,p_numero text)
returns table(type text,statut text,service text,reponse text,cree timestamptz,historique jsonb) language sql stable security definer set search_path='' as $$
 select d.type,d.statut,d.service,case when d.statut in ('traitee','redirigee','rejetee','en_attente_pieces','cloturee','acceptee','pret_a_retirer') then d.reponse end,d.created_at,
  coalesce((select jsonb_agg(jsonb_build_object('statut',h.statut,'date',h.created_at) order by h.created_at) from public.demande_historique h where h.demande_id=d.id),'[]'::jsonb)
 from public.demandes d join public.communes c on c.id=d.commune_id where c.slug=p_commune and d.numero=upper(trim(p_numero)) $$;
