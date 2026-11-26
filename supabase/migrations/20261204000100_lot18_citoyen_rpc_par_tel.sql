-- LOT 18 : « Mon Espace » citoyen — RPC « par téléphone ». PROPOSÉE, non appliquée. Idempotente.
-- Prérequis : 20261203000400 (lot 16 : private.tel_sn, private.mes_contribuables) et 20261203000300 (RLS demandes).
--
-- Principe de sécurité (Loi 2008-12) : le numéro passé en paramètre n'est JAMAIS une preuve d'identité.
--   * seules les sessions authentifiées NON anonymes peuvent appeler ces RPC (anon : aucun droit) ;
--   * le numéro demandé est comparé au téléphone CONFIRMÉ par SMS du compte (auth.users.phone, phone_confirmed_at) ;
--     s'il diffère (ou si le compte n'a pas de téléphone vérifié) la réponse est une liste VIDE — jamais une erreur,
--     jamais la donnée d'un tiers, aucune possibilité d'énumérer les numéros ;
--   * les rôles passent en plus par private.mes_contribuables() (lien explicite ou téléphone vérifié, fiche unique par commune) ;
--   * aucun numéro en clair n'est journalisé ni renvoyé : la comparaison se fait sur l'empreinte SHA-256 des 9 chiffres.

-- Empreinte du téléphone confirmé du compte connecté (null si anonyme, sans téléphone, ou téléphone non confirmé).
create or replace function private.tel_verifie_hash() returns text
language sql stable security definer set search_path = '' as $$
  select encode(extensions.digest(convert_to(private.tel_sn(u.phone), 'UTF8'), 'sha256'), 'hex')
    from auth.users u
   where u.id = (select auth.uid())
     and u.phone_confirmed_at is not null
     and private.tel_sn(u.phone) is not null
     and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
$$;
revoke all on function private.tel_verifie_hash() from public, anon, authenticated;

-- Vrai seulement si p_telephone (format sénégalais, tout habillage) est le téléphone vérifié du compte connecté.
create or replace function private.tel_est_le_mien(p_telephone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    private.tel_sn(p_telephone) is not null
    and encode(extensions.digest(convert_to(private.tel_sn(p_telephone), 'UTF8'), 'sha256'), 'hex')
        is not distinct from (select private.tel_verifie_hash()),
    false)
$$;
revoke all on function private.tel_est_le_mien(text) from public, anon, authenticated;

-- Rôles d'imposition du contribuable lié à CE téléphone vérifié (même forme que mes_roles_imposition()).
create or replace function public.mes_roles_imposition_par_tel(p_telephone text)
returns table(id uuid, commune_slug text, libelle text, annee int, montant_du numeric, statut text, reference_avis text, quittance_ref text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (select private.tel_est_le_mien(p_telephone)) then
    return; -- téléphone inconnu, non vérifié ou d'un tiers : liste vide, jamais d'erreur
  end if;
  return query
  select r.id, co.slug::text, t.libelle, r.annee, r.montant_du, r.statut, r.reference_avis, p.reference_paiement::text
    from public.roles_imposition r
    join public.taxes_locales t on t.id = r.taxe_id
    join public.communes co on co.id = r.commune_id
    left join public.quittances q on q.role_id = r.id and r.statut = 'payee'
    left join public.paiements_taxes p on p.id = q.paiement_id
   where r.contribuable_id in (select private.mes_contribuables()) and r.statut <> 'annulee'
   order by r.annee desc, r.created_at desc
   limit 200;
end $$;

-- Demandes déposées avec le compte lié à CE téléphone vérifié (numéro, type, statut : aucune autre donnée).
create or replace function public.mes_demandes_par_tel(p_telephone text)
returns table(numero text, type text, statut text, created_at timestamptz, commune_slug text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (select private.tel_est_le_mien(p_telephone)) then
    return;
  end if;
  return query
  select d.numero, d.type, d.statut::text, d.created_at, c.slug::text
    from public.demandes d
    join public.communes c on c.id = d.commune_id
   where d.citoyen_id = (select auth.uid())
   order by d.created_at desc
   limit 100;
end $$;

revoke all on function public.mes_roles_imposition_par_tel(text) from public, anon;
grant execute on function public.mes_roles_imposition_par_tel(text) to authenticated;
revoke all on function public.mes_demandes_par_tel(text) from public, anon;
grant execute on function public.mes_demandes_par_tel(text) to authenticated;

-- Contrôle après application (SQL) :
--   select proname, prosecdef, proconfig, proacl from pg_proc where proname in ('mes_roles_imposition_par_tel','mes_demandes_par_tel');
--   -- attendu : prosecdef = true, search_path vide, aucun droit pour anon / public.
--   -- Connecté avec le +221 77 123 45 67 vérifié : select * from public.mes_roles_imposition_par_tel('771234567'); -- ses rôles
--   --                                               select * from public.mes_roles_imposition_par_tel('770000000'); -- 0 ligne, sans erreur
