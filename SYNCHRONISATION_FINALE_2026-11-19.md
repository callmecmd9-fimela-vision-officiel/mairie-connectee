# Synchronisation consolidée — 19 novembre 2026

Une archive complète réunit les sources envoyées et les patches successifs (base audit corrigée, patches v2/v3/v4 et correctif de tests citoyens). Cette note ne signifie pas que l'ensemble des fichiers applicatifs de cette archive est déjà synchronisé dans cette branche.

## Éléments déjà présents dans cette branche
- CI Node 24 avec installation isolée de jsdom.
- Correctifs de chemins des tests citoyens et du module de bannière.
- Priorité des permissions explicites et historiques avant le fallback organisationnel dans can().
- Exclusions de déploiement pour tests, SQL, archives, sauvegardes et documentation.

## À intégrer avant de considérer la synchronisation GitHub complète
- js/org-e.js, js/org-f.js et les tests org-e/org-f.
- La version mise à jour de js/org.js avec délégations de consultation validées par RPC.
- Les versions coordonnées de mairie.html, js/saas.js, js/superadmin.js et saas.html.
- La revue des migrations avant toute exécution.

## Validation
21 suites ont réussi localement. enhance.test.js n'a pas pu être exécuté localement, faute de jsdom ; le workflow CI l'exécute après installation de jsdom. Aucun SQL n'a été appliqué, aucune donnée Supabase modifiée et aucun déploiement réalisé.
