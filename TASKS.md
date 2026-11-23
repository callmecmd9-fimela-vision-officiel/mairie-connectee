# TASKS — état au 2026-11-22 (MAJ18)

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
