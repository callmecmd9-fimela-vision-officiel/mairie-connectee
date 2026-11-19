# Réconciliation des migrations et plan de recette contrôlée — 19 novembre 2026

## 1. Résultat de la réconciliation de l'historique

Lecture seule du projet Supabase `fimela-vision-officiel` (PostgreSQL 17.11).

| Contrôle | Résultat |
|---|---:|
| Migrations enregistrées dans `supabase_migrations.schema_migrations` | **81** |
| Première version enregistrée | `20261114184306` |
| Dernière version enregistrée | `20261118230324` |
| Entrées sans instructions SQL | **0** |
| Entrées avec instructions SQL | **81** |
| Total des instructions récupérées | **298 702 caractères** |
| Sources restaurées dans `supabase/migrations/` | **81** |
| Sources comparées octet par octet à `statements[1]` | **81/81** |
| Candidats locaux non appliqués | **2** |

Les 81 sources ont été récupérées depuis la colonne `statements[1]` de l'historique Supabase. Chaque fichier suit le format `<version>_<name>.sql`. Les contenus des 81 fichiers du dépôt ont été relus et comparés directement aux textes conservés dans la base : aucune divergence détectée.

Le fichier `supabase/migrations/recovered-history-manifest.json` conserve pour chaque migration la version, le nom, le chemin, la taille en octets et l'empreinte MD5 de l'instruction enregistrée. MD5 est utilisé ici comme contrôle de cohérence, pas comme signature cryptographique.

Un test automatisé `tests/migration-history-integrity.test.js` contrôle les 81 fichiers, les tailles, les empreintes, l'unicité des versions et la présence exclusive des deux migrations candidates supplémentaires.

## 2. Migrations candidates en attente

Ces deux fichiers sont présents dans la branche, mais absents de l'historique Supabase consulté :

- `20261119070000_security_null_mfa_guards.sql`
- `20261119090000_ia_usage_atomic_reservations.sql`

Ils sont postérieurs à la dernière version appliquée. Ils ne sont pas inclus dans les 81 sources restaurées et ne sont pas appliqués à la production.

## 3. Écart restant : schéma initial antérieur à la première migration

La récupération des 81 instructions rétablit la chaîne des migrations enregistrées, mais elle ne prouve pas qu'une reconstruction depuis une base vide soit possible.

La première migration `20261114184306_super_admin_socle.sql` modifie des objets préexistants, notamment `public.profiles` et `public.indicateurs`. Ces objets sont donc issus d'un schéma initial antérieur à la première migration enregistrée.

**Blocage avant rejeu complet :** retrouver et identifier la source canonique du schéma initial pré-migrations (archive SQL, dump historique ou sauvegarde vérifiable). Ne pas fabriquer ce socle à partir du schéma de production actuel, car cela masquerait les écarts et rendrait le rejeu non probant.

## 4. Contrôles effectués

- Lecture seule de la table d'historique des migrations et de ses colonnes.
- Comptage des versions et vérification de l'absence de statements nuls/vides.
- Récupération des 81 instructions SQL.
- Contrôle de motifs de secrets à haute confiance dans les sources récupérées : aucun JWT, clé Supabase secrète, clé Stripe, clé AWS ou bloc de clé privée correspondant aux motifs contrôlés n'a été détecté. Ce contrôle ciblé ne constitue pas un audit exhaustif de secrets.
- Comparaison octet par octet des 81 fichiers GitHub avec les 81 instructions SQL conservées en base.
- Ajout du manifeste et du test d'intégrité automatisé.

## 5. Plan de recette contrôlée — sans déploiement

### Phase A — préparer un environnement isolé
1. Retrouver le schéma initial pré-migrations et documenter sa provenance.
2. Obtenir un export vérifiable du schéma et des données de recette nécessaires ; anonymiser les données personnelles et secrets.
3. Restaurer cet export dans une instance PostgreSQL/Supabase locale ou éphémère, sans branche payante.
4. Vérifier la version PostgreSQL, les extensions, rôles, schémas `auth` et `storage`, fonctions auxiliaires et secrets de test.

### Phase B — rejouer et comparer
1. Rejouer les 81 migrations dans l'ordre sur l'environnement isolé initialisé avec le véritable socle.
2. Comparer le schéma obtenu avec le schéma de référence exporté : tables, colonnes, types, contraintes, index, vues, fonctions, triggers, politiques RLS, privilèges, buckets et politiques Storage.
3. Vérifier que le manifeste local correspond aux 81 versions déjà enregistrées en production.
4. Vérifier que seules les deux migrations candidates sont en attente dans la branche.
5. Exécuter les tests PostgreSQL de concurrence, gardes paie, MFA et liaison des adjoints, puis les tests JavaScript et Deno.

### Phase C — recette fonctionnelle et sécurité
- Tester les parcours de connexion, enrôlement TOTP, challenge MFA et refus AAL1 pour super-admin.
- Tester les RPC avec de vrais JWT de comptes de recette et des rôles/communes distincts.
- Tester les politiques RLS et Storage avec des comptes citoyen, adjoint, maire, cabinet, secrétariat et plateforme.
- Tester les scénarios de quota IA concurrents, erreurs fournisseur, timeout et libération de réservation.
- Vérifier les Edge Functions, leurs secrets, JWT, CORS, limites et procédure de retour à la version précédente.

### Phase D — décision de mise en production
Préconditions cumulatives :
- source du schéma initial retrouvée et rejeu intégral reproductible ;
- comparaison de schéma sans écart inexpliqué ;
- export de sauvegarde et restauration de contrôle réussis ;
- migration list montrant les 81 versions historiques alignées et uniquement les deux candidats en attente ;
- tests de sécurité et de non-régression tous verts ;
- procédure de retour arrière documentée et opérable.

Toute application en production, tout déploiement Edge Function et toute modification de données exigent une décision opérationnelle distincte. Aucun de ces actes n'est autorisé par cette réconciliation.

## 6. État opérationnel

- Travail effectué uniquement sur `chore/ci-regression-tests`.
- `main` inchangée.
- Aucune migration appliquée.
- Aucun déploiement Supabase ou Cloudflare.
- Aucune donnée, aucun secret et aucune configuration de production modifiés.
- Aucun compute ou branche Supabase payant créé.


## 7. CI de la réconciliation

- Workflow Regression tests **#164 : succès** sur le commit `2b7c83060c762ffdd1318d157d7413bbd908068b` ; le test d'intégrité des 81 sources est vert, ainsi que la suite JavaScript et le contrôle Deno des six Edge Functions.
- Workflow PostgreSQL concurrency integration **#68 : succès** sur le même commit ; tests de quota atomique, gardes paie et liaison des adjoints verts sur PostgreSQL éphémère.
- Un défaut de regex dans la première version du test d'intégrité a été corrigé avant ce résultat final ; le workflow de validation final est entièrement vert.
