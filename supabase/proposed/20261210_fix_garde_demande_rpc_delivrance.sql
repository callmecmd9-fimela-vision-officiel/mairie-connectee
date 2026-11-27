-- Délivrance/encaissement via RPC : la garde « validation finale réservée au maire/adjoint » bloquait delivrer_demande pour agent/état civil/secrétariat.
-- Les RPC SECURITY DEFINER (qui contrôlent déjà le rôle) posent app.paiement_rpc=1 : la garde les laisse passer. Reste identique sinon.
create or replace function private.garde_demande() returns trigger language plpgsql security definer set search_path = '' as $$
declare r text := (select private.my_role());
        v_rpc boolean := coalesce(current_setting('app.paiement_rpc', true), '') = '1';
begin
  new.updated_at := now();
  if new.statut='traitee' and old.statut is distinct from 'traitee' and not v_rpc and r is not null and r not in ('maire','adjoint','super_admin') then
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
