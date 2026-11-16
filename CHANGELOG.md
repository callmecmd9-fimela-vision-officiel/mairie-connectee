## 2026-11-16 (correctif actualisation KO)
- Cause racine : `_headers` → CSP `connect-src` sans `'self'`. Les `fetch()` du service worker sont régis par connect-src : dès que le SW contrôlait la page (donc à l'actualisation et en PWA), toutes les requêtes même origine (HTML, JS, CSS) étaient bloquées → cache vide → `Response.error()` → page blanche. 1re visite OK (SW pas encore actif).
- _headers : `connect-src 'self' …`.
- sw.js (mc-v7) : l'installation fait un fetch d'auto-test (`/js/guard.js`) ; s'il échoue (CSP, réseau), le SW n'est jamais activé et l'app reste utilisable sans SW.
- tests/sw-csp.test.js (nouveau) : 3 vérifications, échoue avant correctif, passe après.
- Récupération des appareils déjà touchés : le navigateur met à jour sw.js seul (hors SW) ; ouvrir l'app une fois, la fermer/rouvrir.

## 2026-11-16 (audit 3)
- Supabase (migration `audit3_demande_numero_statut_grants`, testée en transaction annulée) : `creer_demande` refuse une commune suspendue/résiliée et génère un numéro de suivi à 8 hex aléatoires sécurisés (ex. FIM-0006-95B459D9) au lieu de 4 (énumération anonyme de `suivre_demande` impraticable). Anciens numéros inchangés.
- Supabase : `infos_commune` et `actualites` ne renvoient plus rien pour une commune non ouverte (comme `commune_par_slug`).
- Supabase : droits TRUNCATE, REFERENCES, TRIGGER retirés à anon/authenticated sur toutes les tables public (select/insert/update/delete inchangés).
- js/enhance.js (nouveau, chargé par pwa-init.js sur les 3 interfaces) : anti double-envoi des actions d'écriture (jusqu'au rendu, 12 s max), focus rendu au même contrôle après chaque rendu (accessibilité clavier/lecteur d'écran), actions bloquées hors-ligne avec bandeau (les saisies ne sont plus perdues).
- js/pwa-init.js : charge enhance.js.
- tests/enhance.test.js (nouveau, jsdom) : 11 vérifications.
- Vérifié sans modification : RLS (anon = aucune table lisible ; anonyme connecté = 0 ligne ; maire/secrétariat limités à leur commune, 14 lignes d'une 2e commune de test invisibles ; pas d'escalade via profiles), dépôt de pièces citoyen OK, buckets privés avec limites de taille et types MIME, fonctions SECURITY DEFINER gardées, search_path fixé.

## 2026-11-16 (audit 2)
- Purge des pièces orphelines : edge function `purge-pieces` (verify_jwt off, auth par secret vault) + RPC `pieces_orphelines` (service_role seul) + pg_cron `purge-pieces` (dimanche 03:40, max 200/exécution, pièces > 24 h absentes de demandes.pieces). pg_net activé. Testé : sans/faux secret = 403, secret valide en dry-run = 200.
- Supabase : RLS `communes` — un compte anonyme connecté ne peut plus lister les communes (policy restrictive `bloque_anonymes_communes`) ; lecture limitée à sa propre commune (ou admin plateforme) : plus de fuite inter-communes.
- Supabase : policy storage `pieces_depot` réécrite via `private.commune_ouverte()` (SECURITY DEFINER) pour que le dépôt de pièces citoyen continue de marcher ; testé (commune valide autorisée, inconnue refusée, lecture anon = 0).
- sw.js (mc-v6) : cache hors-ligne réseau-d'abord (mises à jour immédiates), fichiers du site uniquement ; Supabase/Turnstile jamais interceptés.
- citoyen.js : pièces jointes validées/compressées AVANT la connexion anonyme et l'envoi (moins d'orphelins et de comptes anonymes inutiles) ; format refusé explicitement.
- _headers : CSP resserrée (plus de jsdelivr/cdnjs).
- .assetsignore : *.md, tests, *.sql, *.ts non publiés (CHANGELOG/TASKS/DECISIONS étaient accessibles publiquement).
- core.js : chargement paginé (pages de 1000, jusqu'à 10 000 lignes) au lieu de la troncature silencieuse de PostgREST ; message d'erreur si plafond atteint.
- tests/smoke.js : test de non-régression (rendu de toutes les vues pour 10 rôles, citoyen, saas, logique du service worker).

## 2026-11-16
- citoyen.js : plus de lecture de la table communes (bloquée pour anon). Accès par /?c=slug ou saisie du code, via RPC commune_par_slug. Liste publique retirée.
- guard.js : bouton « Réessayer » sans onclick inline (bloqué par la CSP).
- core.js / maire.js : soldes de congés annuels (table conges_droits) : saisie droit + report, solde = droit + report − jours approuvés, alerte si solde insuffisant.
- mairie.css : champs 16 px sur mobile (pas de zoom iOS), cibles tactiles 40–48 px, safe-area, reduced-motion.
- Audit Supabase : RLS actif partout, anon ne lit aucune table, 5 RPC anon voulues, fonctions SECURITY DEFINER gardées, search_path fixé.
