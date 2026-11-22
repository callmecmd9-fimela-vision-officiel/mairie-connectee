-- PROPOSÉE, NON APPLIQUÉE (suppression de ressource : autorisation explicite requise).
-- Vérifié en lecture seule le 2026-11-21 : communes_slug_key (index de la contrainte UNIQUE) et
-- communes_slug_uq (index simple) sont identiques ; aucune clé étrangère ne dépend de communes_slug_uq.
-- On supprime l'index simple, on conserve la contrainte.
drop index if exists public.communes_slug_uq;
