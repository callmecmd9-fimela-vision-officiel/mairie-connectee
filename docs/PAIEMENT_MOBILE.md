# Paiement mobile Wave / Orange Money (lot 17)

## Flux
1. Le citoyen (compte vérifié, onglet « Mes Taxes ») choisit « Payer en ligne » : RPC `initier_paiement_en_ligne(p_role_id, p_provider)`. Elle crée une ligne `paiements_taxes` en `en_attente` (référence = `roles_imposition.reference_avis`, `PAY-TAXE-AAAA-NNNNNN`) et renvoie `payment_url`.
2. Le citoyen paie chez le fournisseur ; l'écran « En attente de confirmation… » interroge `statut_paiement_en_ligne` toutes les 4 s.
3. Le fournisseur appelle `paiement-webhook` : signature/jeton vérifié → `confirmer_paiement_mobile` (service_role) → montant exact contrôlé, quittance numérotée émise, rôle `payee`. Un rejeu de la même transaction est sans effet.

## À configurer avant ouverture
- Secrets : `supabase secrets set WAVE_WEBHOOK_SECRET=… OM_API_KEY=…` (`WAVE_API_KEY` est accepté en repli pour Wave). Sans secret, le webhook répond 503 et n'accepte rien.
- URL à déclarer chez le fournisseur : `https://<projet>.supabase.co/functions/v1/paiement-webhook?provider=wave` (ou `provider=orange_money`).
- Liens de paiement, par commune (SQL / service_role) : `insert into public.paiement_mobile_config(commune_id, provider, url_template) values (…, 'wave', 'https://pay.wave.com/…?client_reference={reference}&amount={montant}')`. `{reference}` doit être restitué par le fournisseur (`client_reference` chez Wave) : c'est la clé de rapprochement. Sans ligne active, le citoyen voit « paiement en ligne indisponible ».
- Hôtes autorisés côté navigateur pour le lien : `wave.com`, `orange.com`, `orange-sonatel.com`, `sonatel.com` (constante `TX_URL_OK` de `js/citoyen.js`).

## Hypothèses à valider en recette avec les fournisseurs
- Wave : en-tête `Wave-Signature: t=…,v1=…` (HMAC-SHA256 du corps ; les variantes `t+corps` et `t.corps` sont acceptées) ou secret partagé en `Authorization: Bearer`. Événements : `checkout.session.completed` (succès), `checkout.session.payment_failed` (échec).
- Orange Money : format de notification propre à chaque contrat ; le parseur accepte plusieurs noms de champs (`status`, `reference`/`externalId`, `transactionId`, `amount`). Authentification : jeton (`Authorization: Bearer`, `x-api-key`, `x-om-token`) ou HMAC `x-om-signature`, avec `OM_API_KEY`.

## Anomalies (réponse 200, aucune quittance, trace dans `audit_log`)
`PAIEMENT_MOBILE_MONTANT_INCORRECT`, `PAIEMENT_MOBILE_DOUBLON` (rôle déjà soldé, ex. encaissé au guichet entre-temps), `PAIEMENT_MOBILE_ROLE_NON_PAYABLE`, `PAIEMENT_MOBILE_TX_CONFLIT` : à traiter par les finances (remboursement).
