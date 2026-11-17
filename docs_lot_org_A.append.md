
## CHANGELOG — Lot A : organigramme, rôles et droits (base)
- Appliqué en production (additif, aucune table/RLS/fonction existante modifiée) : `org_roles`, `org_role_droits`, `org_postes`, `org_affectations`, `org_delegations_droits` (RLS : lecture limitée à sa commune, écriture uniquement via fonctions).
- Fonctions : `org_commune`, `org_droit(module,action)`, `org_init`, `org_role_save`, `org_role_droit_set`, `org_poste_save`, `org_affecter`, `org_affectation_fin`, `org_deleguer`, `org_revoquer` ; internes non exposées : `org_droit_propre`, `org_droit_user`, `org_log`, `org_seed`.
- Organigramme par défaut (24 postes + 1 agent par service spécialisé) semé pour les 2 communes existantes : 80 rôles, 80 postes, 1100 droits.
- 11 actions : consulter, creer, modifier, supprimer, valider, rejeter, signer, exporter, imprimer, partager, administrer.
- Tests exécutés en base (annulés après coup) : maire tous droits ; sans affectation = aucun droit ; droits du poste ; délégation > droits détenus refusée ; délégation valide puis révocation immédiate ; non-admin refusé ; délégation inter-communes refusée ; RLS : une seule commune visible. 8/8 OK.

## DECISIONS
- `commune_id` conservé (pas `municipality_id`) : évite de casser 16+ tables, RLS et RPC.
- Postes = données configurables par commune ; `profiles.role` (11 valeurs) inchangé, donc aucune régression.
- Droit effectif = maire/super_admin : tous ; sinon override legacy (consulter) > poste/rôle > délégation. Une délégation n'est valide que si le délégant détient encore le droit ; pas de sous-délégation ; 1 an maximum.
- Pas d'action « payer » : séparation ordonnateur / comptable public ; le paiement reste une confirmation externe.
- Rien n'utilise encore `org_droit` : le lot A n'altère aucun comportement existant.

## TASKS
- Lot B : écrans Administration > Organigramme / Rôles / Affectations / Délégations ; `can()` alimenté par `org_droit` ; tableaux de bord par poste.
- Lot C : RLS des modules sensibles (paie, personnel, rémunérations, marchés, archives confidentielles) via `org_droit` ; traçabilité des consultations sensibles ; tests d'isolation.
- Lot D : tests UI, matrice finale, documents.
- Export du SQL du lot A en fichier `20261125_org_rbac.sql` pour le dépôt (appliqué en base, non encore versionné).
