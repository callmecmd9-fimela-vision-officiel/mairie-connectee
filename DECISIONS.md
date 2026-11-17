# DECISIONS

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
