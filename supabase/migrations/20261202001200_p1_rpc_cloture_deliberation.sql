-- P1 gouvernance : clôture du vote d'une délibération par RPC (remplace l'UPDATE direct de js/deliberations.js).
-- Le trigger private.deliberations_garde_statut (20261202000900) refuse tout passage direct à « adoptee » / « rejetee »
-- pour les rôles API, SAUF si current_user est postgres / supabase_admin. Cette fonction SECURITY DEFINER appartient à
-- postgres : elle passe donc le trigger SANS désactiver quoi que ce soit.
-- (On n'utilise PAS SET LOCAL session_replication_role = 'replica' : réservé aux superutilisateurs, et il désactiverait
--  aussi les autres triggers — audit, gardes des votes — pour toute la transaction.)
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Ré-exécutable. À appliquer après 20261202000900 et 20261202001100.

create or replace function public.cloturer_deliberation(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    text;
  v_commune uuid;
  v_actif   boolean;
  v_statut  text;
  v_pour    integer;
  v_contre  integer;
  v_abst    integer;
  v_nouveau text;
begin
  -- 1) Appelant : maire actif, rattaché à une commune
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;
  select p.role::text, p.commune_id, coalesce(p.actif, true)
    into v_role, v_commune, v_actif
    from public.profiles p
   where p.id = v_uid;
  if not found or not v_actif or v_role is distinct from 'maire' or v_commune is null then
    raise exception 'Seul le maire peut clôturer le vote d''une délibération.' using errcode = '42501';
  end if;
  if not private.hors_maintenance() then
    raise exception 'Application en maintenance : clôture impossible pour le moment.' using errcode = '55000';
  end if;

  -- 2) Délibération de SA commune, verrouillée pour la durée de la transaction
  select d.statut into v_statut
    from public.deliberations d
   where d.id = p_id and d.commune_id = v_commune
     for update;
  if not found then
    raise exception 'Délibération introuvable ou hors de votre commune.' using errcode = 'P0002';
  end if;

  -- 3) Statut « projet » obligatoire
  if v_statut is distinct from 'projet' then
    raise exception 'La délibération est déjà au statut « % » : le vote est clos.', v_statut using errcode = '55000';
  end if;

  -- 4) Décompte (recalculé côté base, jamais fourni par le client)
  select count(*) filter (where v.vote = 'pour'),
         count(*) filter (where v.vote = 'contre'),
         count(*) filter (where v.vote = 'abstention')
    into v_pour, v_contre, v_abst
    from public.votes_deliberations v
   where v.deliberation_id = p_id and v.commune_id = v_commune;

  -- 5) Aucun vote exprimé : refus
  if coalesce(v_pour, 0) + coalesce(v_contre, 0) + coalesce(v_abst, 0) = 0 then
    raise exception 'Aucun vote exprimé : la délibération ne peut pas être clôturée.' using errcode = 'P0001';
  end if;

  -- 6) Pour > Contre : adoptée ; sinon (Contre >= Pour) : rejetée. Les abstentions ne sont pas des suffrages exprimés.
  v_nouveau := case when v_pour > v_contre then 'adoptee' else 'rejetee' end;

  update public.deliberations
     set statut = v_nouveau
   where id = p_id and commune_id = v_commune and statut = 'projet';

  return jsonb_build_object('statut', v_nouveau, 'pour', v_pour, 'contre', v_contre, 'abstention', v_abst);
end
$$;

-- Propriétaire postgres : condition pour passer le trigger de garde (current_user = postgres dans la fonction)
alter function public.cloturer_deliberation(uuid) owner to postgres;

-- Droits : appelable uniquement par un utilisateur connecté (le contrôle du rôle est fait dans la fonction)
revoke all on function public.cloturer_deliberation(uuid) from public, anon;
grant execute on function public.cloturer_deliberation(uuid) to authenticated;
