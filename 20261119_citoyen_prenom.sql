-- Lot 4 : prénom du citoyen (le compte porte désormais prénom, nom, village/adresse ; téléphone = auth.users.phone vérifié). Idempotent, additif.
-- Déjà appliqué en base le 17/11/2026 (migration lot4_citoyens_prenom).
alter table public.citoyens add column if not exists prenom text check (length(prenom)<=120);
