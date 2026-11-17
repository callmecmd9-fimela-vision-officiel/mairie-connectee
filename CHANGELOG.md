# CHANGELOG

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
