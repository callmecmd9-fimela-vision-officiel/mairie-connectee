> **2026-11-22 — TOUTES CES MIGRATIONS (01 à 08) SONT DÉJÀ APPLIQUÉES EN PRODUCTION** (voir ../PRODUCTION_VERSION_MAP.md). Ce dossier est conservé pour l'historique ; ne rien rejouer.

# Migrations de production — PRÊTES, NON APPLIQUÉES
Ordre strict : 01 → 05. Chaque fichier est idempotent. Ne rien rejouer de `migrations/` (déjà en production).
Dépendances : 05 exige 04. Les SMS restent inactifs par commune (`sms_parametres.actif=false`) ; le push ne s'active qu'avec les secrets VAPID.
Application : `scripts/deploy/apply-migrations.sh` (refuse de s'exécuter sans `CONFIRM_PROD=oui`).

06 (20261121100000_saas_modifier_commune.sql) : fonction saas_modifier_commune (nom + domaine). À appliquer AVANT d'utiliser le bouton « Modifier » du Super Admin. Indépendant de 01–05.
07 (20261121110000_saas_archiver_supprimer_commune.sql) : archivage réversible + suppression limitée aux mairies vides (2 colonnes, 4 fonctions). À appliquer AVANT d'utiliser les boutons Archiver/Restaurer/Supprimer. Testée sur base locale jetable.
08 (20261121120000_admin_mairie_perimetre.sql) : garde _garde_am + am_resume/am_utilisateurs/am_journal + identité élargie à l'admin municipal (sa mairie uniquement). À appliquer AVANT de déployer js/admin-mairie.js. Testée sur base locale jetable.
