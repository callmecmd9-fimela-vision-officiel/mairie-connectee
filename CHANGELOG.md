# CHANGELOG

## 2026-11-26 — Chantier 2 : paiement mobile Wave / Orange Money, architecture sandbox multi-communes
- **SQL (PROPOSÉE, non appliquée)** `20261203000500_lot17_paiement_mobile.sql` : table `parametres_paiement_communes` (clés chiffrées pgcrypto, mode sandbox / production, actif ; aucun accès API) ; colonnes `paiements_taxes.provider` / `provider_transaction_id` / `statut_paiement` (recopie par trigger du `statut` historique) ; index unique d'idempotence sur `provider_transaction_id` ; RPC `initier_paiement_en_ligne` (lien factice en sandbox), `statut_paiement_en_ligne`, `modes_paiement_commune`, et, réservées à `service_role`, `confirmer_paiement_mobile` (idempotente, montant exact, quittance, rôle `payee`), `echouer_paiement_mobile`, `definir_parametres_paiement`, `lire_parametres_paiement`, `resoudre_reference_taxe`.
- **Edge Function** `paiement-webhook` (`verify_jwt = false`, authentification interne) : commune déduite de la taxe, clés lues par commune ; sandbox = simulation sans appel au fournisseur (jeton de la commune exigé, transactions `SANDBOX-`) ; production = signature HMAC. Seul secret d'environnement : `PAIEMENT_ENC_KEY`.
- **Front** `js/citoyen.js` : « Payer au guichet » / « Payer par Wave/OM », message « Mode test : le paiement sera simulé » en sandbox (lien factice jamais ouvert), écran « En attente de confirmation… » avec polling ; liens de production validés par liste blanche d'hôtes HTTPS ; `index.html` : `citoyen.js?v=20261203.5`.
- **Écart voulu** : le statut « confirmé » historique reste `paye` (lu par `verifier_quittance`, « Mes quittances ») ; `statut_paiement` porte `confirme`.
- Tests : `tests/paiement-webhook.test.js`, `tests/citoyen-taxes.test.js`, `tests/innerhtml-escape.test.js`.

## 2026-11-25 — P1 Parcours citoyen : suivi public et guichet (audit P1, décret 2023-2161)
- **Suivi public** (`suivi.html`, `js/suivi.js`) : numéro de suivi + téléphone → RPC `suivi_public(p_num, p_tel)` ; affiche statut en français, montant dû (statut `a_payer`), lieu de retrait, date de mise à jour. Aucun résultat ou format invalide : « Aucune demande trouvée. Vérifiez le numéro et le téléphone. » ; panne réseau / serveur : message de repli distinct. Aucun `innerHTML` (valeurs affichées via `textContent`), aucun style en ligne (CSP), design `css/citoyen.css`.
- **Guichet** (`js/guichet.js`, `mairie.html` v20261125.5, sous-menu `Administration > Guichet`, clé `RP.guichet`) : onglet **Dépôt** (secrétariat, agent) : INSERT `demandes` (statut `depose`, `num_suivi` jamais envoyé : généré par le trigger serveur), reçu imprimable (`#prt` + `window.print()`) ; si le tarif calculé par le serveur est > 0, la demande passe à `a_payer` avec `montant_du`. Onglet **Caisse** (finances) : demandes `a_payer`, prompt du montant, RPC `encaisser_demande(p_id, p_montant, 'guichet', ref_recu)`, affiche la quittance puis redirige vers `quittance.html`. Onglet **Retrait** (secrétariat, agent, finances) : recherche par `num_suivi`, nom + CNI du retirant, RPC `retirer_demande`, confirmation visuelle.
- **Écarts voulus avec la consigne** : (1) source de paiement **`guichet`** et non `guichet_espece` : la RPC `encaisser_demande` n'accepte que `guichet` / `en_ligne_simule` (sinon 22023) ; (2) `quittance.html` résout `paiements_taxes.reference_paiement` (RPC `verifier_quittance`), pas `num_quittance` : le guichet relit la référence du paiement pour la redirection ; (3) `.assetsignore` est une liste blanche : `!/suivi.html` ajouté (sinon la page n'est pas publiée) ; `tests/assets-ignore.test.js` et `tests/predeploy.test.js` alignés.
- **index.html** : lien « Suivre ma demande » dans le pied de page du portail (HTML servi en `no-cache`, aucun asset modifié).
- **Tests** : `tests/mairie-guichet.test.js` (droits par onglet, appels serveur, échappement), `tests/suivi-public.test.js` (jsdom), `tests/innerhtml-escape.test.js` (anti-XSS) ; `npm test` : 54 fichiers OK.
- **SQL** : aucune nouvelle migration. Prérequis : `20261202001600` à `001900` appliquées en production.

## 2026-11-25 — Correctif : encaissement espèces refusé (FK `paiements_taxes_citoyen_id_fkey`)
- **Cause** : `paiements_taxes.citoyen_id` référençait `profiles(id)` alors que `demandes.citoyen_id` référence `auth.users` ; les citoyens (comptes anonymes, sans profil) faisaient échouer `encaisser_demande` (23503). 8 demandes sur 13 concernées.
- **SQL (APPLIQUÉE en production)** : `20261202001500_p1_fix_paiements_taxes_citoyen_fk.sql` — FK repointée vers `auth.users(id)` ON DELETE SET NULL (table `paiements_taxes` vide). Essai en transaction annulée : l'INSERT de la RPC passe. Aucun changement front.

## 2026-11-25 — Redéploiement de l'Edge Function `sa-admin` (rôle `conseiller`)
- `sa-admin` redéployée sur le projet de production (v17 → v18, `verify_jwt` = true). Le code du dépôt a été comparé à la version en production : seule la liste `ROLES` diffère (`conseiller` ajouté). Contrôle en base : `cloturer_deliberation` appartient à `postgres` (SECURITY DEFINER) ; migrations `000900` à `001400` toutes inscrites dans l'historique.

## 2026-11-25 — Application en production des migrations 20261202001300 et 001400
- Appliquées sur le projet Supabase de production et inscrites sous leurs versions du dépôt : `20261202001300_p1_patrimoine_geolocalisation` (`patrimoine_biens.latitude` / `longitude` + CHECK) et `20261202001400_p1_services_geo` (`territoire_infrastructures.latitude` / `longitude` / `budget_ligne_id`, `territoire_actions.budget_ligne_id`, FK composites `ON DELETE SET NULL (budget_ligne_id)`, index partiels). Contrôles préalables : PostgreSQL 17, colonnes absentes, `budget_lignes unique (id, commune_id)` présent ; contrôles après : colonnes et contraintes présentes. Aucune donnée modifiée.

## 2026-11-25 — P1 Services territoriaux : modification, suppression, géolocalisation, lien budgétaire (point 6.5)
- **Front** (`js/services_territoire.js`, `mairie.html` v20261205.2) : boutons **Détail / Modifier / Supprimer** sur chaque infrastructure et chaque action (maire, secrétariat ; `confirm`, détection « 0 ligne »). Vue **« Détail »** (retour à la liste). Infrastructures : **latitude / longitude** facultatives (les deux ou aucune, bornes ±90 / ±180, lien OpenStreetMap). Infrastructures et actions : **liste déroulante de lignes budgétaires** (`budget_lignes` de type dépense, libellé année · chapitre / article · montant prévu), liaison affichée dans le détail (prévu / réalisé).
- **Compatibilité** : les nouveaux champs ne sont envoyés que s'ils sont renseignés ; message explicite si la migration n'est pas appliquée.
- **SQL (PROPOSÉE — non appliquée)** : `supabase/migrations/20261202001400_p1_services_geo.sql` (colonnes `latitude`, `longitude`, `budget_ligne_id` ; FK composite par commune, `ON DELETE SET NULL (budget_ligne_id)`, CHECK géo, index partiels). RLS du lot 13 inchangées.
- **Tests / doc** : `tests/migration-history-integrity.test.js`, `supabase/PRODUCTION_VERSION_MAP.md`.

