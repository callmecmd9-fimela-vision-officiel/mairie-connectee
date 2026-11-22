# Notifications push (citoyens) — prêtes, inactives tant que non provisionnées
**Chaîne** : insertion dans `citoyen_notifications` → Database Webhook → Edge Function `push-send` → service push du navigateur → `sw.js` (affichage) → clic = ouverture de l'app.
**Données dans la notification** : titre (80 c.), extrait (120 c.), n° de notification et de dossier. Rien d'autre.
## Activation (staging d'abord, puis production sur accord)
1. Générer une paire VAPID : `npx web-push generate-vapid-keys`.
2. Secrets Edge : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:…`), `PUSH_WEBHOOK_SECRET` (aléatoire, 32+ car.).
3. Appliquer `supabase/proposed/20261121_push_notifications.sql` (table `push_subscriptions`, RPC `push_enregistrer`/`push_supprimer` pour le citoyen connecté ; `push_abonnements`/`push_resultat` réservées à `service_role`).
4. Déployer `push-send` (`verify_jwt=false`, authentifiée par l'en-tête `x-push-secret`, comparaison à temps constant ; 503 sans configuration).
5. Supabase > Database > Webhooks : table `citoyen_notifications`, INSERT, POST vers la fonction, en-tête `x-push-secret`.
6. Renseigner la clé **publique** dans `index.html` : `<meta name="mc-vapid" content="…">`. Tant qu'elle est vide, aucune option n'est affichée.
## Limites connues
- Les comptes citoyens exigent la connexion par téléphone (SMS, `SMS_ON=false`) : les alertes ne concernent donc que les comptes connectés.
- iOS : Web Push uniquement si l'app est installée sur l'écran d'accueil (iOS 16.4+).
- Abonnement expiré (404/410) supprimé automatiquement ; 5 échecs consécutifs = abonnement ignoré.
