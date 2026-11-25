-- P0 : retrait des droits d'écriture/suppression résiduels sur les tables financières.
-- Constat (production, 2026-11-25) : authenticated conservait DELETE, TRUNCATE, REFERENCES et TRIGGER sur
-- public.paiements_taxes. DELETE est bloqué par le RLS (aucune politique DELETE), mais TRUNCATE ignore le RLS.
-- Idempotente : rejouable sans effet. Aucune écriture directe n'est utilisée par le front (js/taxes.js passe par la RPC,
-- js/citoyen.js ne fait que lire) ; la RPC valider_paiement_especes (SECURITY DEFINER) n'est pas concernée.

-- 1) paiements_taxes : plus de suppression ni de TRUNCATE pour les utilisateurs connectés
--    (REFERENCES et TRIGGER ne servent à aucun rôle de l'API : retirés par la même occasion)
revoke delete, truncate, references, trigger on public.paiements_taxes from authenticated;

-- 2) paiements_taxes : aucun droit pour les anonymes
revoke all on public.paiements_taxes from anon;

-- 3) Mêmes retraits sur les autres tables financières, si elles existent.
--    On ne retire QUE les droits d'écriture : le SELECT des utilisateurs connectés (protégé par le RLS) est conservé.
--    `quittances` n'existe pas en production aujourd'hui ; la boucle la couvrira si elle est créée plus tard.
do $$
declare t text;
begin
  foreach t in array array['quittances', 'paiements', 'paiements_validations', 'factures'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
      execute format('revoke all on public.%I from anon', t);
    end if;
  end loop;
end
$$;

-- 4) Contrôle : la migration échoue si un droit d'écriture/suppression subsiste
do $$
declare t text;
begin
  if has_table_privilege('authenticated', 'public.paiements_taxes', 'delete')
     or has_table_privilege('authenticated', 'public.paiements_taxes', 'truncate')
     or has_table_privilege('authenticated', 'public.paiements_taxes', 'references')
     or has_table_privilege('authenticated', 'public.paiements_taxes', 'trigger')
     or has_table_privilege('anon', 'public.paiements_taxes', 'select')
     or has_table_privilege('anon', 'public.paiements_taxes', 'insert')
     or has_table_privilege('anon', 'public.paiements_taxes', 'update')
     or has_table_privilege('anon', 'public.paiements_taxes', 'delete') then
    raise exception 'Révocation incomplète sur paiements_taxes.';
  end if;
  foreach t in array array['quittances', 'paiements', 'paiements_validations', 'factures'] loop
    if to_regclass('public.' || t) is not null and (
         has_table_privilege('authenticated', 'public.' || t, 'insert')
      or has_table_privilege('authenticated', 'public.' || t, 'update')
      or has_table_privilege('authenticated', 'public.' || t, 'delete')
      or has_table_privilege('authenticated', 'public.' || t, 'truncate')
      or has_table_privilege('anon', 'public.' || t, 'select')
      or has_table_privilege('anon', 'public.' || t, 'insert')) then
      raise exception 'Révocation incomplète sur la table %.', t;
    end if;
  end loop;
end
$$;