## 2026-11-25 — P1 Patrimoine : modification, suppression, détail du bien et entretiens
- **Front** (`js/patrimoine.js`, `mairie.html` v20261125.2) : boutons **Modifier** et **Supprimer** sur chaque bien (maire, secrétariat, technique ; `confirm` avant suppression, détection « 0 ligne » et message dédié si la clé étrangère (23503) bloque car le bien a des entretiens). Vue **« Détail du bien »** (bouton « Détail », retour à la liste) avec l'historique des entretiens (`patrimoine_entretiens`, coût total hors annulés) et bouton **« Ajouter un entretien »** (date, description, coût, prestataire, statut ; contrôles de saisie). Pas de suppression d'entretien (traçabilité, cf. lot 12).
- **Géolocalisation** : champs latitude / longitude facultatifs (les deux ou aucun, bornes ±90 / ±180), lien « Voir sur la carte » (OpenStreetMap). Coordonnées envoyées seulement si saisies ; message clair si la migration n'est pas appliquée.
- **SQL (PROPOSÉE — non appliquée)** : `supabase/migrations/20261202001300_p1_patrimoine_geolocalisation.sql` (colonnes `latitude` / `longitude` + CHECK). Aucune autre modification de schéma (RLS de lecture / écriture / suppression déjà en place via le lot 12).
- **Tests / doc** : `tests/migration-history-integrity.test.js` et `supabase/PRODUCTION_VERSION_MAP.md` déclarent la migration.

## 2026-11-25 — Application en production des migrations 20261202001000, 001100 et 001200
- Appliquées sur le projet Supabase de production et inscrites dans l'historique sous leurs versions du dépôt : `20261202001000_p1_rls_engagements_secretariat`, `20261202001100_p1_gouvernance_fixes`, `20261202001200_p1_rpc_cloture_deliberation`. `20261202000900` était déjà en production (triggers `trg_p0_*` actifs).
- Contrôles faits en base : `profiles_role_check` contient `conseiller` ; `conseillers.user_id` existe ; `votes_deliberations` est dans la publication `supabase_realtime` ; politiques de lecture/insertion présentes ; `cloturer_deliberation` appartient à `postgres`, EXECUTE accordé à `authenticated` et refusé à `anon`. Essais en transaction annulée : un `maire` atteint bien le contrôle « délibération introuvable » (P0002), un `secretariat` est refusé (42501). Aucune donnée modifiée.

