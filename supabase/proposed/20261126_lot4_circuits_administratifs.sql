-- LOT 4 : circuits administratifs (demande de pièce / rejet motivé)
-- La table réelle est public.demandes (aucune table demandes_services dans le projet).
-- Les statuts existants sont conservés : 'en_attente_pieces' (complément requis) et 'rejetee' (rejet),
-- car la contrainte demandes_statut_check, les RPC de suivi, l'envoi de pièces et les notifications en dépendent.
alter table public.demandes add column if not exists motif_rejet text;
alter table public.demandes add column if not exists pieces_demandees text;

-- Si une table/vue demandes_services existe dans votre base, on y ajoute aussi les colonnes.
do $$
begin
  if to_regclass('public.demandes_services') is not null
     and (select relkind from pg_class where oid = 'public.demandes_services'::regclass) = 'r' then
    execute 'alter table public.demandes_services add column if not exists motif_rejet text';
    execute 'alter table public.demandes_services add column if not exists pieces_demandees text';
  end if;
end $$;
