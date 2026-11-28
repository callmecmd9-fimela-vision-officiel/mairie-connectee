# Registre des traitements de données personnelles

Cadre : loi sénégalaise n° 2008-12 du 25 janvier 2008. Le **responsable du traitement** est chaque commune ; la plateforme Mairie Connectée (Fimela Vision) est son prestataire technique. Chaque commune complète et valide ce registre (coordonnées du responsable, référence de déclaration à la CDP).

Les durées ci-dessous sont les **valeurs par défaut** de la table `durees_conservation` (modifiables par migration, à valider par chaque commune). La purge `private.purge_donnees_expirees()` s'exécute chaque nuit (pg_cron, job `purge-conservation`, 03 h 45).

| Traitement | Finalité | Base légale | Destinataires | Durée de conservation |
|---|---|---|---|---|
| Demandes citoyennes (nom, contact, objet, message, pièces) | Instruire la demande, informer de son avancement, délivrer le document | Mission d’intérêt public de la commune ; consentement recueilli avant le dépôt | Agents habilités de la commune concernée (isolation par `commune_id`) ; Supabase (hébergement) | En cours : jusqu’à clôture. Clôturée : **60 mois** (`demande_cloturee`), puis nom, contact et pièces sont anonymisés ; numéro et statut conservés |
| Compte citoyen (e-mail, téléphone vérifié, nom, prénom, village) | Retrouver ses demandes et notifications sur tous ses appareils | Consentement (création volontaire du compte) | La commune ; Supabase ; fournisseur SMS pour le code de connexion | Jusqu’à suppression par la personne (`supprimer_mes_donnees`) |
| Notifications citoyen | Informer des changements de statut d’une demande | Mission d’intérêt public ; exécution du service demandé | La personne concernée | **12 mois** (`notification_citoyen`) |
| Consentements (commune, finalité, version du texte, accordé ou refusé, date) | Prouver le consentement avant dépôt | Obligation de rendre compte (preuve) | Maire et admin de la commune concernée (lecture) ; la personne (lecture des siens) | **60 mois** (`consentement`) ; à la suppression du compte ou à la purge des sessions anonymes (2 jours), l’identifiant est effacé (`user_id` = NULL) et seule la preuve sans identité subsiste |
| Suivi sans compte (session anonyme, jeton de suivi avec téléphone haché) | Suivre un dossier sans compte | Consentement | La commune ; Supabase | Session anonyme : 2 jours ; jeton : supprimé à l’anonymisation de la demande clôturée |
| Pièces jointes (stockage `pieces`) | Instruire la demande | Mission d’intérêt public | Agents habilités de la commune | Supprimées du stockage par la purge hebdomadaire existante (`purge-pieces`) dès qu’elles ne sont plus rattachées à une demande (après anonymisation) |
| Journaux de sécurité (connexions, anti-robot Turnstile) | Sécurité du service | Intérêt légitime de sécurité | Prestataires techniques (Supabase, Cloudflare) | Selon la politique des prestataires ; aucune donnée personnelle dans les URL ni les journaux applicatifs |

## Exercice des droits (accès, portabilité, effacement)

- **Accès / portabilité** : RPC `exporter_mes_donnees()` — JSON du profil, des demandes, des notifications (et des consentements) du compte connecté.
- **Effacement** : RPC `supprimer_mes_donnees()` — anonymise nom, contact et pièces des demandes **clôturées**, supprime le compte, conserve numéros et statuts. Les demandes **encore en cours** sont détachées du compte mais gardent nom et contact jusqu’à leur clôture ; elles sont ensuite anonymisées par la purge à l’échéance.
- Les sessions anonymes (suivi sans compte) ne peuvent ni exporter ni supprimer : elles expirent d’elles-mêmes.

## Limites connues (hors périmètre de cette livraison)

- Le registre des retraits (`registre_retraits`, nom et CNI du retirant) est une trace d’audit immuable : non modifié ici, durée à fixer par la commune.
- Les rendez-vous (`rdv_demandes`), les paiements de taxes et le signalement citoyen ne sont pas couverts par l’export ni l’anonymisation (à traiter séparément).
- La page `confidentialite.html` reste le texte général ; la commune y renseigne durées et coordonnées du responsable. Si le texte de consentement change, incrémenter `CONS_VERSION` dans `js/citoyen.js`.
