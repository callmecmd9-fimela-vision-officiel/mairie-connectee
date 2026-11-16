## 2026-11-16 (correctif actualisation KO)
- Toute modification de CSP doit garder `'self'` dans connect-src tant qu'un SW est servi (test : node tests/sw-csp.test.js).
- Le SW ne s'active que si son auto-test réseau passe (échec = pas de SW, jamais d'app cassée). Version de cache : incrémenter C dans sw.js à chaque changement du SW.

## 2026-11-16 (audit 3)
- Numéro de suivi : 8 hex via gen_random_uuid() (CSPRNG) ; les anciens numéros à 4 hex restent valides.
- Une commune non ouverte (statut hors essai/actif) n'accepte plus de demandes et n'expose plus ses infos publiques.
- Retrait de TRUNCATE/REFERENCES/TRIGGER aux rôles API (défense en profondeur ; aucun usage client).
- Anti double-envoi et gestion du focus faits dans un module séparé (js/enhance.js) pour ne pas modifier les gros fichiers.
- ATTENTION : supabase/20261114_super_admin.sql est PÉRIMÉ par rapport à la base (la base a _garde(p_commune) lié à la commune du super_admin, sa_set_image sans regex, sa_revoquer_sessions limité à la commune, sauvegardes sans documents confidentiels). Ne jamais le rejouer : il régresserait ces protections.

## 2026-11-16 (audit 2)
- Purge pièces orphelines validée par l'utilisateur : suppression via Storage API uniquement (jamais en SQL), pièces > 24 h non référencées, 200 max par exécution.
- Les comptes anonymes (citoyens) n'ont aucun accès direct aux tables ; seules les RPC anon et le dépôt dans `pieces` sont permis.
- Un agent ne voit que sa commune (table communes) ; la liste globale passe uniquement par saas_liste_communes (plateforme + MFA).
- Cache SW : réseau d'abord, jamais de cache pour les appels API.

## 2026-11-16
- Pas de liste publique des communes : accès par lien /?c=slug ou code saisi (commune_par_slug, seule porte anon).
- Soldes de congés : calcul côté client, jours calendaires, type « Annuel » uniquement ; avertissement non bloquant.
