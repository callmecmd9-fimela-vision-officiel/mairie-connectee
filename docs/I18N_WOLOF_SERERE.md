# Wolof / sereer — préparation
**Aucun texte wolof ou sereer n'a été écrit par l'IA** : tout texte doit être produit/relu par un locuteur compétent.
- `js/i18n.js` : registre des langues (`wo`, `sr` = `a_valider`) et dictionnaires `MC_TX` (vides).
- `citoyen.js` : l'écran d'accueil passe par `tr(clé)` (163 clés dans `TX.fr`, MAJ19 : tous les écrans du portail citoyen — formulaires, rendez-vous, compte, notifications, messages d’erreur) ; clé absente = français.
- Un sélecteur de langue n'apparaît que si la langue est `valide` **et** traduit 100 % des clés (`langsOk()`, `tests/i18n.test.js`).
- Export pour les linguistes : `node scripts/i18n-export.js > docs/i18n/textes_a_valider.csv` (colonnes wolof, sereer, longueur max, validateur, date).
## Suite
Restent en français, hors `TX.fr` : textes composés avec des valeurs dynamiques (phrases avec nom, date, numéro) et libellés de statuts venant de la base — à traiter après la première validation. Ré-exporter le CSV après tout ajout de clé. Les modèles SMS (`lib.mjs`) ont des dictionnaires `wo`/`sr` vides au même titre. Polices : vérifier les caractères wolof (ŋ, ñ, é, ó, ë) et sereer (ƴ, ɗ, ƭ…) dans Nunito Sans.
