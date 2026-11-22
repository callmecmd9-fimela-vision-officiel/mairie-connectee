# Mairie Connectée (Fimela Vision)

SaaS municipal multi-communes : portail citoyen, espace mairie et console plateforme.
Front statique (HTML/JS sans étape de build) servi par Cloudflare Workers (assets) ; back-end Supabase (Postgres + RLS, Auth, Storage, Edge Functions).

## Applications

| Chemin | Fichiers | Public |
|---|---|---|
| `/` | `index.html`, `js/citoyen.js` | Citoyens (`/?c=slug`) |
| `/mairie` | `mairie.html`, `js/core.js` et modules associés | Personnel communal |
| `/saas` | `saas.html`, `js/saas.js` | Plateforme (MFA obligatoire) |

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `js/`, `css/` | Code et styles publiés |
| `supabase/migrations/` | Migrations SQL de référence (voir `PRODUCTION_VERSION_MAP.md` pour l'état en production) |
| `supabase/functions/` | Edge Functions (`sa-admin`, `saas-admin`, `ia-texte`, `sms-dispatch`, …) |
| `tests/` | Tests de non-régression (`npm test`) |
| `docs/` | Documentation technique (rôles, sauvegarde, SMS, push, mots de passe, …) ; `docs/rapports/` : audits et rapports datés |
| `scripts/` | Outils de déploiement et d'export |
| `archive_legacy/` | Anciens fichiers conservés pour mémoire (non publiés) |

## Développement

```bash
npm install        # outils de test uniquement (jsdom, prettier)
npm test           # lance tous les tests
npm run format     # formate js/*.js (Prettier)
```

Les fichiers publiés sont ceux autorisés par `.assetsignore` (liste blanche) ; `docs/`, `tests/`, `supabase/` et `scripts/` ne sont jamais publiés.

## Sécurité

- Isolation par commune côté serveur (RLS, identification par slug).
- Mots de passe : renouvellement tous les 30 jours avec alerte à J-7 (`docs/POLITIQUE_MOT_DE_PASSE.md`) ; aucun mot de passe n'est lisible, réinitialisation par lien sécurisé.
- MFA obligatoire pour la plateforme.

## Pour aller plus loin

`PROJECT_MASTER.md` (vue d'ensemble), `SETUP.md` et `DEPLOIEMENT_COMMANDES.md` (déploiement), `CHANGELOG.md`, `DECISIONS.md`, `TASKS.md`.
