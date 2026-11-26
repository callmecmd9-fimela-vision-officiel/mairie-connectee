# Paiement mobile Wave / Orange Money (lot 17) — multi-communes, sandbox / production

## Flux
1. « Mes Taxes » : `modes_paiement_commune(slug)` indique les fournisseurs actifs de la commune et leur mode. Le citoyen choisit « Payer au guichet » ou « Payer par Wave/OM ».
2. `initier_paiement_en_ligne(p_role_id, p_provider)` passe le rôle à `en_attente_paiement`, crée la ligne `paiements_taxes` (`en_attente`) et renvoie le lien : **factice en sandbox** (jamais ouvert ; message « Mode test : le paiement sera simulé »), lien du fournisseur de la commune en production.
3. L'écran « En attente de confirmation… » interroge `statut_paiement_en_ligne` toutes les 4 s (10 min max).
4. Le fournisseur (ou le testeur en sandbox) appelle `paiement-webhook` : commune déduite de la taxe → paramètres de la commune déchiffrés → authentification selon le mode → `confirmer_paiement_mobile` (service_role, idempotente, montant exact, quittance `QUIT-AAAA-NNNNNN`, rôle `payee`).

## Sécurité
- `parametres_paiement_communes` : aucun accès API ; clés chiffrées (pgcrypto). La clé maîtresse `PAIEMENT_ENC_KEY` est un secret de l'Edge Function, jamais stockée en base.
- Production : signature HMAC du fournisseur (Wave : `Wave-Signature`, secret = `api_secret` ; Orange Money : jeton `api_key` ou `x-om-signature`).
- Sandbox : aucun appel au fournisseur ; la simulation exige le jeton de la commune (`api_secret`) en `Authorization: Bearer`. Les transactions sandbox sont préfixées `SANDBOX-` ; la RPC refuse ce préfixe en production et l'exige en sandbox (source `en_ligne_simule`, audit `CONFIRMER_PAIEMENT_MOBILE_SANDBOX`).
- Tout refus d'accès du webhook répond 401 sans détail ; `statut` (en_attente / paye / echoue) et `statut_paiement` (en_attente / confirme / echoue) sont synchronisés par trigger.

## Mise en route d'une commune (service_role / SQL)
`select public.definir_parametres_paiement('<commune_uuid>', 'wave', '<api_key>', '<api_secret>', 'sandbox', true, null, '<PAIEMENT_ENC_KEY>');`
Passage en production : même appel avec `'production'` et l'URL de paiement (`{reference}` = client_reference restitué par le fournisseur, `{montant}`), p. ex. `'https://pay.wave.com/…?client_reference={reference}&amount={montant}'`. Une commune ne peut pas être active en production sans secret ni lien (contrainte SQL).
Secret de la fonction : `supabase secrets set PAIEMENT_ENC_KEY=…`. URL chez le fournisseur : `https://<projet>.supabase.co/functions/v1/paiement-webhook?provider=wave` (ou `orange_money`).

## Simuler un paiement en sandbox
`POST …/paiement-webhook?provider=wave` avec `Authorization: Bearer <api_secret de la commune>` et le corps `{"type":"checkout.session.completed","data":{"client_reference":"PAY-TAXE-AAAA-NNNNNN"}}` : transaction `SANDBOX-<référence>` et montant dû complétés automatiquement ; un rejeu est sans effet.

## À valider en recette avec les fournisseurs
Format exact des notifications Orange Money (le parseur accepte plusieurs noms de champs) et variante de signature Wave (`t+corps` et `t.corps` acceptées). Anomalies (HTTP 200, aucune quittance, trace `audit_log`) : `PAIEMENT_MOBILE_MONTANT_INCORRECT`, `_DOUBLON`, `_ROLE_NON_PAYABLE`, `_TX_CONFLIT`.
