-- P1 Budget : autoriser le rôle « secretariat » à créer un engagement de dépense
-- (aligne la politique RLS sur le bouton « Nouvel engagement » : maire, finances, secretariat).
-- Périmètre : INSERT uniquement. La modification (update) reste réservée à maire et finances ;
-- aucune suppression (delete révoqué sur engagements, traçabilité comptable).
-- Note : la lecture (engagements_lecture) n'est volontairement pas modifiée par cette migration.

drop policy if exists engagements_creation on public.engagements;

create policy engagements_creation on public.engagements for insert to authenticated
  with check (
    (select private.my_role()) in ('maire','finances','secretariat')
    and commune_id = (select private.my_commune())
  );
