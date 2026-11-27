# TASKS — état au 2026-11-25

## Audit lot 2 — Budget, Conseil, Marchés, Fiscalité, Urbanisme (2026-11-27)
- [ ] Appliquer dans l'ordre `proposed/20261207_budget_conseil.sql`, `20261208_marches_fiscalite.sql`, `20261209_urbanisme.sql` (après 20261202000300 / 000900 / 000200 et 20261203000200), puis `VERIFY_ALL.sql` et les tests d'isolation.
- [ ] Régulariser l'historique avant `validate constraint` : budgets déjà votés sans DOB, présences `procuration` sans mandataire, entreprises sans NINEA, marchés AO sans références.
- [ ] Déployer `js/regles-municipales.js`, `js/urbanisme.js`, `mairie.html` et les JS modifiés ; vider le cache / PWA.
- [ ] Les écrans lot 2 dépendent des migrations : sans elles, message explicite (champs absents / table absente), aucun effet sur l'existant.

## Chantier 2 — « Mon Espace » et paiement des taxes (2026-11-26)
- [ ] **Activer le fournisseur SMS** dans Supabase (Authentication > Providers > Phone) : sans lui l'écran affiche « pas encore disponible ».
- [ ] Appliquer `supabase/migrations/20261204000100_lot18_citoyen_rpc_par_tel.sql`, puis tester : compte vérifié +221 77… → ses rôles ; autre numéro → liste vide ; `anon` → permission refusée.
- [ ] Déployer `js/citoyen.js` + `index.html` (`?v=20261204.1`), vider le cache/PWA.
- [ ] Tester en sandbox : rôle `emise` → Payer en ligne → référence + message Sandbox → encaissement guichet / webhook → rafraîchissement (quittance).
- [ ] Reste : pas de limitation de débit propre aux RPC `*_par_tel` (protégées par l'authentification SMS).

## P1 Parcours citoyen — suivi public et guichet (2026-11-25)
- [ ] **Déploiement base** : appliquer `supabase/APPLY_ALL_MIGRATIONS.sql` (001600 à 002000, une transaction), lancer `supabase/VERIFY_ALL.sql`, suivre `supabase/DEPLOYMENT_STEPS.md`, puis noter ici la date d'application. `sa-admin` : déjà v18 avec `conseiller` (aucun changement de code) ; `bright-worker` conservé (inerte, référencé dans `config.toml`).
- [ ] `20261202002000_p1_rls_demandes_guichet.sql` **proposée, non appliquée** (après 001700) : ajoute les politiques SELECT `demandes_guichet` et `demandes_historique_guichet`. Vérifier après application que l'écran Caisse (rôle finances) affiche bien les demandes en a_payer de toute la commune.
- [ ] Déployer `suivi.html`, `js/suivi.js`, `js/guichet.js`, `mairie.html` (guichet v20261125.5), `index.html`, `.assetsignore` ; vider le cache/PWA.
- [ ] **Vérifier en production que `20261202001600` à `001900` sont appliquées** (colonnes `num_suivi` / `montant_du` / `lieu_retrait`, RPC `suivi_public`, `encaisser_demande(uuid, numeric, text, text)`, `retirer_demande`). Sinon le guichet affiche « migration à appliquer ».
- [ ] **Bloquant probable pour la Caisse** : la politique RLS `demandes_personnel` (catalogue du 2026-11-19) ne laisse `finances` voir que les demandes `service = 'finances'`. Une demande déposée au guichet est routée `secretariat` / `etat_civil` / `technique` : le rôle `finances` ne la verra pas, donc Caisse vide et recherche Retrait vide pour lui. À trancher : élargir la lecture de `finances` aux statuts `a_payer` / `paye` / `pret_a_retirer` (migration à proposer) ou fournir une RPC de lecture dédiée.
- [ ] Tester : dépôt (secretariat / agent) → reçu imprimé ; `suivi.html` avec ce numéro + téléphone ; Caisse (finances) → quittance ; passage à `pret_a_retirer` (aucun écran ne le pose encore : à brancher dans le circuit de production) ; Retrait → registre.
- [ ] Décision : une demande gratuite (tarif 0) reste `depose` ; il n'existe pas encore d'écran qui la fait avancer vers `pret_a_retirer`.
- [ ] Rôle `comptable` : mentionné par la RPC mais absent de `profiles_role_check` ; onglet Caisse réservé à `finances`.
- [ ] Reste : le suivi public ne propose ni code PIN ni QR ; pas de limitation de débit côté client (la RPC ralentit les échecs de 0,5 s).

## P1 Services territoriaux — modifier / supprimer / géo / budget (2026-11-25)
- [x] `20261202001400` **appliquée en production le 2026-11-25** (PostgreSQL 17). Reste à déployer `js/services_territoire.js` + `mairie.html` (v20261205.2), vider le cache/PWA.
- [ ] Tester `maire` / `secretariat` : modifier et supprimer une infrastructure et une action ; saisir lat/long ; lier une ligne budgétaire et vérifier le détail ; `adjoint` / `technique` : le serveur autorise l'écriture, l'interface non (périmètre boutons maire / secrétariat à confirmer).
- [ ] À vérifier : lecture de `budget_lignes` par `secretariat` (sinon la liste déroulante est vide et le détail affiche « introuvable ou non accessible »).
- [ ] Reste : lien avec les marchés ; pas de carte intégrée.

## P1 Patrimoine — modifier / supprimer / détail / entretiens (2026-11-25)
- [x] `20261202001300` **appliquée en production le 2026-11-25**. Reste à déployer `js/patrimoine.js` + `mairie.html` (v20261125.2), vider le cache/PWA.
- [ ] Tester avec `maire` / `secretariat` / `technique` : modifier un bien ; supprimer un bien sans entretien (OK) et avec entretien (message FK) ; Détail > Ajouter un entretien ; `adjoint` / `finances` : lecture seule, aucun bouton.
- [ ] Reste : pas de modification / annulation d'un entretien dans l'interface (statut `annule` possible seulement en base) ; pas de carte intégrée (lien OpenStreetMap) ; `patrimoine_inventaires` sans écran.

## P1 Gouvernance — RPC de clôture (2026-11-25)
- [x] Migrations `20261202001000`, `001100` et `001200` **appliquées en production le 2026-11-25** (000900 y était déjà). Reste à déployer `js/deliberations.js` + `mairie.html` (v20261125.4), vider le cache/PWA.
- [ ] Tester : compte `maire` → « Clôturer le vote » (adoptée / rejetée / aucun vote refusé) ; compte non maire → 42501 ; 2e clôture → 55000 « vote clos » ; vérifier la trace `audit_log` de la mise à jour.
- [x] Propriétaire de `cloturer_deliberation` vérifié : `postgres`.
- [x] Edge Function `sa-admin` **redéployée en production le 2026-11-25** (version 18, `verify_jwt` = true ; seul changement : `conseiller` dans `ROLES`).
- [ ] Reste hors périmètre : `js/actions.js` (~l. 944) insère encore une délibération directement en `adoptee` (refusé par le trigger) ; voix prépondérante du maire en cas d'égalité non gérée (égalité = rejetée).

## P1 Gouvernance — clôture du vote et PV (2026-11-25)
- [ ] Déployer `js/deliberations.js` + `mairie.html` (v20261125.3), vider le cache/PWA ; tester avec le compte `maire` : vote(s) puis « Clôturer le vote » (adoptée si Pour > Contre, rejetée sinon ; refus si aucun vote) ; « Imprimer le Procès-Verbal » (maire et secrétariat).
- [x] ~~Bloquant avec `20261202000900`~~ : traité par la RPC `cloturer_deliberation` (migration `20261202001200`) ; l'`UPDATE` direct a été retiré de `clore()`.
- [ ] Le PV n'indique pas le détail nominatif des votes ni le nom du maire ; ajouter si exigé réglementairement. Règle d'égalité (Contre ≥ Pour = rejetée) : à confirmer, la voix prépondérante du maire n'est pas gérée.

## P1 Gouvernance — vote des conseillers (2026-11-25)
- [x] `20261202001100` appliquée en production. Reste : **redéployer** l'Edge Function `sa-admin` (rôle `conseiller` autorisé), puis déployer `js/core.js` + `js/deliberations.js` + `mairie.html` (vider le cache/PWA).
- [ ] Tester : compte `conseiller` lié à une fiche → connexion, lecture des délibérations, vote sur un projet ; refus du 2e vote (23505) ; vote clos dès que le statut n'est plus `projet`.
- [ ] À vérifier : menu du rôle `conseiller` (entrée « Suivi des sessions » sous Conseil municipal : `RP.suiviconseil` ne liste pas encore `conseiller`, l'écran s'ouvre via `VOTANTS`) ; si le menu reste vide pour ce rôle, ajouter `conseiller` à la navigation.
- [ ] Reste à faire : une RPC d'adoption / de rejet (aujourd'hui `adoptee` / `rejetee` ne peuvent être posés que par SECURITY DEFINER, cf. trigger `000900`) ; `js/actions.js` (~l. 944) insère encore directement en `adoptee`.
- [ ] Résorber le rapprochement par e-mail (`conseillers.contact`) : il ne sert plus que de dernier recours pour le maire ; adjoints et conseillers doivent avoir `user_id` renseigné (la RLS l'exige).

### Procédure : création d'un conseiller (Super Admin)
1. Créer le compte (console Super Admin → `sa-admin`, rôle « Conseiller municipal ») avec l'e-mail du conseiller, rattaché à sa commune.
2. Vérifier `profiles` : `id` = id du compte, `commune_id` = sa commune, `role` = `conseiller` (ou `adjoint` pour un adjoint votant), `actif` = true.
3. Créer ou retrouver sa fiche dans `conseillers` (même `commune_id`, `actif` = true) puis la lier : `UPDATE public.conseillers SET user_id = '<auth.users.id>' WHERE id = '<fiche>' AND commune_id = '<commune>';` (un compte = une fiche par commune : index unique).
4. Contrôle : connecté en tant que conseiller, ouvrir une délibération au statut « Projet » → les boutons de vote sont actifs.
5. Départ d'un conseiller : `actif = false` sur la fiche (le trigger refuse alors le vote) ; désactiver aussi le compte.

## P1 Marchés — détail, avenants, ordres de service (2026-11-25)
- [ ] Déployer `js/marches.js` + `mairie.html` (v20261125.4), vider le cache/PWA, puis tester : Administration > Marchés en cours > Détail ; ajout d'un avenant et d'un ordre de service avec un compte `maire` ou `finances` ; vérifier que `secretariat` voit les listes sans les boutons.
- [ ] Non géré (volontaire) : modification / annulation d'un avenant ou d'un ordre de service depuis l'interface (la RLS UPDATE existe ; le DELETE est révoqué).
- [ ] Les marchés réceptionnés ou annulés n'apparaissent pas dans cet écran, donc leur détail n'est pas accessible ici.

## P1 Budget — engagements (2026-11-25)
- [x] `20261202001000_p1_rls_engagements_secretariat.sql` appliquée en production (2026-11-25). Reste à déployer `js/budget.js` + `mairie.html`.
- [ ] Décision à prendre : `secretariat` ne peut ni ouvrir l'écran Budgets (`RP.budgets` = maire, adjoint, finances) ni lire `budget_lignes` / `engagements` (politiques `*_lecture`). Pour qu'il utilise réellement « Nouvel engagement », étendre `RP.budgets` et les politiques de lecture, ou lui fournir une RPC dédiée.
- [ ] Le trigger proposé `20261202000900` rend les budgets `vote`/`approuve`/`cloture` immuables mais ne couvre pas `engagements` : prévoir un contrôle côté base du crédit disponible (le refus actuel est côté client uniquement).

## Audit P0/P1 — 2026-11-25 (machines à états, CI, thème)
- [ ] `20261202000900` est déjà en production : traiter encore ces écrans qui l'enfreignent : créer la RPC de vote/adoption des délibérations et adapter `js/actions.js` (ligne ~944), qui insère directement en `adoptee` (`js/deliberations.js` est corrigé : création toujours en `projet`) ; vérifier les écrans marchés (`js/maire.js`, `js/marches.js`) qui changent le statut librement ; prévoir la RPC de transition des budgets.
- [ ] Non couverts par ces triggers : suppression (DELETE) sur `budgets`, `marches`, `deliberations`, et modification des `budget_lignes` d'un budget voté.
- [ ] CI : `npm test` échoue désormais si un test est `SKIP` (jsdom absent) : lancer `npm ci` avant `npm test` ; 2 fichiers de test étaient concernés en local.
- [x] `css/citoyen-dark.css` régénéré (`node scripts/gen-dark-theme.js`), contrôle `--check` réactivé.

## MAJ25 — 2026-11-24 (Lots 1 à 8)
- [x] Lots 1 à 7 livrés (sécurité, catalogue, état civil/PDF, circuits, WhatsApp, fiscalité) ; Lot 8 : QA, RLS, documentation, livraison.
- [x] SQL appliqué en production : `20261125_demarches_paiements_quittances`, `20261129_lot7_portail_fiscal` (confirmé par l'utilisateur).
- [ ] **Appliquer** `supabase/proposed/20261128_lot6_notifications.sql` si ce n'est pas fait (sinon le bouton WhatsApp échoue : « Trace impossible »).
- [ ] **Appliquer** `supabase/proposed/20261130_lot8_paiements_rls_durcissement.sql` (statut initial obligatoire sur `paiements_taxes`).
- [ ] WhatsApp : lancer WAHA (`WAHA_API_URL` dans `js/notifications.js`), scanner le QR de la session « default » ; en production, passer par une Edge Function (aucune clé dans le navigateur) ou l'API Meta.
- [ ] Paiement en ligne : la simulation est à remplacer par Wave / Orange Money réels (confirmation serveur, jamais côté navigateur).
- [ ] Corriger les 2 tests `citoyen-etatcivil` (widget anti-spam) — préexistants.

L'historique complet (consignes « copier / appliquer » des lots 3 à 8, audits, mises à jour MAJ5–MAJ6) est conservé tel quel dans `docs/TASKS_HISTORIQUE_avant_MAJ17.md`.

## Fait en MAJ17 (dépôt uniquement — rien en production)
- [x] `index.ts` racine (ancienne copie de `sa-admin`, repli CORS `*`) archivé dans `archive_legacy/racine_2026-11-22/`.
- [x] Publication Cloudflare en **liste blanche** (`.assetsignore` : tout exclu sauf pages, `css/`, `js/`, icônes, manifestes, `sw.js`, `_headers`) — D-A1.
- [x] CSP : `style-src` sans `'unsafe-inline'` pour les balises `<style>` (le CSS de `index.html` est dans `css/citoyen.css`, celui de `a11y.js` dans les 3 feuilles) ; `style-src-attr 'unsafe-inline'` conservé (attributs `style="…"` encore nombreux) — D-A2.
- [x] Test statique `tests/innerhtml-escape.test.js` (aucun champ de texte libre inséré sans `esc()`, 1435 interpolations analysées, 0 écart).
- [x] `guard.js` : bouton « Réessayer » rendu fonctionnel sous la CSP (onclick en ligne retiré).
- [x] `purge-pieces` relu : secret vérifié côté base par la RPC `pieces_orphelines` (aucun changement nécessaire).
- [x] CI : job navigateur (Playwright) ajouté à `postgres-concurrency.yml` ; les tests PostgreSQL (dont `ia-usage-concurrency` et `security-guards`) y étaient déjà.
- [x] Sauvegarde chiffrée hebdomadaire `db-backup.yml` + `docs/SAUVEGARDE.md` (secrets à créer, voir ci-dessous).
- [x] `package.json` (`npm test`, jsdom), `scripts/run-js-tests.js` ; versions des bibliothèques embarquées notées (`docs/DEPENDANCES_EMBARQUEES.md`).
- [x] `TASKS.md` assaini (historique déplacé).

## Fait en MAJ18 (2026-11-22, accès complet accordé ; SMS exclu)
- [x] **Production relevée en lecture seule** : les 8 migrations « à appliquer » (dont `20261120100000`, KPI v2, `admin_mairie_perimetre`, push/SMS) étaient **déjà appliquées** ; `sa-admin` v16 et `saas-admin` v4 déjà déployées. Le ZIP MAJ16 était en retard. Deux migrations de production absentes du dépôt ont été récupérées (`org_modele_toutes_mairies`, `nettoyage_doublon_trigger_org_seed`).
- [x] **Appliqué en production** (accord explicite, retour arrière dans le fichier) : `20261122081303_perf_fk_indexes_et_initplan_restrictives` — 7 index de clés étrangères et 2 policies RESTRICTIVE évaluées une seule fois. Vérifié (index et policies présents).
- [x] **Formatage Prettier** du JS applicatif (`npm run format`, contrôlé en CI) ; les tests lisent le code via `tests/_compact.js` (indépendants de la mise en forme) — D-A3.
- [x] Conseillers Supabase relus : sécurité = uniquement les avertissements voulus (RPC publiques, connexions anonymes, mots de passe compromis = plan Pro) ; performance : initplan et index FK traités.

## Fait en MAJ19 (2026-11-22)
- [x] Page `confidentialite.html`, en-têtes renforcés, preconnect, test pré-déploiement, workflow `deploy-front.yml`, dependabot (voir CHANGELOG).

## Fait en MAJ22 (2026-11-23)
- [x] Admins de mairie (Djirnda, Diofior, Joal, Fatick, Fimela + futurs) : interface « Administration Système » de leur commune, MFA TOTP obligatoire.
- [x] Dépôt et zip synchronisés.

## Fait en MAJ23 (2026-11-23)
- [x] Bouton « Voir sur la carte » sur le portail citoyen (6 communes) ; activation d'un e-mail non confirmé par le super admin.

## À faire — action utilisateur
- [ ] Chaque admin de mairie : se connecter et enrôler son application d'authentification (aucun facteur vérifié à ce jour pour les 5 comptes).
- [ ] Tester à la main : créer puis activer un admin de test depuis `/saas`, vérifier rôle, enrôlement TOTP et accès à sa seule commune.
- [ ] Wolof (255 textes, statut a_verifier) : relecture par un second locuteur.
- [ ] Wolof : tester sur téléphone (6 textes longs) et faire relire par un second locuteur ; sérère : trouver un traducteur (même CSV, colonne `sereer`).
- [ ] Faire valider/compléter `confidentialite.html` (responsable, durées, déclaration CDP) ; secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` pour `deploy-front.yml` (sinon `wrangler deploy` manuel).
- [ ] Supabase > Auth : activer la protection contre mots de passe compromis (plan Pro).
- [ ] **Déployer le front** (`wrangler deploy` : aucune API de déploiement Cloudflare n'est disponible ici) puis vider le cache/PWA une fois : CSS de `index.html` déplacé, JS reformaté, `.assetsignore` en liste blanche.
- [ ] GitHub > Settings > Secrets : `SUPABASE_DB_URL` et `BACKUP_PASSPHRASE`, lancer une fois « Sauvegarde chiffrée », vérifier une restauration (`docs/SAUVEGARDE.md`). Dépôt **privé**.
- [ ] Comptes admin Diofior/Joal via l'interface Super Admin ; Fatick et Djirnda (noms, slugs, offre) ; clés VAPID + déploiement `push-send` ; textes wolof/sérère ; vraies démarches ; tests sur appareils réels.
- [ ] Suppression de `bright-worker` (inerte) : à faire depuis le tableau de bord Supabase (aucun outil de suppression de fonction ici) — décision D-A6.

## Reporté, avec raison
- [ ] Attributs `style="…"` (~190) → classes CSS : conversion automatique non sûre sans test visuel (priorité de l'inline sur les classes, valeurs dynamiques `${…}`) ; à faire par écran avec captures — D-A2.
- [ ] Fusion des 56 « multiple permissive policies » : tables de quelques dizaines de lignes, gain nul aujourd'hui, risque de régression d'accès élevé ; à revoir si une commune grossit.
- [ ] Mise à jour de `supabase-js` 2.45.4 et Leaflet 1.9.4 : exige un staging (le projet `fimela-vision-audit-test` est vide : 3 migrations de test seulement, pas un clone).
- [ ] Répétition sur clone fidèle : sans objet pour les migrations déjà appliquées ; à utiliser pour les prochaines.

## Hors périmètre (demandé : sauf SMS)
- SMS (fournisseur, contrat, `sms-dispatch`, `sms_outbox`, déclencheurs) : non touché.
- Dépendent de toi : clés VAPID, textes wolof/sérère validés, vraies démarches (24 prestations Fimela inactives), Fatick et Djirnda (noms, slugs, offre), tests sur appareils réels.

## À faire (MAJ19 suite)
- Lancer `npm i && npm test` chez toi (jsdom) : attendu 36/36.
- Vérifier à la main : bloquer un script dans les outils de développement, l'écran « Le chargement a échoué » + « Réessayer » doit s'afficher.
- Convertir les `style=""` restants de l'espace mairie / SaaS, puis retirer `style-src-attr 'unsafe-inline'`.
- Déployer (`wrangler deploy`) puis vider le cache de l'application une fois.
## 2026-11-22
- Fait : plus aucun `style=""` dans le code ; `style-src-attr` retiré. Tests 36/36.
- À faire après déploiement : vider le cache PWA une fois ; vérifier visuellement /mairie et /saas.

## MAJ24 — 2026-11-23
- [x] Photo d'agent + badge imprimable (admin mairie) : code, CSS, tests, doc (`docs/BADGE_AGENT.md`).
- [x] Migration `supabase/proposed/20261123_agent_photo_badge.sql` appliquée en production (version 20261123125215).
- [ ] **À faire** : déployer le front (`js/org-f.js`, `css/mairie.css`, `css/mairie-dark.css`, `mairie.html`).
