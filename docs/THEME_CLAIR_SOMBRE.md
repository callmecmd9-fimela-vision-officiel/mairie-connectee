# Thème clair / sombre

## Utilisation
Un bouton rond (soleil / lune) en bas à droite de chaque espace (citoyen, mairie, super-administrateur) bascule entre les deux modes.
- Sans choix de l'utilisateur, l'affichage suit le réglage de son appareil (`prefers-color-scheme`), y compris en direct.
- Le choix est mémorisé sur l'appareil (`localStorage`, clé `mc-theme`) ; l'impression reste toujours en clair.

## Fonctionnement
| Élément | Rôle |
|---|---|
| `js/theme.js` | Chargé dans `<head>` avant les feuilles (aucun flash) : pose `data-theme` sur `<html>` et ajoute le bouton. |
| `css/theme.css` | Style du bouton, fenêtre « Mon mot de passe », lien d'attribution de la carte. |
| `css/citoyen-dark.css`, `css/mairie-dark.css`, `css/saas-dark.css` | **Générés** : ne pas modifier à la main. Tout est préfixé par `html[data-theme="dark"]`. |
| `scripts/gen-dark-theme.js` | Convertit les couleurs claires des feuilles d'origine (fonds pâles → fonds sombres de même teinte, textes foncés → textes clairs) ; bandeaux verts, boutons et dégradés ne bougent pas. |

## Modifier le design
1. Changer la feuille claire (`css/citoyen.css`, `css/mairie.css`, `css/saas.css`).
2. Lancer `npm run theme:build` et publier les `css/*-dark.css` régénérés (le test `tests/theme.test.js` échoue s'ils sont obsolètes).
3. Les couleurs posées en ligne par le JavaScript doivent passer par des classes ou des variables CSS pour suivre le thème (voir `.mdp-box` dans `css/theme.css`).

## Lisibilité
Le mode sombre a été contrôlé automatiquement (contraste WCAG AA, 4,5:1 pour le texte courant, 3:1 pour les grands textes) sur l'accueil et chaque page des trois espaces, en ordinateur et en mobile : aucune anomalie restante.
