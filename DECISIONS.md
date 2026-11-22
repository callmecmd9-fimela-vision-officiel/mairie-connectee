# DECISIONS

> **Mise à jour 2026-11-19** : les scripts SQL numérotés de la racine (`20261114_…` à `20261127_…`), `patch-org.js`, `patch-orgd.js`, `js/patch-core.js`, `js/patch-lot4.js`, `js/lot4.block.js`, `js/core_patched.js` et `patched/` ont été retirés du dépôt (commits `57a9265`, `ccf33b3` ; ils restent consultables dans l'historique git). Les migrations de référence sont dans `supabase/migrations/` (voir `recovered-history-manifest.json`) ; toutes les consignes « copier / appliquer / déployer » ci-dessous sont **historiques** : le code est déployé et les migrations sont appliquées en base. Les fichiers `*.append.md` ont été consolidés dans `CHANGELOG.md`, `DECISIONS.md` et `TASKS.md`.


- **Pas de liste de communes côté citoyen** (fuite audit 2) : résolution par lien/QR, mémorisation, sous-domaine ; saisie de code masquée dans un `<details>`.
- **Manifest dynamique côté client (blob)** plutôt qu'un Worker : aucun changement de déploiement. Si la CSP bloque `blob:` en `manifest-src`, repli automatique sur le manifest statique.
- **Blason public** : bucket `identite` dédié (public, 300 Ko, images seulement) ; le bucket `medias` reste privé. Publication par bouton (copie), pas de duplication automatique.
- **Couleur** : refusée côté citoyen si trop claire (texte blanc illisible).
- **QR hébergé** (`/js/qr.js`) : pas de CDN, compatible CSP `script-src 'self'`.
- **Droits anon retirés** sur 12 tables internes : défense en profondeur ; seules les RPC publiques restent exécutables par anon.
- **Non fait volontairement** : chargement de `core.js load()` en deux temps (risque de régression sur les vues qui lisent adjoints/projets) ; fusion des policies permissives ; suppression de l'index doublon et de `bright-worker` (accord requis).
- **Non audités** (absents des docs du Project) : `index.html`, `mairie.html`, `_headers`, CSS citoyen, `supabase.js` côté fichiers HTML.
- **Raccourcis en mots simples = demandes libres préremplies** (pas de démarche inventée) ; les vraies démarches viennent de la table `demarches` de la mairie.
- **Rubrique sans démarche ni raccourci : formulaire direct** (pas d'écran intermédiaire inutile).
- **Langues** : `TX.fr` est la référence ; wolof et sereer ajoutés seulement avec des textes validés par un locuteur.
- **Extrait = demande guidée, pas de message libre** : le message est composé (n° acte, année, nom) et lisible par le personnel ; aucune colonne ajoutée.
- **« Accepter » ouvert à tout le personnel** (le service valide) ; « prêt à retirer » imposé après acceptation côté serveur ; clôture finale toujours réservée maire/adjoint.
- **orientee = « Transmise au service »**, a_valider = « En cours de vérification » (aligné sur les notifications existantes).
- **Rendez-vous** : le citoyen propose une date, le service fixe date+heure (pas de table de disponibilités inventée). Services proposés : secrétariat, Maire, état civil, technique, finances.
- La rubrique « Audiences et rendez-vous » ouvre l’écran rendez-vous ; les démarches « Audience » configurées restent trouvables via la recherche.
- Pas d’annulation par le citoyen à ce stade (reporté).
- **Créneaux (lot 6 bis)** : jamais inventés. Calculés côté serveur depuis un planning saisi par la mairie (`rdv_planning`) ; sans planning actif, le citoyen propose seulement une date (comportement du lot 6). Conflit = un seul rendez-vous *confirmé* par service/jour/heure ; plusieurs demandes en attente sur la même heure restent possibles, le personnel arbitre.
- **Annulation par le citoyen** : par numéro non devinable (même modèle de confiance que le suivi) ; seulement « en attente » ou « confirmé » et à venir ; le créneau est libéré. Pause déjeuner Fimela retenue : 12h30-14h (à corriger dans l'espace mairie si différent).

- **Projets visibles aux citoyens seulement si la mairie les publie** (`projets.public`, défaut false).
- **Catégories d'info** = colonne `publications.categorie`, pas de nouvelles tables.
- **Navigation** : 5 entrées de la spécification ; « Travaux et projets » est une section de l'accueil, pas un lien de menu.
- **Catalogue** : prestations non confirmées insérées inactives, la mairie les active après vérification de sa compétence ; archivage au lieu de suppression ; frais, pièces et délais jamais préremplis.


---

# Décisions consolidées des lots (ex-fichiers `*.append.md`)


- **Projets visibles aux citoyens seulement si la mairie les publie** (`projets.public`, défaut false).
- **Catégories d'info** = colonne `publications.categorie`, pas de nouvelles tables.
- **Navigation** : 5 entrées de la spécification ; « Travaux et projets » est une section de l'accueil, pas un lien de menu.



- Lot C : RLS `org_droit` toujours additive (nouvelle policy permissive en OR avec l'existant), jamais en remplacement — élimine le risque de régression sur les accès legacy par rôle.
- Documents confidentiels : `org_droit('archives',...)` ne débloque que le non-confidentiel ; le confidentiel reste exclusivement maire/secrétariat via la policy historique, intacte.
- Traçabilité sensible centralisée dans `acces_sensibles` plutôt qu'une table de log par module (évite la prolifération de tables).



## Lot D
- Traçabilité au niveau de l'écran (pas de la fiche) : aucune fiche individuelle n'est ouverte séparément aujourd'hui ; la colonne `cible` reste disponible.
- « Mon poste » / « Mes délégations » placés dans Administration (schéma de menu existant, aucune nouvelle structure) ; invisibles au maire et sans poste/délégation.
- Les menus suivent les délégations reçues ; le serveur revérifie à chaque requête (org_droit_user vérifie aussi que le délégant détient encore le droit).
- Hors périmètre : tableaux de bord KPI propres à chaque poste (seul « Mon poste » : postes, écrans, délégations, demandes du service).




## Rôles : séparation Super Admin / admin_mairie / maire (2026-11-20, validée par l'utilisateur)
- **D-R1** Nouveau rôle `profiles.role='admin_mairie'` : administration technique de SA commune uniquement (module `org`, services, postes, affectations). Aucun droit métier, jamais affectable à un poste.
- **D-R2** Le `maire` garde supervision, validations, signatures, délégations métier ; il perd l'écriture sur le module `org` (`org_gest`, `org_droit_propre`). Aucun privilège automatique d'administration technique.
- **D-R3** Seule la plateforme (Super Admin AAL2) crée, affecte, active, suspend un `admin_mairie`. Aucun admin ne modifie son propre rôle/commune/statut.
- **D-R4** Création anticipée : compte Auth **existant** réutilisé (aucun doublon/suppression/changement d'identifiants/mot de passe). Statuts dérivés par trigger : `en_attente` (sans commune, aucun droit) → `affecte` → `actif` ↔ `suspendu`.
- **D-R5** Gardes en **triggers additifs** (aucune réécriture des fonctions opérationnelles) ; les appels système (service_role, migrations, inscription Auth) passent.
- **D-R6** `saas_creer_commune` crée un `admin_mairie` inactif (et non plus un `maire`) ; le maire est attribué ensuite via `admin_attribuer`.
- **D-R7** Le compte maire actuel de Diofior n'est ni modifié ni désigné `admin_principal`.
- **D-R8** Droits réservés = module `org` en écriture (`creer/modifier/supprimer/administrer`) : jamais accordables à un poste ni délégables par un acteur municipal.
- **D-R9** `params` reste au maire (contenu public de la commune) : hors périmètre `admin_mairie` (extension possible ultérieure).
- **D-R10** Aucun test d'expérimentation en production, même transaction annulée : base PostgreSQL jetable uniquement.
- **D-R11** Stratégie de test (reprise 2026-11-20) : Docker indisponible (registre bloqué) → PostgreSQL 16 local jetable, socket Unix seule. Schéma simulé par stubs ; Edge `sa-admin` émulée dans le test navigateur. Ces tests ne remplacent pas une répétition sur clone du schéma réel ni un test des Edge Functions déployées en staging.
- **D-R12** Le bouton « Modifier » des postes (Organigramme) est réservé à `admin_mairie` ; le maire voit l'organigramme sans affordance inerte.

## Session 2026-11-21 (MAJ3)
- Appliquées en production : security_null_mfa_guards, ia_usage_atomic_reservations (historique cohérent). Non appliquées : 20261120100000 (répétition requise) et suppression de l index doublon communes_slug_uq (proposée dans supabase/proposed/, accord requis). bright-worker : inerte, suppression soumise à accord.
- Edge Functions déployées = sources du dépôt (saas-admin v3, sa-admin v15, admin-comptes v10, bright-worker v4, purge-pieces v2, ia-texte v9).
- Décision : toute suppression de ressource et toute migration fonctionnelle de production restent soumises à autorisation explicite ; ZIP de référence : SAAS_MUNICIPAL_MAJ4.zip.

## D-M5 (2026-11-21) — Icônes, push, SMS, langues
- D-M5-1 Icônes générées **côté navigateur** par la mairie et stockées en public (aucune migration, aucun serveur d'images) ; neutres par défaut, jamais le blason d'une autre commune.
- D-M5-2 Push : webhook DB → Edge Function (pas de trigger SQL : le secret ne vit pas en base) ; charge utile minimale ; désactivé tant que la clé VAPID publique est vide.
- D-M5-3 SMS : file + adaptateurs, fail-closed, désactivé par commune par défaut ; aucun fournisseur imposé ; corps issus de modèles uniquement.
- D-M5-4 Langues : aucune traduction non validée n'est jamais affichée (statut + 100 % de couverture exigés).
- D-M5-5 Les SQL push/SMS restent dans `supabase/proposed/` (hors historique de migrations) : application sur accord explicite après staging.

## MAJ6 (2026-11-21)
- D-R13 : `admin_mairie` (actif, de la commune) peut accorder tout droit métier aux rôles de sa commune ; la limite « droits que l'on détient » ne s'applique plus qu'aux autres appelants. Les écritures `org` restent interdites par trigger. (Auparavant l'anomalie bloquait toute attribution.)
- D-K1 : `org_kpi` reste SECURITY INVOKER (RLS métier appliquée) ; seule la structure organisationnelle passe par un helper DEFINER limité à la commune de l'appelant. Pour `admin_mairie`, métier = null (« — »).
- D-S1 : SMS automatiques en français seulement, opt-in par commune, jamais bloquants ; wolof/sérère après validation.
- D-V1 : les versions de migration de production (horodatage d'application) diffèrent des noms de fichiers du dépôt ; correspondance dans `supabase/PRODUCTION_VERSION_MAP.md`. Ne pas renommer ni rejouer.

- **Projets visibles aux citoyens seulement si la mairie les publie** (`projets.public`, défaut false).
- **Catégories d'info** = colonne `publications.categorie`, pas de nouvelles tables.
- **Navigation** : 5 entrées de la spécification ; « Travaux et projets » est une section de l'accueil, pas un lien de menu.

- **Projets visibles aux citoyens seulement si la mairie les publie** (`projets.public`, défaut false).
- **Catégories d'info** = colonne `publications.categorie`, pas de nouvelles tables.
- **Navigation** : 5 entrées de la spécification ; « Travaux et projets » est une section de l'accueil, pas un lien de menu.

- D-A1 (2026-11-22) : publication Cloudflare par **liste blanche** (`/*` exclu puis `!` pour pages, `css/`, `js/`, icônes, manifestes, `sw.js`, `_headers`) plutôt que déplacement dans `public/` : même garantie (un nouveau fichier n'est pas publié par défaut), sans réécrire les chemins de 33 tests. Vérifié avec la bibliothèque `ignore` utilisée par wrangler : 47 fichiers publiés sur 257.
- D-A2 : CSP `style-src 'self' fonts.googleapis.com` (plus de `<style>` ni de style injecté) ; `style-src-attr 'unsafe-inline'` conservé car ~190 attributs `style="…"` existent dans le JS. Un `<style>` injecté par XSS est désormais bloqué.
- D-A3 : formatage Prettier non appliqué : 6 tests dépendent de la forme compacte du code. Lot dédié à prévoir (tests d'abord).
- D-A4 : sauvegarde = `pg_dump` (schémas `public` et `auth`) chiffré gpg, en artefact GitHub 30 jours ; Storage non inclus.
- D-A5 : `purge-pieces` garde `verify_jwt=false` : l'accès est contrôlé par le secret du coffre vérifié dans la RPC `pieces_orphelines` (403 sinon).

- D-A3 (révisé 2026-11-22) : formatage Prettier appliqué (`arrowParens: avoid`, `trailingComma: none`, largeur 140). Les tests qui lisent le code par expressions régulières passent par `tests/_compact.js` (forme compacte stable) ; ceux qui exécutent le code (vm, jsdom) lisent le source brut. Bibliothèques embarquées et `sw.js` exclues.
- D-A6 : `bright-worker` conservé (aucun outil de suppression de fonction Edge disponible ; inerte). Suppression à faire par l'utilisateur dans le tableau de bord.
- D-A7 : performance en production limitée aux correctifs sans effet fonctionnel (index FK, `(select auth.jwt())`). Les 56 politiques permissives multiples ne sont pas fusionnées (risque d'accès > gain).

## MAJ19 — 2026-11-22
- D-B1 : page de confidentialité statique (aucune modification de `citoyen.js`) ; texte général, chaque commune complète responsable, durées, référence CDP.
- D-B2 : aucune écriture en production (rien de nécessaire) ; faux positifs initplan documentés, pas de migration.
- D-B3 : déploiement du front par workflow manuel avec tests préalables ; le déploiement lui-même exige les secrets Cloudflare (action utilisateur).
- D-B4 (2026-11-22) : mise en service Français + Wolof à la demande du propriétaire ; le CSV source porte le statut `a_verifier` : une relecture par un second locuteur wolof reste recommandée. Sérère : en attente d’un traducteur.

- **Styles inline (MAJ19)** : on convertit le portail citoyen d'abord (classes `c-*`) ; `style-src-attr 'unsafe-inline'` n'est retiré qu'une fois l'espace mairie et le SaaS convertis. Le style dynamique (couleur de commune) passe par `documentElement.style.setProperty` (CSSOM, autorisé).
- **Styles dynamiques/statiques mairie+SaaS : `data-sty` + CSSOM** (`js/dstyle.js`) plutôt que des centaines de classes : aucun risque de spécificité CSS, rendu strictement identique.