## 2026-11-25 — P1 Gouvernance : clôture du vote par RPC (compatible avec le trigger 20261202000900)
- **SQL (PROPOSÉE — non appliquée)** : `supabase/migrations/20261202001200_p1_rpc_cloture_deliberation.sql` — RPC `public.cloturer_deliberation(p_id uuid)` `SECURITY DEFINER` (`search_path` vide, propriétaire `postgres`, EXECUTE réservé à `authenticated`) : appelant = `maire` actif (via `profiles.role`), délibération de sa commune (verrou `FOR UPDATE`), statut `projet`, décompte recalculé dans `votes_deliberations`, `adoptee` si Pour > Contre sinon `rejetee`, exception si aucun vote ; retourne `{statut, pour, contre, abstention}`. Elle passe le trigger `deliberations_garde_statut` grâce à son propriétaire (`current_user = postgres`) : **pas de `session_replication_role = 'replica'`** (superutilisateur requis, et il aurait désactivé l'audit et les gardes de votes).
- **Front** (`js/deliberations.js`, `mairie.html` v20261125.4) : « Clôturer le vote » appelle `sb.rpc('cloturer_deliberation', { p_id })` au lieu de l'`UPDATE` direct ; erreurs de la RPC traduites (42501 rôle, P0002 introuvable, 55000 statut / maintenance, P0001 aucun vote, PGRST202 fonction non déployée) ; message final construit à partir de la réponse serveur.
- **Tests / doc** : `tests/migration-history-integrity.test.js` et `supabase/PRODUCTION_VERSION_MAP.md` déclarent la migration.

## 2026-11-25 — P1 Gouvernance : clôture du vote et procès-verbal imprimable
- **Front** (`js/deliberations.js`, `mairie.html` v20261125.3) : dans le détail d'une délibération, bouton **« Clôturer le vote »** (rôle `maire` uniquement, statut `projet`) : relevé frais des votes, confirmation `confirm` (décompte + résultat), puis `UPDATE deliberations` projet → `adoptee` (Pour > Contre) ou `rejetee` (Contre ≥ Pour, abstentions non comptées). **Aucun vote exprimé : clôture refusée** (la délibération reste « Projet »). Garde-fous : mise à jour conditionnée à `statut = 'projet'` et à la commune, détection de « 0 ligne modifiée », messages dédiés (55000 : migration `20261202000900` ; 42501 : rôle non autorisé).
- Bouton **« Imprimer le Procès-Verbal »** (maire, secrétariat) : gabarit `#prt` + `window.print()` structuré comme `ecDoc` (en-tête mairie + blason, objet, session, décompte Pour / Contre / Abstentions, résultat, zone de signature du Maire) ; mention « provisoire » tant que le vote n'est pas clos. Toutes les valeurs passent par `esc()`.

## 2026-11-25 — P1 Gouvernance : vote des conseillers, rôle `conseiller`, corrections de la revue
- **Front** (`js/deliberations.js`, `mairie.html` : deliberations v20261125.2, core v20261125.2) : vue « Détail et vote » d'une délibération (Pour / Contre / Abstention, un vote par conseiller, résultats en temps réel via Realtime + relevé toutes les 15 s). **Création d'une délibération : statut initial imposé « Projet »** (plus de choix « Adoptée » / « Rejetée » : ils ne résultent que du vote, aligné sur le trigger `20261202000900`). **Fiche du votant : `conseillers.user_id` en priorité** ; rapprochement e-mail = `contact` en dernier recours, uniquement pour une fiche non liée à un compte.
- **Rôle `conseiller`** : ajouté à la liste des rôles autorisés à se connecter (`AL`, libellés `RL` / `RLH` dans `js/core.js`) et à l'allowlist de l'Edge Function `sa-admin` (`ROLES`) — **à redéployer** pour que le Super Admin puisse créer un compte `conseiller`.
- **SQL (PROPOSÉE — non appliquée)** : `supabase/migrations/20261202001100_p1_gouvernance_fixes.sql` — `conseillers.user_id` (FK `auth.users`, index unique par commune) ; `conseiller` ajouté à `profiles_role_check` ; lecture RLS de `conseillers` pour maire / adjoint / conseiller ; lecture de `deliberations` et `sessions_conseil` pour `conseiller` ; `votes_deliberations` : lecture et INSERT ouverts à `adjoint` et `conseiller` (uniquement avec **leur propre fiche** `user_id = auth.uid()` ; maire / cabinet / secrétariat inchangés) ; table ajoutée à la publication `supabase_realtime` (sans erreur si déjà présente). Numéro placé après `20261202001000` (la version 20261201000500 aurait été refusée comme « hors ordre » et précédait la création de `votes_deliberations`).
- **Tests** : `tests/migration-history-integrity.test.js` déclare la migration ; `tests/roles-admin-mairie.test.js` accepte les versions de scripts `2026112x`.

## 2026-11-25 — P1 Marchés : détail du marché, avenants et ordres de service
- **Front** (`js/marches.js`, `mairie.html` v20261125.4) : bouton « Détail » sur chaque marché en cours ouvrant une vue « Détail du marché » (informations de base, total des avenants, montant actuel) puis la liste des **avenants** (`marches_avenants` : montant_supplementaire, motif, date_signature) et des **ordres de service** (`ordres_service` : objet, date_emission, statut). Lecture : maire, finances, secrétariat.
- **Saisie** (maire et finances uniquement) : boutons « Ajouter un avenant » et « Émettre un ordre de service » avec formulaires et insertion dans les tables correspondantes (commune_id et marche_id renseignés ; contrôles : motif/objet obligatoires, montant valide, date d'exécution prévue ≥ date d'émission). Pas de suppression (traçabilité, cf. migration lot 10).
- **SQL** : aucune nouvelle migration (tables et RLS déjà en production via `20261202000200_lot10_marches.sql`).

## 2026-11-25 — P1 Budget : engagements par ligne budgétaire + crédit disponible
- **Front** (`js/budget.js`, `mairie.html` v20261125.3) : dans le détail d'un budget, chaque ligne de dépense affiche ses engagements (date, montant, statut), le total engagé et un indicateur **Crédit disponible = montant_prevu − (somme des engagements + montant_realise)** ; les engagements au statut `annule` ne consomment pas de crédit. Deux indicateurs de synthèse (total engagé, crédit disponible des dépenses) s'ajoutent aux KPI du budget. Bouton **« Nouvel engagement »** (formulaire montant + date) visible pour `maire`, `finances` et `secretariat` ; refus si le montant dépasse le crédit disponible. Chargeur `LG.engagements` / `E0.engagements`.
- **SQL (PROPOSÉE — non appliquée)** : `supabase/migrations/20261202001000_p1_rls_engagements_secretariat.sql` — la politique `engagements_creation` autorise désormais `secretariat` à insérer (en plus de `maire`, `finances`). Numéro placé après `20261202000900` : la migration doit s'exécuter après `20261202000100_lot9_budget.sql` qui crée la table et la politique.
- **Tests** : `tests/migration-history-integrity.test.js` déclare la nouvelle migration.

## 2026-11-25 — Audit P0/P1 : machines à états en base, tests CI sans faux succès, thème sombre
- **Machines à états (SQL, PROPOSÉE — non appliquée)** : `supabase/migrations/20261202000900_p0_triggers_machines_etats.sql`. `votes_deliberations` : vote (insertion, modification, suppression) uniquement si la délibération est au statut `projet`, par un conseiller `actif` de la même commune. `deliberations` : création ou passage direct à `adoptee` / `rejetee` refusés ; ces statuts sont définitifs. `budgets` : immuable en `vote`, `approuve`, `cloture` ; depuis `brouillon`, seul `vote` est possible. `marches` : création refusée en `attribue`, `approuve`, `en_cours` ; on n'y entre que depuis l'étape précédente. Seules les futures RPC `SECURITY DEFINER` (propriétaire `postgres`) passent les gardes ; `anon`, `authenticated` et `service_role` sont bloqués. Migration ré-exécutable.
- **Runner de tests** (`scripts/run-js-tests.js`) : un test qui affiche `SKIP:` n'est plus compté comme un succès ; il est signalé `SKIP` (jaune) et fait terminer le script en code 1 avec « ERREUR: Des tests ont été ignorés (SKIP). Installez les dépendances. » (les `FAIL` restent prioritaires).
- **Thème sombre** : le contrôle `gen-dark-theme.js --check` est réactivé dans `tests/theme.test.js` (il était commenté) ; `css/citoyen-dark.css` régénéré (8 règles manquantes : carte SIG `.sig-*` et `.pmb`).
- **Tests** : `tests/migration-history-integrity.test.js` déclare la nouvelle migration.

## 2026-11-25 — P0 paiements en espèces : validation côté serveur (RPC) + réalignement des lots 9 à 13
- **Faille traitée (audit P0)** : en production, la politique `ptx_staff_upd` laisse maire, finances, secrétariat et agent passer un paiement de `en_attente` à `paye` par l'API, sans contrôle de la source. Nouveau chemin sûr : RPC `valider_paiement_especes(p_id, p_motif)` (`SECURITY DEFINER`) — rôle `finances` uniquement, commune de l'appelant, statut `en_attente`, source `guichet`, motif obligatoire (5 à 500 car.), verrou de ligne, trace dans `paiements_validations` + `audit_log`. La fonction renseigne aussi `quittance_url`, comme l'ancien écran.
- **Front** (`js/taxes.js`, `mairie.html` v20261125.2) : le bouton « Valider (espèces) » n'apparaît que pour `en_attente` **et** source `guichet`, et uniquement au rôle `finances` (aligné sur la RPC) ; l'écriture directe est remplacée par l'appel RPC ; messages d'erreur dédiés (refus, introuvable, modifié entre-temps, RPC non déployée).
- **Déploiement (fait le 2026-11-25)** : `supabase/migrations/20261202000600_p0_rpc_valider_paiement.sql` appliquée en production (RPC + table `paiements_validations`), `js/taxes.js` déployé, puis étape 2 exécutée : politique `ptx_staff_upd` supprimée et droit UPDATE direct retiré — la faille est fermée. Les versions 20261202000600, 20261202000700 et 20261202000800 sont inscrites dans l'historique Supabase (2026-11-25).
- **Garde-fou RLS** : `20261202000700_p0_rls_paiements.sql` (appliquée le 2026-11-25) ajoute la politique restrictive `ptx_update_interdit_api` (UPDATE refusé à `anon`/`authenticated`, même si une politique permissive est réintroduite), retire les droits UPDATE par colonne et vérifie l'absence de `ptx_staff_upd`. Seuls la RPC (SECURITY DEFINER) et `service_role` peuvent modifier le statut.
- **Droits résiduels** : `20261202000800_p0_revoke_paiements.sql` (appliquée le 2026-11-25) retire `DELETE`, `TRUNCATE`, `REFERENCES` et `TRIGGER` à `authenticated` sur `paiements_taxes` (TRUNCATE ignorait le RLS) et tout droit à `anon` ; ne conserve que le `SELECT` (protégé par le RLS) sur les tables financières.
- **Tests** : `tests/mairie-taxes.test.js` réécrit pour le parcours RPC (17 contrôles : source, rôle, aucune écriture directe, erreurs serveur) ; `tests/migration-history-integrity.test.js` et `js/smoke.js` mis à jour.
- **Lots 9 à 13 et `communes_geo`** : vérifiés comme appliqués en production, migrations renommées en versions à 14 chiffres (`20261202000000` à `20261202000500`) et inscrites dans l'historique Supabase ; voir `supabase/PRODUCTION_VERSION_MAP.md`.

## 2026-11-24 (MAJ27) — état « vu » partagé entre tous les appareils de l'agent
- **Problème levé** : la mémoire « demande consultée » était locale à l'appareil. Elle est désormais **serveur** : table `demandes_vues` (un agent, une demande), écrite uniquement par la fonction `marquer_demande_vue` (refuse toute demande hors de SA commune, idempotente, `anon` sans accès), lue uniquement par son propriétaire dans sa commune (RLS). Aucune écriture directe possible.
- **Sans régression** : le client combine serveur + mémoire locale ; si le SQL n'est pas encore appliqué, ou si le réseau échoue, le comportement MAJ26 est conservé sans message d'erreur ni appel répété. Rattrapage automatique : les demandes déjà ouvertes avant la mise à jour sont transmises au serveur (25 par passage).
- **Synchronisation** : relecture toutes les 45 s (pastille seule) → une demande ouverte sur le téléphone disparaît sur l'ordinateur en moins d'une minute.
- Fichiers : `supabase/proposed/20261201_demandes_vues_multi_appareils.sql`, `js/core.js` (`seenSet`, `pushSeen`, `markSeen`, `syncSeen`, chargeur `dvues` tolérant), `js/actions.js`, `mairie.html`. Tests : `tests/mairie-badge-notifications.test.js` (19 contrôles dont repli sans SQL et réseau coupé). Le SQL a été éprouvé dans une transaction annulée sur le projet de test (deux communes, deux agents, anon) : isolation confirmée.

## 2026-11-24 (MAJ26) — notifications des membres de la mairie : pastille « intelligente »
- **Avant** : la cloche additionnait des catégories (5 nouvelles demandes = 1 ; « prochain rendez-vous » comptait toujours 1) et ouvrir une demande ne retirait rien.
- **Maintenant** : la pastille compte des éléments à traiter — nouvelles demandes **non encore ouvertes** (une par demande), dossiers à signer, publications à valider, dépassement budgétaire, notifications non lues. Le prochain rendez-vous reste affiché mais n'est plus compté.
- **Ouvrir une demande** (liste ou lien du tableau de bord) la retire aussitôt du compteur ; mémorisation par utilisateur et par commune sur l'appareil (`localStorage`, identifiants de demandes uniquement, purgés automatiquement). Une demande prise en charge n'est plus comptée.
- **Temps réel discret** : rafraîchissement des demandes toutes les 45 s, mise à jour de la pastille seule (aucun redessin d'écran, aucune saisie perdue).
- Fichiers : `js/core.js` (`seenSet`, `markSeen`, `unseenNew`, `badgeN`, `majBadge`, `alerts`), `js/actions.js`, `js/maire.js`, `mairie.html` (versions de scripts). Test : `tests/mairie-badge-notifications.test.js` (12 contrôles). Aucune migration SQL.
- (Levée en MAJ27) Limite connue : l'état « vu » est propre à l'appareil ; sur un second appareil la demande réapparaît comme à consulter jusqu'à son ouverture.

## 2026-11-24 (MAJ25) — Lots 1 à 8 : sécurité, catalogue, état civil/PDF, WhatsApp, fiscalité, QA
- **Lots 1–2 (sécurité, isolation)** : RLS par `commune_id` partout, droits `anon` retirés, rôles `admin_mairie`/`maire` séparés, double authentification des administrateurs, mot de passe renouvelé tous les 30 jours (migrations déjà appliquées).
- **Lot 3 (catalogue)** : démarches par commune (`demarches.js`), tarifs et pièces à fournir.
- **Lot 4–5 (circuits, état civil/PDF)** : `20261126_lot4_circuits_administratifs.sql`, `20261127_lot5_etat_civil.sql` — registre `actes_etat_civil`, `actes_copies`, copies d'actes imprimables (PDF via impression) avec blason et QR Code vers `verifier.html?ref=…` (`js/etat-civil.js`).
- **Lot 6 (WhatsApp)** : `js/notifications.js` (`WAHA_API_URL`, `envoyerNotification(telephone, message, ctx?)`, fournisseur WAHA en test, Meta prévu), bouton « Notifier le citoyen par WhatsApp » dans le détail d'une demande, historique ; table `notifications_whatsapp` (la table `notifications` existait déjà : notifications internes), statuts `en_attente` → `succes` | `echec`. Téléphone obligatoire au dépôt (`citoyen.js`). SQL : `20261128_lot6_notifications.sql`.
- **Lot 7 (fiscalité)** : tarifs (`tarifs_demarches`), prix calculé côté serveur, choix « en ligne (simulation) » / « guichet » via RPC `choisir_paiement_demande`, `paiements_taxes` (référence unique générée par la base), quittance `/quittance?ref=…` avec QR Code et impression, section « Mes quittances » (`citoyen.js`), onglets mairie « Tarifs » et « Recettes / Taxes » (export CSV). SQL : `20261125_demarches_paiements_quittances.sql` puis `20261129_lot7_portail_fiscal.sql` (**appliqués en production**).
- **Lot 8 (QA)** : suite de tests relancée (seuls 2 échecs préexistants, `citoyen-etatcivil` : widget anti-spam). RLS vérifiée en lecture seule sur la production : active, `anon` sans accès, politiques limitées à la commune sur `actes_etat_civil`, `actes_copies`, `paiements_taxes`, `tarifs_demarches`, `notifications_whatsapp`. Constat : `paiements_creer` n'imposait pas `statut='en_attente'` → correctif proposé `supabase/proposed/20261130_lot8_paiements_rls_durcissement.sql` (**non appliqué**).

## 2026-11-23 (MAJ24) — photo des agents et badge imprimable (administrateur de mairie)
- **Photo d'identité** : Administration → Services et équipes → Personnel : champ « Photo d'identité (badge) » dans la fiche agent, miniature dans la liste, bouton « Retirer la photo ». Image réduite côté navigateur (WebP, 480 px max), stockée dans le bucket **privé** `agents-photos` (URL signée, 1 h).
- **Badge** : bouton « Badge » par agent → carte 85,6 × 54 mm (format carte bancaire) imprimée via `#prt` ; clair même en thème sombre. Contenu **non sensible uniquement** : mairie (et blason si défini), photo, prénom, nom, fonction, service, matricule. Jamais de téléphone, e-mail, contrat, date d'embauche, observations ni salaire.
- **Base** : `supabase/proposed/20261123_agent_photo_badge.sql` (**appliquée en production le 2026-11-23**, version 20261123125215) : colonne `personnel.photo`, bucket + 4 politiques Storage (écriture : admin de SA commune ; lecture : + maire/RH), RPC `org_sa_agent_photo_set` (garde `org_gest`), `org_sa_organigramme` expose le chemin de la photo. Avant la migration, le front restait fonctionnel (badge avec initiales).
- Tests : `tests/agent-badge.test.js` (nouveau). Cache : `mairie.css?v=20261123.2`, `org-f.js?v=20261123.2`. Doc : `docs/BADGE_AGENT.md`.
- Dépôt : zip et dépôt vérifiés identiques (304 fichiers) avant la mise à jour ; branches fusionnées supprimées.

## 2026-11-23 (MAJ23) — carte sur le portail citoyen, activation d'un e-mail non confirmé
- **Portail citoyen** : l'adresse de la mairie accepte un lien Google Maps ; il s'affiche en bouton « Voir sur la carte » (nouvel onglet, `rel="noopener noreferrer"`) dans « Infos pratiques » et « Contacter la mairie ». Seuls les liens https `maps.app.goo.gl`, `goo.gl/maps`, `google.*/maps` et `maps.google.*` sont reconnus (jamais d'autre URL cliquable). Le texte d'adresse éventuel reste affiché. Sans schéma ni migration : champ existant `indicateurs.contact_adresse`.
- **Données de production** : liens enregistrés pour Diofior, Fimela, Joal, Djirnda, Fatick et Djilass (l'ancien texte « Fimela » est remplacé).
- **Super admin** : `sa-admin` (v17, déployée) confirme l'e-mail du compte lors de l'activation au lieu de répondre « L'invitation doit être acceptée… » ; l'action est tracée (`email_confirme_par_admin`). Le bouton « E-mail non confirmé » devient « Activer ».
- Tests : `tests/carte-et-activation.test.js` (nouveau), `tests/browser/*` adaptés. Cache : `sw.js` `mc-v12`, `citoyen.js?v=20261123.1`, `superadmin.js?v=20261123.1`.

## 2026-11-23 (MAJ22) — administrateurs de mairie : interface « Administration Système » + double authentification
- Les comptes `admindjirnda@`, `admindiofior@`, `adminjoal@`, `adminfatick@` et `adminfimela@gmail.com` ont la même interface que le compte d'administration principal (rôle `super_admin` **de leur commune uniquement** ; isolation RLS inchangée, aucun droit plateforme).
- Futurs admins de mairie : déclencheur `admin_mairie_actif_vers_admin_commune` (migration `20261123120000`, appliquée en production) — un `admin_mairie` activé avec une commune reçoit le même rôle ; les comptes en attente suivent l'invitation habituelle.
- `js/core.js` : double authentification (TOTP) exigée pour `super_admin` **et** `admin_mairie` dès la connexion. Côté base, `is_super_admin()` exige déjà aal2 ; `supabase/proposed/20261123_admin_mairie_mfa_serveur.sql` (proposé, non appliqué) étendrait la règle aux fonctions `am_*`.
- Tests : `tests/admin-commune-promotion.test.js`, `tests/mfa-admin-mairie.test.js`. Doc : `docs/MFA_ADMIN_MAIRIE.md`.
- Dépôt : synchronisation zip/dépôt (5 fichiers ajoutés, 3 mis à jour), README, REPRISE_SESSION et TASKS mis à jour.

- Espace mairie : bouton « Couleur par défaut » (vert #0B5A2E) à côté de « Enregistrer la couleur ».
- Portail : plus d’appel `mes_rdvs` sans session (401 à chaque visite) ; couleur trop claire refusée avec message explicite dans l’espace mairie.
- Audit des droits par rôle (docs/AUDIT_DROITS_2026-11-22.md) ; accueil adapté au poste dans l’interface unique ; module « Territoire » retiré du cabinet (non autorisé côté serveur).
- Installation Android : manifeste par commune servi par une URL réelle (Edge Function `manifest-commune`, déployée en production) ; repli automatique sur le manifeste local si indisponible.
- Icônes de l’application (écran d’accueil) : bucket public dédié `icones-pwa` (3 PNG par commune, migration `20261122135230`, appliquée en production) ; le bucket `identite` reste privé. À régénérer une fois : « Régénérer les icônes ».
## 2026-11-22 (MAJ21) — correctifs portail citoyen
- Loader « Chargement… » permanent : sélecteur CSS `+` cassé par `#dlg` → `~`.
- Blason et bannière publiés invisibles (bucket `identite` privé) : lecture par liens signés, repli URL publique.
- Refonte visuelle de l’accueil citoyen selon la maquette (données inchangées), responsive mobile / tablette / ordinateur.

> **Mise à jour 2026-11-19** : les scripts SQL numérotés de la racine (`20261114_…` à `20261127_…`), `patch-org.js`, `patch-orgd.js`, `js/patch-core.js`, `js/patch-lot4.js`, `js/lot4.block.js`, `js/core_patched.js` et `patched/` ont été retirés du dépôt (commits `57a9265`, `ccf33b3` ; ils restent consultables dans l'historique git). Les migrations de référence sont dans `supabase/migrations/` (voir `recovered-history-manifest.json`) ; toutes les consignes « copier / appliquer / déployer » ci-dessous sont **historiques** : le code est déployé et les migrations sont appliquées en base. Les fichiers `*.append.md` ont été consolidés dans `CHANGELOG.md`, `DECISIONS.md` et `TASKS.md`.


## 2026-11-21 (MAJ5) — Icônes par commune, push, SMS, multilingue (aucun déploiement, aucune écriture en production)
- **Icônes PNG par commune** : `js/icons.js` (canvas) génère 192/512/maskable depuis le blason + couleur (plaque blanche, filet or, repli monogramme) ; publiées dans le bucket `identite` par « Publier le blason et les icônes » / « Régénérer les icônes » (et à l'enregistrement de la couleur). Le manifest citoyen les utilise si elles existent (sonde HEAD), sinon icônes **neutres** `icon-defaut-*.png` (avant : blason de Fimela pour toutes les communes) ; `apple-touch-icon` par commune.
- **Push** : handlers `push`/`notificationclick` dans `sw.js` (cache `mc-v10`), activation dans « Mon profil » (cachée tant que `<meta name="mc-vapid">` est vide), Edge Function `push-send`, SQL **proposé** `supabase/proposed/20261121_push_notifications.sql`. Voir `docs/PUSH_NOTIFICATIONS.md`.
- **Ergonomie citoyenne** : carte « Installer l'application » (bouton natif ou consigne iPhone, masquable) ; chargement de l'accueil **en deux temps** (infos essentielles d'abord ; dossiers, rendez-vous, projets ensuite, attente max 1,2 s, rendu non relancé en cours de saisie).
- **SMS** : file `sms_outbox`, Edge Function `sms-dispatch`, adaptateurs `dryrun`/`http-json`, quotas par commune, modèles, SQL **proposé** `20261121_sms_outbox.sql`. Aucun fournisseur choisi. Voir `docs/SMS_ARCHITECTURE.md`.
- **Multilingue** : `js/i18n.js`, 27 clés `tr()`, sélecteur conditionné à la validation, CSV `docs/i18n/textes_a_valider.csv`. Voir `docs/I18N_WOLOF_SERERE.md`.
- Tests : `pwa-icons-push`, `sms-architecture`, `i18n` (nouveaux) ; `edge-function-config` (8 fonctions). 32 suites vertes.

## 2026-11-20 (reprise) — Exécution des tests rôles ; correctifs
- `tests/postgres/roles-admin-mairie-integration.sh` exécuté sur PostgreSQL jetable : **59/59 OK**. Correctif du script : désormais **rejouable** (repart d'un schéma `public` vierge) avec garde-fou refusant une base contenant des utilisateurs Auth non-test. `tests/postgres/ia-usage-concurrency.sh` : création des rôles idempotente (échouait sur un cluster ayant déjà `anon`).
- Nouveau `tests/browser/` (backend simulé sur base jetable, `seed.sql`, `mairie-roles-ui.test.js`, `run.sh`) : 53 contrôles navigateur (Super Admin, Admin mairie A/B, maire, agent ; préparation, affectation différée, activation, suspension, isolation A/B, escalades).
- **Correctif UI** `js/org.js` : le bouton « Modifier » des postes n'est plus affiché au maire (lecture seule : il ne faisait rien). `mairie.html` : `org.js?v=20261120.2`. Aucune migration, aucun déploiement, aucune donnée de production touchée.

## 2026-11-20 — Séparation des rôles : Super Admin / `admin_mairie` / Maire (PROPOSÉ, NON DÉPLOYÉ)
- Nouvelle migration **proposée** `supabase/migrations/20261120100000_roles_admin_mairie_separation.sql` (non appliquée) : rôle `admin_mairie`, statuts `en_attente/affecte/actif/suspendu`, triggers anti-élévation, `org_gest`/`org_droit_propre`/`org_peut_accorder` revus, `saas_creer_commune`/`admin_attribuer`/`lier_adjoint` durcis, RPC `saas_preparer_admin_mairie`, `saas_affecter_admin_mairie`, `saas_admins_mairie`, `saas_compte_par_email`, journalisation `profil_role_change`.
- Edge Functions `sa-admin` (action `affecter_admin_mairie`, commune facultative, activation refusée sans commune) et `saas-admin` (réutilise un compte existant, ne le supprime jamais en cas d'échec) : **non déployées**.
- Interface Super Admin (`js/superadmin.js`) : panneau « Administrateurs municipaux » (création anticipée, affectation, activation, suspension). `core.js`, `org.js`, `org-f.js` : écrans d'organisation réservés à `admin_mairie`/Super Admin ; maire en lecture. Scripts versionnés `?v=20261120.1` dans `mairie.html`.
- Tests : `tests/roles-admin-mairie.test.js` (nouveau), `tests/postgres/roles-admin-mairie-integration.sh` (nouveau, base jetable), tests existants ajustés (`migration-history-integrity`, `saas-invitation`, `superadmin-edge-contract`, `org-f`).
- Docs : `docs/ROLES_ET_PERMISSIONS.md`, `AUDIT_ROLES_2026-11-20.md`, `REPRISE_SESSION.md`, `.env.example`.
- Aucune écriture en production, aucun déploiement. Lecture seule de la production pour l'état des comptes/communes.

## 2026-11-20 — Modernisation de l'interface Super Admin (`/saas`)
Présentation uniquement : aucune table, RLS, migration, RPC, Edge Function, permission ni règle MFA modifiée ; mêmes appels `saas_*` et `saas-admin` avec les mêmes charges utiles.
- `css/saas.css` (nouveau, chargé uniquement par `saas.html`) : design system vert institutionnel / blanc / or discret. `css/mairie.css` n'est pas modifié (partagé avec le portail mairie).
- `saas.html` : feuille `saas.css`, police Newsreader (titres), `body.sa`. Balise `saas.js?v=20261119.1` conservée (exigée par `tests/saas-invitation.test.js`).
- `js/saas.js` (rendu seulement) : barre latérale (≥1024 px), rail d'icônes (tablette), onglets en bas + tiroir (mobile) ; routage par `#hash` (bouton retour Android) ; tableau de bord en bandeau (mairies + répartition par statut, finances en lignes pointillées), tuiles, panneau « À traiter », activité récente ; formulaire « Nouvelle mairie » repliable ; interrupteurs pour les modules ; états vides ; notifications compactes (succès auto-masqué) ; écran de connexion/A2F harmonisé ; accessibilité (aria-current, focus visible, Échap, cibles ≥ 44 px, `prefers-reduced-motion`).
- Vérifié : tests existants inchangés (seul `enhance.test.js` requiert `jsdom`, absent hors CI), test Chromium 390/820/1366 px avec la CSP de `_headers` (0 erreur JS, 0 violation CSP, 0 débordement horizontal), appels RPC/Edge contrôlés (création, suspension, modules, paiement).
- Sauvegarde intégrale avant intervention : `SAUVEGARDE_AVANT_MODERNISATION.zip`. Retour arrière : restaurer `saas.html` et `js/saas.js`, supprimer `css/saas.css`.

## 2026-11-16 — Porte d'entrée citoyenne + durcissement
### Base (migrations appliquées, idempotentes, aucune suppression)
- `securite_revoke_anon_tables_initplan` : droits SQL retirés au rôle `anon` sur 12 tables internes (RLS déjà actif) ; `default privileges` anon retirés ; policy `citoyens_own` optimisée (`(select auth.jwt())`) ; index `communes_admin_principal_idx`.
- `porte_entree_citoyen_identite` : colonne `indicateurs.couleur` (hex) ; bucket public `identite` (webp/jpeg/png, 300 Ko, écriture réservée au maire/cabinet/secrétariat de la commune) ; RPC `identite_commune(slug)` (couleur + blason publié) ; RPC `commune_par_hote(hote)` (sous-domaine / domaine propre).
### App citoyenne (`citoyen.js`)
- Plus de saisie de code : commune = `?c=slug` > mémorisée (localStorage) > sous-domaine. Sans commune : « Utilisez le lien ou le QR code de votre mairie » (aucune liste) + code en option discrète.
- Correctif : `demarches_commune` n'était jamais lue (mauvaise déstructuration de `Promise.all`) → infos, actualités et démarches de la commune ne s'affichaient pas.
- Blason, slogan, devise, couleur de la commune dès l'ouverture ; repli sur l'écusson si image absente.
- Manifest PWA par commune (nom, `start_url=/?c=slug`, icône blason) généré côté client ; retour automatique au manifest statique si la CSP le refuse.
- Hors-ligne : copie locale de la commune ; message clair + bouton « Réessayer » sinon. Slug obsolète nettoyé.
- Turnstile : le widget se dessine sans effacer les saisies (écran « Mon espace » inclus).
- `manifest-citoyen.webmanifest` : `start_url` = `/?c=fimela`.
### Espace mairie (`demarches.js`)
- Administration > « Lien citoyen » : lien, copie, QR code (`/js/qr.js`, qrcode-generator 1.4.4 minifié, hébergé), affiche imprimable, couleur de la commune, publication du blason.
### À appliquer (fichier fourni)
- `patch-core.js` : load() tolérant aux erreurs partielles (vérifié : non encore appliqué dans le `core.js` du Project).

## Lot 3 — Navigation et catégories (portail citoyen, `citoyen.js`)
- Clic sur un service : si la mairie a configuré des démarches ou si des raccourcis existent, écran « Que voulez-vous faire ? » ; sinon formulaire direct (1 clic).
- Écran liste : démarches de la mairie (avec délai indicatif), raccourcis en mots simples, « Autre demande ». Retour du formulaire vers la liste, puis vers l'accueil.
- Raccourcis (simples libellés d'une demande libre, objet prérempli) : extrait de naissance / mariage / décès ; signaler un problème de voirie ; signaler un problème ; faire une suggestion. Aucun guidage propre à l'état civil à ce stade (lot 5).
- Recherche : sans accents ni majuscules, trouve les services, les démarches et les raccourcis ; un résultat ouvre le formulaire directement.
- Textes : structure `TX.fr` + `tr(clé)` prête pour wolof/sereer (repli sur le français, aucune traduction).
- Aucun changement de base ni de droits. Tests : `tests/citoyen-nav.test.js` (18 contrôles).

## Lot 5 — Extrait d'acte guidé + statuts de retrait (portail citoyen, mairie)
- Citoyen (`citoyen.js`) : extrait de naissance/mariage/décès (raccourci ou démarche État civil « naissance/mariage/décès » de la mairie) = formulaire court : méthode 1 n° d'acte + année + nom, méthode 2 ancien extrait joint ; puis écran « Vérifiez votre demande » avant envoi. Déclaration/enregistrement initial = formulaire générique (non confondu).
- Statuts : libellés demandés (Demande envoyée, En cours de vérification, En cours de traitement, Informations complémentaires nécessaires, Demande acceptée, Document prêt à retirer, Demande rejetée) + explication simple ; « prêt » affiche lieu/modalités saisis par le service + adresse/horaires réels ; jamais de téléchargement.
- Mairie (`core.js`, `actions.js`) : boutons « Accepter la demande » et « Document prêt à retirer » (réponse obligatoire) ; statuts ajoutés aux listes. `patch-core.js` appliqué.
- Base : statuts, notifications et garde-fou « prêt seulement après acceptation » déjà présents (vérifiés) ; `20261120_lot5_statuts_retrait.sql` = copie idempotente pour le dépôt.
- Tests : `tests/citoyen-etatcivil.test.js` (nouveau, 17 contrôles) ; nav mis à jour ; `smoke.js` : catégorie invalide corrigée (échec préexistant). Tous OK : nav, compte, état civil, smoke.

## Lot 6 — Rendez-vous (portail citoyen + espace mairie)
- Base : `20261121_lot6_rdv.sql` — table `rdv_demandes` (RLS personnel maire/cabinet/secrétariat de la commune, droits anon retirés), RPC `creer_rdv` (commune lue par slug côté serveur, date J+1..J+90, max 3 en attente), `mes_rdvs` (numéros non devinables + compte), notification du citoyen à la décision.
- Citoyen (`citoyen.js`) : écran « Prendre rendez-vous » (service, motif, date), jamais confirmé automatiquement ; « Mes rendez-vous » (accueil + espace) avec statuts en mots simples, date/heure confirmées, réponse.
- Mairie (`demarches.js`) : Citoyens > Rendez-vous : Confirmer (date+heure) / Refuser (motif obligatoire) ; audience du Maire ajoutée à l’agenda.
- Tests : `tests/citoyen-rdv.test.js` (14 contrôles) ; nav, compte, état civil, lien, smoke OK.

## Lot 6 bis — Créneaux de rendez-vous + annulation par le citoyen
- Base : `20261122_lot6bis_creneaux.sql` — table `rdv_planning` (jours, heures, pause, durée ; RLS personnel maire/cabinet/secrétariat de la commune), RPC `planning_rdv`, `creneaux_rdv` (créneaux libres, calculés serveur), `creer_rdv` contrôle jour/heure/créneau libre quand le planning est actif, `mes_rdvs` renvoie l'heure souhaitée, `annuler_rdv`, index unique « un seul confirmé par service/jour/heure ». Réglage Fimela pré-inséré : lundi-vendredi, 08h-17h, pause 12h30-14h, 30 min.
- Citoyen (`citoyen.js`) : jour puis heures libres (radios, sans perdre la saisie ni l'anti-spam) ; jour fermé refusé avec message ; heure obligatoire ; bouton « Annuler ce rendez-vous » (en attente ou confirmé, à venir). Sans planning actif : écran « date seule » inchangé.
- Mairie (`demarches.js`) : Citoyens > Rendez-vous > « Jours et heures de rendez-vous » ; heure souhaitée visible et préremplie ; créneau déjà confirmé = message clair.
- Tests : `tests/citoyen-rdv-creneaux.test.js` (19 contrôles), `tests/mairie-rdv-planning.test.js` (14). Tous les tests existants + smoke OK.

## Lot 7 — Informations et accessibilité (portail citoyen)
- Base : `20261123_lot7_infos.sql` — `publications.categorie` (actualité/communiqué/avis/événement), `projets.public` (défaut false), RPC `projets_publics(slug)`, `actualites` renvoie la catégorie.
- Citoyen : section « Travaux et projets », badge de catégorie, « Envoi en cours… », lien « Aller au contenu », `h1` par écran.
- Mairie : type de publication ; bouton « Visible citoyens / Masqué » sur chaque projet.
- Tests : `tests/citoyen-info.test.js` (5). Tous OK + smoke.

## Lot 8 — Audit sécurité et tests
- Audit statique des 6 migrations + `index.ts` : toutes les RPC publiques résolvent la commune par slug côté serveur ; RLS personnel filtrée par `profiles.commune_id` ; droits anon retirés sur les tables internes ; `creer_rdv` réservé aux connectés (anonyme + captcha).
- `tests/isolation_test.sql` (à lancer dans Supabase) : accès croisés commune/commune.

## Lots catalogue 1 à 6
- Citoyen : État civil = 4 cartes (naissance, mariage, décès, résidence) + « Autres documents » ; boîte de dialogue (recherche, catégories, aucun-résultat) ; formulaires par modèle (identité, légalisation, foncier, social, libre) ; extraits guidés inchangés.
- Mairie : Démarches = famille, service, modèle, frais, retrait ; Activer/Désactiver, Archiver.
- Base : `20261124_catalogue.sql` (28 prestations, 4 actives).
- Tests : `catalogue.test.js` (nouveau), `citoyen-nav.test.js` mis à jour ; `isolation_catalogue.sql`.


---

# Historique consolidé des lots (ex-fichiers `*.append.md`)


## CHANGELOG — Lots catalogue (1 à 6)
- Citoyen : État civil = 4 cartes (naissance, mariage, décès, résidence) + « Autres documents » ; boîte de dialogue plein écran mobile (recherche sans accents, catégories, aucun-résultat, fermeture/réouverture) ; formulaires par modèle (identite, legalisation, foncier, social, libre) avec récapitulatif, frais, retrait, service ; extraits guidés inchangés.
- Mairie : Démarches = famille, service, modèle, frais, retrait ; Activer/Désactiver, Archiver.
- Base : `20261124_catalogue.sql` (famille, service, frais, retrait, modele, statut ; RPC par slug, actives seulement ; 28 prestations, 4 actives).
- Tests : `catalogue.test.js` (nouveau), `citoyen-nav.test.js` mis à jour ; compte, état civil, rdv, créneaux, info OK ; `isolation_catalogue.sql`.

## DECISIONS
- Prestations non confirmées insérées inactives ; la mairie les active après vérification de sa compétence.
- Pas de suppression de prestation : archivage. Frais/pièces/délais jamais préremplis.
- Dialogue = div role=dialog hors rendu principal (saisie préservée).

## TASKS
- Appliquer `20261124_catalogue.sql` puis `isolation_catalogue.sql` ; déployer citoyen.js, demarches.js, index.html, mairie.html ; vider cache/PWA.
- Fimela : valider juridiquement puis activer les 24 prestations inactives, saisir pièces/frais/délais/retrait.
- Tester sur Android réel : dialogue, clavier, défilement.



## CHANGELOG — Lot A : organigramme, rôles et droits (base)
- Appliqué en production (additif, aucune table/RLS/fonction existante modifiée) : `org_roles`, `org_role_droits`, `org_postes`, `org_affectations`, `org_delegations_droits` (RLS : lecture limitée à sa commune, écriture uniquement via fonctions).
- Fonctions : `org_commune`, `org_droit(module,action)`, `org_init`, `org_role_save`, `org_role_droit_set`, `org_poste_save`, `org_affecter`, `org_affectation_fin`, `org_deleguer`, `org_revoquer` ; internes non exposées : `org_droit_propre`, `org_droit_user`, `org_log`, `org_seed`.
- Organigramme par défaut (24 postes + 1 agent par service spécialisé) semé pour les 2 communes existantes : 80 rôles, 80 postes, 1100 droits.
- 11 actions : consulter, creer, modifier, supprimer, valider, rejeter, signer, exporter, imprimer, partager, administrer.
- Tests exécutés en base (annulés après coup) : maire tous droits ; sans affectation = aucun droit ; droits du poste ; délégation > droits détenus refusée ; délégation valide puis révocation immédiate ; non-admin refusé ; délégation inter-communes refusée ; RLS : une seule commune visible. 8/8 OK.

## DECISIONS
- `commune_id` conservé (pas `municipality_id`) : évite de casser 16+ tables, RLS et RPC.
- Postes = données configurables par commune ; `profiles.role` (11 valeurs) inchangé, donc aucune régression.
- Droit effectif = maire/super_admin : tous ; sinon override legacy (consulter) > poste/rôle > délégation. Une délégation n'est valide que si le délégant détient encore le droit ; pas de sous-délégation ; 1 an maximum.
- Pas d'action « payer » : séparation ordonnateur / comptable public ; le paiement reste une confirmation externe.
- Rien n'utilise encore `org_droit` : le lot A n'altère aucun comportement existant.

## TASKS
- Lot B : écrans Administration > Organigramme / Rôles / Affectations / Délégations ; `can()` alimenté par `org_droit` ; tableaux de bord par poste.
- Lot C : RLS des modules sensibles (paie, personnel, rémunérations, marchés, archives confidentielles) via `org_droit` ; traçabilité des consultations sensibles ; tests d'isolation.
- Lot D : tests UI, matrice finale, documents.
- Export du SQL du lot A en fichier `20261125_org_rbac.sql` pour le dépôt (appliqué en base, non encore versionné).



## Lot C — RLS sensibles via org_droit, traçabilité
- `20261126_lot_c_rls.sql` : policies additives (OR) sur personnel, congés, rémunérations, paies/paie_lignes, marchés, archives non confidentielles — aucune policy existante retirée.
- Table `acces_sensibles` + fonction `org_tracer(module, cible)` : journal des consultations sensibles, lecture réservée maire/super_admin.
- `isolation_lotc.sql` : croisement Diofior/Fimela sur personnel, rémunérations, paies, marchés, archives.
### À appliquer
- Exécuter `20261126_lot_c_rls.sql` dans Supabase, puis `isolation_lotc.sql` (remplacer les placeholders par des ids réels) : attendu 0 sur chaque ligne croisée, vrai sur le témoin positif.



## Lot D — délégations dans les menus, traçabilité, Mon poste (2026-11-17)
- `js/org-d.js` (nouveau, additif) : droits reçus par délégation visibles dans les menus ; chargement des tables sensibles pour un poste habilité (RLS inchangée) ; `org_tracer` à l'ouverture des écrans personnel, congés, paie, rémunérations, marchés (1 ligne / 15 min / utilisateur / écran) ; écrans « Mon poste », « Mes délégations » (non-maires), « Consultations sensibles » (maire).
- `20261127_lot_d.sql` : `org_tracer` durcie (search_path, anon révoqué, longueurs bornées), index du journal. Appliquée en base.
- `patch-orgd.js` : ajoute la balise org-d.js dans mairie.html (idempotent, .bak).



## 2026-11-21 (nouvelle session, ZIP MAJ2 = base officielle)
- Reprise : ZIP vérifié (`unzip -t` OK, 199 fichiers, SHA-256 `bd29d1ea…ed5fe` pour `BACKUP_ORIGINAL_MAJ2.zip`). 26/27 fichiers de test Node PASS ; `enhance.test.js` exige `jsdom` (indisponible hors CI, réseau coupé).
- Correctif sécurité : `test-results/` (comptes rendus de tests) ajouté à `.assetsignore` pour ne plus être servi comme asset public ; `tests/assets-ignore.test.js` vérifie aussi `docs/`, `.env.example`, `database-private/`.
- Aucune migration, aucun déploiement, aucune donnée de production touchée.
- Production (autorisation du propriétaire) : `security_null_mfa_guards` et `ia_usage_atomic_reservations` sont appliquées et enregistrées dans l'historique (versions d'application 20261120225404/20261120225413 ; `security_null_mfa_guards` apparaît aussi à 20261121054301, doublon sans effet car `CREATE OR REPLACE`). CORRECTION : l'erreur « relation already exists » vue à l'application de la migration IA venait d'une double exécution de ma propre requête, pas d'un déploiement antérieur hors historique ; aucune réparation d'historique n'est nécessaire (les fichiers du dépôt gardent leurs noms 20261119…, la base les enregistre sous leur date d'application).
- Vérifié en lecture seule : fonctions Edge déployées (saas-admin v3, sa-admin v15, admin-comptes v10, bright-worker v4, purge-pieces v2, ia-texte v9) correspondent aux sources du dépôt ; `bright-worker` ne fait plus que renvoyer « Endpoint retiré » (aucune référence front) ; `communes_slug_uq` est un doublon strict de `communes_slug_key`, sans clé étrangère dépendante → migration proposée `supabase/proposed/20261121_drop_duplicate_communes_slug_index.sql` (NON appliquée).
- `20261120100000` : toujours NON appliquée (aucun PostgreSQL local, branche Supabase payante et rejeu impossible depuis zéro).

## 2026-11-21 (MAJ6) — reprise : correctif des droits, indicateurs, accessibilité, SMS
Production : **lecture seule uniquement** (aucune écriture, aucun déploiement). Migrations déjà appliquées en production, non rejouées : `drop_duplicate_communes_slug_index` (20261121070621), `roles_admin_mairie_separation` (20261121071218) ; voir `supabase/PRODUCTION_VERSION_MAP.md`.
- **Correctif droits** `supabase/migrations/20261121090000_org_role_droit_set_admin_mairie.sql` : un `admin_mairie` actif peut accorder des droits métier aux rôles de SA commune (anomalie reproduite avant correctif, corrigée après). Reste interdit : `org` en écriture (trigger), rôle `maire`, rôle inexistant, autre commune. Idempotent. Test : `tests/postgres/org-role-droit-set-integration.sh`.
- **Indicateurs** `20261121091000_org_kpi_v2.sql` : `citoyens` comptait seulement 3 statuts ouverts (il en manquait 4) ; nouveaux `demandes_anciennes` (>15 j), `rdv`, structure (`services`,`postes`,`affectations`,`roles`) ; `admin_mairie` reçoit « — » (null) pour le métier au lieu d'un « 0 » trompeur. `js/org-f.js` adapté. Test : `tests/postgres/org-kpi-integration.sh` + `tests/org-f.test.js`.
- **Accessibilité** `js/a11y.js` (chargé par `pwa-init.js` sur les 3 interfaces) : lien d'évitement, `main`, annonce du titre à chaque changement d'écran, noms accessibles des champs/boutons icône, `alt`, `scope`, icônes masquées, `prefers-reduced-motion`. Test : `tests/a11y.test.js`.
- **Notifications / SMS** : SQL `proposed/20261121_push_notifications.sql` et `…_sms_outbox.sql` désormais testés sur vrai PostgreSQL (RLS, droits, idempotence, quota, concurrence `skip locked`) ; nouveau `proposed/20261121_sms_triggers.sql` (SMS automatique sur changement de statut d'une demande, opt-in par commune, jamais bloquant). Test : `tests/postgres/notifications-sms-integration.sh`.
- Tests : stub `org_role_droits` aligné sur la PK de production ; garde « utilisateurs Auth réels » du script de base corrigée (échouait sur base vierge).
- Edge Functions : production = `sa-admin` v15 / `saas-admin` v3 **anciennes** (pas d'`admin_mairie`, pas de `affecter_admin_mairie`). Sources du dépôt à jour, syntaxe TypeScript vérifiée ; **déploiement non fait (accord requis)**.

## 2026-11-21 (MAJ7) — préparation de la livraison (aucune ressource de production touchée)
- `supabase/production-ready/` : 5 migrations ordonnées (01 droits admin_mairie, 02 KPI v2, 03 push, 04 file SMS, 05 déclencheurs SMS), copies exactes des sources testées, NON appliquées. `scripts/deploy/apply-migrations.sh` refuse de tourner sans `CONFIRM_PROD=oui` (+ `--dry-run`).
- `DEPLOIEMENT_COMMANDES.md` : commandes exactes Supabase (base, 5 Edge Functions, secrets) et Cloudflare (`wrangler deploy`). `bright-worker` conservé (aucune suppression).
- CI `postgres-concurrency.yml` : déclenchée sur toute modification de `supabase/**` et `tests/postgres/**` ; ajoute les tests droits admin_mairie, KPI v2 et push/SMS.
- `tests/production-ready.test.js` : détecte toute dérive entre sources et copies, tout rejeu de migration déjà appliquée, vérifie le garde-fou du script.
- Limites de cet environnement : ni PostgreSQL ni jsdom (réseau coupé) → tests Postgres, `enhance` et `a11y` exécutés par la CI GitHub ; les 29 autres fichiers de test Node passent.

## MAJ7 — fusion dépôt + zip
- Base : SAAS_MUNICIPAL_MAJ7 (plus récent). Réintégré depuis le dépôt : soldes de congés annuels (`js/maire.js` : droit, report, pris, solde, alerte solde insuffisant ; table `conges_droits`).
- Décisions Lot 7 ajoutées à DECISIONS.md. Les suppressions volontaires (mot de passe en clair, bouton supprimer compte) restent appliquées.
- À vérifier : la migration `20261123_lot7_infos.sql` (`projets_publics`, `publications.categorie`, `projets.public`) n'est pas dans `supabase/migrations/` : la retrouver avant déploiement.

## MAJ9 — Fusion dépôt + MAJ8
- Base MAJ8 conservée. Ajouts du dépôt absents du zip : règles mobiles de `css/mairie.css` (taille 16 px des champs, cibles tactiles, safe-area).
- Fichiers hérités du dépôt (patch-core, patch-lot4, lot4_block, core_patched, *_append) rangés dans `archive_legacy/depot_2026-11-21/` (ignorés au déploiement).
- Tests : tous OK sauf a11y et enhance (exigent `npm i jsdom`).
- Ajout `supabase/proposed/20261123_lot7_infos.sql` (projets_publics, publications.categorie, projets.public). Idempotent ; non appliqué en production : accord requis.

## MAJ17 — 2026-11-22 (dépôt uniquement ; production non touchée ; SMS exclu)
- Sécurité : `index.ts` racine archivé (`archive_legacy/racine_2026-11-22/`) ; `.assetsignore` en liste blanche ; CSP sans `unsafe-inline` pour les balises `<style>` (`css/citoyen.css` créé, CSS de `a11y.js` déplacé dans les 3 feuilles, `a11y.js` n'injecte plus de `<style>`) ; nouveau test `innerhtml-escape`.
- Correctif : `js/guard.js` — le bouton « Réessayer » de l'écran d'échec utilisait un `onclick` en ligne, bloqué par la CSP (inopérant) ; remplacé par un écouteur (`?v=20261122.1`). Contrôle navigateur des 3 pages sous la CSP du dépôt : 0 violation.
- Exploitation : job navigateur en CI ; sauvegarde chiffrée hebdomadaire (`db-backup.yml`, `docs/SAUVEGARDE.md`) ; `package.json`, `npm test`.
- Documentation : `TASKS.md` assaini (historique dans `docs/TASKS_HISTORIQUE_avant_MAJ17.md`) ; `docs/DEPENDANCES_EMBARQUEES.md`.
- Versions `?v=` : `citoyen.css`, `mairie.css`, `saas.css` = 20261122.1.
- Tests : 35 fichiers JS verts (jsdom installé, `a11y` et `enhance` inclus).

## MAJ18 — 2026-11-22 (accès complet ; SMS exclu)
- Production relevée (lecture seule) : toutes les migrations du dépôt sont appliquées ; Edge `sa-admin` v16 / `saas-admin` v4 déployées. Récupération de `20261121130228_org_modele_toutes_mairies.sql` et `20261121130836_nettoyage_doublon_trigger_org_seed.sql` ; `PRODUCTION_VERSION_MAP.md` et `production-ready/README.md` mis à jour.
- Production écrite (accord explicite) : migration `20261122081303_perf_fk_indexes_et_initplan_restrictives` (7 index FK, 2 policies RESTRICTIVE en `(select auth.jwt())`), vérifiée.
- Prettier appliqué à `js/*.js` (hors bibliothèques embarquées) ; `tests/_compact.js` ; contrôle `prettier --check` en CI ; 35 fichiers de test verts.
- `tests/migration-history-integrity.test.js` : 8 migrations postérieures à la capture déclarées.

## MAJ19 — 2026-11-22 (dépôt uniquement ; production lue, non modifiée ; SMS exclu)
- Production relevée : 91 migrations, tout le dépôt appliqué ; conseillers sécurité = avertissements voulus (RPC publiques, connexions anonymes, mots de passe compromis = plan Pro) ; performance : les 2 alertes « initplan » restantes (`paiements`, `org_roles`) sont des faux positifs (policies déjà en `(select auth.jwt())`).
- Conformité : `confidentialite.html` (information sur les données personnelles, loi 2008-12, CDP) liée en pied de `index.html` ; **texte général à compléter et faire valider par chaque commune**.
- En-têtes : `X-Frame-Options: DENY`, `Permissions-Policy` étendue, `COOP same-origin-allow-popups`, cache 7 jours des icônes.
- Performance : `preconnect` Supabase et polices (portail citoyen et mairie).
- Déploiement : `tests/predeploy.test.js` (ressources référencées présentes et publiées, `?v=`, icônes des manifestes) ; workflow manuel `deploy-front.yml` (tests puis `wrangler deploy`) ; `dependabot.yml` ; annulation des CI redondantes. `guard.js` versionné dans `saas.html`. CSS `citoyen.css?v=20261122.2`.
- Tests : 36 fichiers verts.
- i18n (MAJ19) : `citoyen.js` passe de 27 à 163 textes traduisibles (`tr("clé")`), transformation par analyse syntaxique (gabarits HTML et messages d’erreur uniquement) ; rendu français inchangé (36 tests verts). `scripts/i18n-export.js` réparé (cassé par Prettier) ; `docs/i18n/textes_a_valider.csv` régénéré (163 lignes). Aucune traduction wolof/sereer écrite par l’IA.
- Wolof (2026-11-22) : 163 textes fournis par Cheikhou Diop intégrés dans `js/i18n.js` (`MC_TX.wo`), langue `valide` → sélecteur Français/Wolof actif ; sérère inchangé (`a_valider`, vide, masqué). Test `i18n` mis à jour (wolof complet, aucune clé vide). 6 textes dépassent la longueur indicative (`h_dep`, `h_cur`, `u_mairie_connectee`, `u_code_incorrect_ou_expire`, `u_prenom`, `u_tout_marquer_comme_lu`) : vérifier l’affichage sur téléphone.
- i18n lot 2 (2026-11-22) : 92 textes supplémentaires traduisibles (statuts de dossier et de rendez-vous, étapes, types d’actualités/projets, messages d’erreur et de confirmation) — `citoyen.js` : tables `SL/SX/SV/RVS/RVX/PCL/PJL/ST` rendues dépendantes de la langue (`lk()`), 49 messages passés par `tr()`. Wolof : 255 textes au total, couverture 100 %. 36 tests verts. Textes encore en français : catalogue `CATS`/titres de démarches (valeurs liées à la base), phrases assemblées par concaténation. 6 textes dépassent la longueur indicative (aucun débordement constaté à 320 px).

## MAJ19 (suite) — 2026-11-22 : styles inline et garde de chargement
- `js/guard.js` : l'écran « Le chargement a échoué » est construit par le DOM (createElement, textContent, `style.cssText`), sans `innerHTML` ni attribut `style=""` ; sortie immédiate si `#app` est absent ou déjà rempli.
- `js/citoyen.js` : les 49 attributs `style=""` statiques sont remplacés par des classes `c-*` (définies à la fin de `css/citoyen.css`). Plus aucun `style=""` dans le portail citoyen.
- Versions : `citoyen.js/css ?v=20261122.3`, `guard.js ?v=20261122.2`.
- Tests : 34/36 (`a11y` et `enhance` exigent `jsdom`, non installé dans cet environnement : à lancer chez toi après `npm i`).
- Reste : ~140 `style=""` dans l'espace mairie (`core`, `adjoints`, `maire`, `secretariat`, `superadmin`, `org*`, `saas`, `demarches`, `actions`). `style-src-attr 'unsafe-inline'` doit rester dans `_headers` tant qu'ils existent.

## 2026-11-22 — Styles inline supprimés (espace mairie, SaaS)
- 316 `style=""` des modules mairie/SaaS convertis en `data-sty=""`, appliqués via CSSOM par `js/dstyle.js` (rendu identique, compatible CSP). `style-src-attr 'unsafe-inline'` retiré de `_headers`. SW `mc-v11`.
- Retour arrière si besoin : remettre ` style-src-attr 'unsafe-inline';` dans `_headers`.
