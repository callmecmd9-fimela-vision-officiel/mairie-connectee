# Photo de l'agent et badge

Fonction réservée à l'administrateur de mairie (et au super administrateur) : **Administration → Services et équipes → Personnel**.

## Utilisation
1. *Ajouter un agent* ou *Modifier* : choisir un fichier dans « Photo d'identité (badge) », puis *Enregistrer*. La fiche est enregistrée même si la photo échoue.
2. *Badge* (sur la ligne de l'agent) : ouvre l'impression ; choisir « Enregistrer en PDF » ou une imprimante. Format carte 85,6 × 54 mm.
3. *Retirer la photo* : dans la fiche de l'agent.

## Données du badge (liste fermée)
Mairie (+ blason), photo, prénom, nom, fonction, service, matricule. Aucune autre donnée de la fiche n'est lue par le badge.

## Technique
| Élément | Détail |
|---|---|
| Code | `js/org-f.js` (`orgfUploadPhoto`, `orgfBadgeHtml`, `orgfPrintBadge`), styles `.bdg*` dans `css/mairie.css` |
| Stockage | bucket privé `agents-photos`, chemin `<commune_uuid>/<agent_uuid>.webp\|jpg`, 1 Mo max, URL signée 1 h |
| Base | `supabase/proposed/20261123_agent_photo_badge.sql` |
| Droits | écriture : `admin_mairie` / `super_admin` de **sa** commune (ou plateforme) ; lecture : + `maire`, `rh` de la commune |
| Tests | `tests/agent-badge.test.js` |

## Mise en production
1. Base : migration **appliquée le 2026-11-23** (version 20261123125215, voir `supabase/PRODUCTION_VERSION_MAP.md`).
2. Front : déployer le front (`js/org-f.js`, `css/mairie.css`, `css/mairie-dark.css`, `mairie.html`).
