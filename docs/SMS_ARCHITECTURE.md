# SMS — architecture indépendante du fournisseur (aucun fournisseur choisi)
**File d'attente** `sms_outbox` (+ `sms_parametres` : activation et quota mensuel **par commune**, langue) → Edge Function `sms-dispatch` (planifiée) → **adaptateur** de fournisseur.
- Mise en file : `sms_enfiler()` (service_role) à partir d'un **modèle** (`lib.mjs` : `demande_recue`, `statut_change`, `pret_a_retirer`, `rdv_confirme`, `rdv_rappel`, `code_otp`). Le corps est rendu côté serveur ; aucune saisie libre d'un citoyen n'est envoyée.
- Envoi concurrent sûr (`FOR UPDATE SKIP LOCKED`), reprises à délais croissants (1 min → 6 h, 5 essais), quota mensuel en segments (GSM-7 160/153 ; UCS-2 70/67 — un « ç » ou « î » double le coût), numéros normalisés E.164 (Sénégal +221).
- **Fail-closed** : sans `SMS_PROVIDER` ou sans secret → 503, rien n'est envoyé. SMS désactivés par défaut pour chaque commune.
- Adaptateurs livrés : `dryrun` (journal, aucun envoi) ; `http-json` (tout fournisseur à API HTTPS/JSON, configuré par secrets `SMS_HTTP_URL`, `SMS_HTTP_AUTH`, `SMS_HTTP_AUTH_HEADER`, `SMS_HTTP_BODY` avec `{to} {body} {sender} {ref}`, `SMS_SENDER_ID`). Un fournisseur à protocole particulier = une fonction dans `makeProvider()`.
## À décider hors code (externe)
Fournisseur et contrat, identifiant d'expéditeur (enregistrement auprès des opérateurs), tarifs, consentement/RGPD (loi sénégalaise 2008-12), puis activation du login par téléphone (`SMS_ON`, Auth > Phone) — pour l'OTP, Supabase Auth exige son propre fournisseur SMS (Twilio, MessageBird, Vonage, TextLocal) ; un fournisseur local passe par un « Send SMS hook ».
## Activation (staging d'abord)
Appliquer `supabase/proposed/20261121_sms_outbox.sql` ; secrets `SMS_DISPATCH_SECRET`, `SMS_PROVIDER=dryrun` ; déployer ; planifier l'appel (pg_cron + pg_net, toutes les minutes) ; vérifier en `dryrun` ; puis choisir le fournisseur.
