# Sauvegarde et restauration de la base

Sauvegarde : workflow `Sauvegarde base de données` (quotidien 02:17 UTC, manuel possible). Export `pg_dump -Fc` des schémas public, auth, storage, chiffré AES-256 (gpg), conservé 30 jours comme artefact GitHub. Les fichiers de Storage (pièces) ne sont pas inclus : seules leurs métadonnées le sont.

Mise en place (une fois) : ajouter les secrets `SUPABASE_DB_URL` (pooler session, port 5432) et `BACKUP_PASSPHRASE` (aussi conservée hors GitHub). Idéalement un rôle Postgres en lecture seule dédié.

Restauration (jamais directement sur la production sans autorisation) :
1. Télécharger l'artefact, vérifier `sha256sum -c *.sha256`.
2. `gpg --decrypt -o fimela.dump fimela-*.dump.gpg`
3. Créer un projet Supabase vide de test, puis `pg_restore --no-owner --clean --if-exists -d "$URL_TEST" fimela.dump`
4. Vérifier : nombre de lignes des tables clés, connexion mairie, `isolation_test.sql`.

Essai de restauration à refaire après la première sauvegarde réussie, puis chaque trimestre.
