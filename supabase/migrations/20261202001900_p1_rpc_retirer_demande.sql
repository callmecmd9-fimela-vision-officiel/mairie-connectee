-- P1 Circuit des demandes : RPC de retrait du document avec inscription au registre des retraits — PROPOSÉE, non appliquée.
-- Dépend de 20261202001700 (registre_retraits, statut « retire », garde « retrait enregistré »).
-- Retourne l'identifiant de la ligne du registre. Idempotente : peut être rejouée sans erreur.

create or replace function public.retirer_demande(p_id uuid, p_nom text, p_cni text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_commune uuid;
  v_d public.demandes%rowtype;
  v_nom text := btrim(coalesce(p_nom, ''));
  v_cni text := btrim(coalesce(p_cni, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'Les comptes anonymes ne peuvent pas enregistrer un retrait.' using errcode = '42501';
  end if;
  if not (select private.hors_maintenance()) then
    raise exception 'Plateforme en maintenance : retrait impossible pour le moment.' using errcode = '55000';
  end if;

  v_role := (select private.my_role());
  v_commune := (select private.my_commune());
  if v_commune is null or v_role is null or v_role not in ('secretariat', 'finances') then
    raise exception 'Accès refusé : retrait réservé au secrétariat et aux finances.' using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'Identifiant de demande obligatoire.' using errcode = '22023';
  end if;
  if char_length(v_nom) not between 2 and 120 then
    raise exception 'Nom du retirant obligatoire (2 à 120 caractères).' using errcode = '22023';
  end if;
  if char_length(v_cni) not between 5 and 30 then
    raise exception 'Numéro de pièce d''identité obligatoire (5 à 30 caractères).' using errcode = '22023';
  end if;

  select * into v_d from public.demandes where id = p_id for update;
  if not found or v_d.commune_id is distinct from v_commune then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut is distinct from 'pret_a_retirer' then
    raise exception 'Retrait refusé : la demande n''est pas au statut « prêt à retirer » (statut actuel : %).', v_d.statut using errcode = '55000';
  end if;
  if v_d.statut_paiement not in ('paye', 'gratuit') then
    raise exception 'Retrait refusé : paiement requis.' using errcode = '55000';
  end if;

  insert into public.registre_retraits(commune_id, demande_id, nom_retirant, cni_retirant, agent_id)
  values (v_d.commune_id, v_d.id, v_nom, v_cni, v_uid)
  returning id into v_id;

  perform set_config('app.motif_statut', 'Retrait par ' || v_nom, true);
  update public.demandes set statut = 'retire' where id = v_d.id;

  return v_id;
end $$;

revoke all on function public.retirer_demande(uuid, text, text) from public, anon;
grant execute on function public.retirer_demande(uuid, text, text) to authenticated;
