
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
