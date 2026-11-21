## Fait (2026-11-16 — porte d'entrée citoyenne)

> **Mise à jour 2026-11-19** : les scripts SQL numérotés de la racine (`20261114_…` à `20261127_…`), `patch-org.js`, `patch-orgd.js`, `js/patch-core.js`, `js/patch-lot4.js`, `js/lot4.block.js`, `js/core_patched.js` et `patched/` ont été retirés du dépôt (commits `57a9265`, `ccf33b3` ; ils restent consultables dans l'historique git). Les migrations de référence sont dans `supabase/migrations/` (voir `recovered-history-manifest.json`) ; toutes les consignes « copier / appliquer / déployer » ci-dessous sont **historiques** : le code est déployé et les migrations sont appliquées en base. Les fichiers `*.append.md` ont été consolidés dans `CHANGELOG.md`, `DECISIONS.md` et `TASKS.md`.

- Lien/QR par commune, mémorisation, manifest par commune, blason/couleur/slogan, hors-ligne, panneau « Lien citoyen » (Administration). Voir CHANGELOG.md.
- Sécurité base : droits anon retirés sur 12 tables, policy citoyens_own optimisée. Advisors sécurité : seuls restent les avertissements voulus (RPC publiques, connexions anonymes) + mots de passe compromis (plan Pro).
## À faire — action utilisateur
- Copier dans le dépôt : `citoyen.js`, `demarches.js`, `manifest-citoyen.webmanifest`, **`qr.js` dans /js/** ; lancer `node patch-core.js js/core.js` ; déployer ; vider le cache/réinstaller la PWA une fois.
- `_headers` (non fourni) : vérifier `manifest-src 'self' blob:` et `img-src` incluant `https://aiqegpijisspankpkwfj.supabase.co`.
- Espace mairie > Administration > Lien citoyen : choisir la couleur, publier le blason, imprimer l'affiche QR (par commune).
- Turnstile : ajouter mairie-connectee.callmecmd9-916.workers.dev aux domaines autorisés.
- saas-admin : secrets ALLOWED_ORIGIN et SITE_URL = https://mairie-connectee.callmecmd9-916.workers.dev.
- Sous-domaine par commune : DNS wildcard + route Cloudflare (la base résout déjà `sous_domaine`/`domaine_perso`).
- Auth : mots de passe compromis (plan Pro) ; inscriptions e-mail publiques désactivées ; limite de connexions anonymes basse.
## À décider (accord requis, non appliqué)
- Index doublon `communes_slug_key` / `communes_slug_uq` : supprimer l'un des deux.
- Fonction « bright-worker » (doublon de saas-admin) : supprimer.
- supabase/20261114_super_admin.sql périmé : remplacer par un export ou retirer.
- 33 « multiple permissive policies » : fusionner si une commune grossit.
## Plus tard
- Compteurs serveur > 10 000 lignes/table ; pagination page 0 sans tri par id.
## Fait (audits précédents)
- Audit 3 : numéro de suivi non devinable, commune fermée refusée, droits retirés, enhance.js, citoyen_id FK ON DELETE SET NULL.
- Audit 2 : fuite `communes`, pièces, SW hors-ligne, CSP, .assetsignore. Correctif actualisation KO (SW mc-v9).

## Lot 3 fait (navigation et catégories)
- À copier : `citoyen.js`, `tests/citoyen-nav.test.js`.
- Reste lot 5 : formulaires d'état civil (n° d'acte + année + nom, ou téléversement), statuts « acceptée » et « prêt à retirer » (migration SQL + libellés + notifications).
- Reste lot 6 : table `rdv_demandes` validée par le personnel ; page Suivi avec explication simple de chaque statut.
- Reste : la mairie doit saisir ses vraies démarches (Citoyens > Démarches) ; wolof/sereer : textes à fournir et valider.

## Lot 5 fait (extrait d'acte guidé, statuts retrait)
- À copier : `citoyen.js`, `core.js`, `actions.js`, `20261120_lot5_statuts_retrait.sql` (déjà en base), `tests/*`. Vider le cache/PWA une fois.
- Reste lot 6 : table `rdv_demandes` validée par le personnel + écran Rendez-vous citoyen (`creer_demande` refuse encore les types « Rendez-vous avec le Maire / Signalement / Autre demande » alors que la contrainte les autorise).
- Reste : SMS (fournisseur non choisi : connexion par téléphone indisponible, le dépôt sans compte reste actif) ; la mairie doit saisir ses démarches (Citoyens > Démarches).

## Lot 6 fait (rendez-vous)
- À faire : appliquer `20261121_lot6_rdv.sql` (Supabase), copier `citoyen.js`, `demarches.js`, `index.html`, `tests/citoyen-rdv.test.js` ; déployer ; vider le cache/PWA.
- À tester en vrai : isolation commune/commune et citoyen/citoyen sur `rdv_demandes`/`mes_rdvs` (non exécutable ici).
- Reste lot 7 (actualités, infos pratiques, accessibilité), lot 8 (tests/sécurité/doc). SMS : fournisseur non choisi.

## Lot 6 bis fait (créneaux + annulation)
- À faire : appliquer `20261122_lot6bis_creneaux.sql` (Supabase, après le lot 6) ; copier `citoyen.js`, `demarches.js`, `index.html`, `mairie.html`, `tests/*` ; déployer ; vider le cache/PWA.
- À vérifier en vrai : (1) colonnes de la table `notifications` (la notification d'annulation au personnel est protégée par un bloc d'exception : si le format diffère, l'annulation marche mais sans notification) ; (2) isolation commune/commune et citoyen/citoyen sur `creneaux_rdv`, `annuler_rdv`, `rdv_planning` ; (3) la migration échoue si des doublons « confirmé » existent déjà (index unique).
- Reste lot 7 (actualités, infos pratiques, accessibilité), lot 8 (tests/sécurité/doc). SMS : fournisseur non choisi.

## Lot 7 / 8 — à faire
- Appliquer `20261123_lot7_infos.sql` ; copier citoyen.js, core.js, actions.js, index.html ; tests ; déployer ; vider cache/PWA.
- Lancer `isolation_test.sql` dans Supabase : doit afficher « ISOLATION OK ».
- Supprimer `core_patched.js` (obsolète). Vérifier le nom `.assetsignore` (sans espace ni underscore).
- Publier les projets à afficher : espace mairie > Projets > « Visible citoyens ».
- Reste : fournisseur SMS ; saisie des vraies démarches ; wolof/sereer (textes à valider) ; installer jsdom pour `enhance.test.js`.

## Lots catalogue — à faire
- Appliquer `20261124_catalogue.sql` puis `isolation_catalogue.sql` ; déployer citoyen.js, demarches.js, index.html, mairie.html ; vider cache/PWA.
- Fimela : valider juridiquement puis activer les 24 prestations inactives ; saisir pièces, frais, délais, retrait.
- Tester sur Android réel (dialogue, clavier, défilement).


---

# Tâches consolidées des lots (ex-fichiers `*.append.md`)


## Lot C — à appliquer
- Exécuter `20261126_lot_c_rls.sql` puis `isolation_lotc.sql` (Supabase, ids réels) : attendu 0 ligne cross-commune, témoin positif vrai.
- Brancher `org_tracer()` dans les écrans personnel/rémunérations/paie à l'ouverture d'une fiche (lot D).
- Reste lot D : tableaux de bord par poste, accès non-maire à l'écran Délégations.



## Lot D — à déployer
- Copier `js/org-d.js` et `tests/org-d.test.js` ; lancer `node patch-orgd.js .` (après patch-org.js) ; vider cache/PWA ; lancer `node tests/org-d.test.js` + `smoke.js`.
- Versionner dans le dépôt : `20261125_org_rbac.sql` (lot A, encore à exporter), `20261127_lot_d.sql`.
- Reste : KPI par poste ; tracer l'ouverture de pièces confidentielles des archives (documents_consultations existe déjà) ; test d'isolation Lot C avec données réelles dans Diofior.

## Rôles admin_mairie — à faire (priorité 1, nouvelle session)
- [x] **Exécuté** (2026-11-20, reprise) `bash tests/postgres/roles-admin-mairie-integration.sh` sur PostgreSQL 16 jetable : 59/59 OK, aucun écart dans la migration `20261120100000` (le script, lui, n'était pas rejouable : corrigé).
- [ ] **Répéter** la migration sur un **clone du schéma de production** (le test actuel utilise des stubs ; voir `docs/database/SCHEMA_RECONSTRUCTION_RUNBOOK.md`) avant application.
- [ ] Après vert : **accord explicite** puis appliquer `20261119070000`, `20261119090000`, `20261120100000` (ordre), déployer `sa-admin` + `saas-admin`, puis le front.
- [ ] Via l'interface Super Admin : préparer `admindiofior@gmail.com` et `adminjoal@gmail.com` (en attente), affecter Diofior (`commune-de-diofior`), créer Joal (via `/saas`), affecter, activer.
- [ ] Fatick et Djirnda : communes inexistantes en production — noms, slugs, offre à fournir.
- [ ] Vérifier avant migration qu'aucune ligne `org_role_droits`/`org_delegations_droits` existante ne porte `org` en écriture pour un poste non voulu (les gardes ne s'appliquent qu'aux nouvelles écritures).
- [ ] Décider d'étendre ou non `admin_mairie` à `params` / journal d'audit de commune (D-R9).
- [x] Test navigateur Super Admin « Administrateurs municipaux » + `admin_mairie`/maire/agent : `tests/browser/` (53/53). Reste à tester avec les **Edge Functions réelles** (staging) et un vrai flux MFA/e-mail.
- [ ] Optionnel : ajouter `tests/browser/run.sh` à la CI (Playwright + Chromium).

## Mise à jour 2026-11-21
- Fait en production : 20261119070000 et 20261119090000 (historique cohérent, voir CHANGELOG).
- Reste, accord requis : appliquer `supabase/proposed/20261121_drop_duplicate_communes_slug_index.sql` ; supprimer la fonction `bright-worker` (déjà inerte, aucune dépendance) ; 20261120100000 après répétition sur copie fidèle du schéma (export `scripts/database/export-production-schema.sh` + PostgreSQL local/CI).
- Reste, hors capacité de cet environnement : tests navigateur et PostgreSQL réels, staging des Edge Functions (secrets ALLOWED_ORIGIN/SITE_URL, Turnstile), SMS, wolof/sereer.

## Mise à jour 2026-11-21 (MAJ5)
- Fait : icônes PNG par commune (+ neutres), chargement en deux temps, carte d'installation, push (code complet), SMS (architecture), wolof/sereer (préparation).
- Après accord, en staging puis production : republier le blason de chaque commune (« Publier le blason et les icônes ») ; appliquer `supabase/proposed/20261121_push_notifications.sql` et `…_sms_outbox.sql` ; déployer `push-send` et `sms-dispatch` ; voir docs/PUSH_NOTIFICATIONS.md et SMS_ARCHITECTURE.md.
- Impossible sans externe : clés VAPID + webhook, fournisseur SMS et son contrat, textes wolof/sereer validés, test sur appareils réels (installation PWA, push Android/iOS), Edge Functions réelles en staging.
- Toujours en attente d'accord (inchangé) : migration 20261120100000 après répétition sur schéma fidèle, index doublon `communes_slug_uq`, suppression `bright-worker`.

## Mise à jour 2026-11-21 (MAJ6)
- Fait (testé en local) : correctif `org_role_droit_set`, `org_kpi` v2, accessibilité (`a11y.js`), SQL push/SMS testés sur PostgreSQL, trigger SMS proposé.
- **Reste, accord explicite requis** (rien n'a été touché en production) : (1) appliquer `20261121090000` puis `20261121091000` ; (2) déployer `sa-admin` et `saas-admin` du dépôt (prod = anciennes versions), puis le front ; (3) suppression `bright-worker` ; (4) en staging : `push_notifications`, `sms_outbox`, `sms_triggers`, `push-send`, `sms-dispatch`.
- **Bloqué hors de cet environnement** : Edge Functions réelles (Deno/staging) et flux MFA/e-mail réels ; clés VAPID + webhook ; fournisseur SMS et contrat ; textes wolof/sérère validés ; appareils réels (PWA, push Android/iOS) ; comptes admin Diofior/Joal (via interface Super Admin) ; Fatick et Djirnda (noms, slugs, offre à fournir) ; rejouer `ia-usage-concurrency.sh` et `security-guards-integration.sh`.
