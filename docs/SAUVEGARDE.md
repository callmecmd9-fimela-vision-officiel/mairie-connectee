# Sauvegarde de la base (Supabase Free)

À ma connaissance la formule Free ne propose ni sauvegarde téléchargeable ni restauration à un instant donné. Le workflow `.github/workflows/db-backup.yml` comble ce manque sans dépense.

- Fréquence : chaque dimanche 03:17 UTC, ou à la demande (Actions > Sauvegarde chiffrée > Run workflow).
- Contenu : `pg_dump` des schémas `public` et `auth`, chiffré AES-256 (gpg). Les fichiers du Storage (pièces, blasons) ne sont **pas** inclus.
- Conservation : 30 jours en artefact du dépôt (le dépôt doit être **privé**). Télécharger régulièrement une copie hors GitHub.
- Secrets à créer : `SUPABASE_DB_URL` (Session pooler), `BACKUP_PASSPHRASE`. Garder la phrase secrète dans un gestionnaire de mots de passe : perdue, la sauvegarde est inutilisable.
- Lecture seule : aucune écriture en production.

## Restauration (toujours sur une base jetable d'abord)
```
gpg --batch --passphrase "$BACKUP_PASSPHRASE" -d fimela-AAAAMMJJ.sql.gpg > dump.sql
createdb fimela_restore && psql fimela_restore -v ON_ERROR_STOP=1 -f dump.sql
```
Les rôles et extensions Supabase doivent exister (voir `docs/database/SCHEMA_RECONSTRUCTION_RUNBOOK.md`). Une restauration vers la production exige un accord explicite.
