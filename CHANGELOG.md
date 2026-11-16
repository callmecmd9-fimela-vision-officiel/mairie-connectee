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
