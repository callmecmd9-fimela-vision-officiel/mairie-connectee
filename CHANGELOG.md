# CHANGELOG

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
