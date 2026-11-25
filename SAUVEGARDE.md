# Sauvegarde : base de données et fichiers Storage (Supabase Free)

À ma connaissance la formule Free ne propose ni sauvegarde téléchargeable ni restauration à un instant donné. Le workflow `.github/workflows/db-backup.yml` comble ce manque sans dépense.

## Ce qui est sauvegardé

| Élément | Fichier produit | Contenu |
|---|---|---|
| Base de données | `fimela-AAAAMMJJ.sql.gpg` | `pg_dump` (SQL texte) des schémas `public`, `auth` et `private` |
| Fichiers Storage | `fimela-storage-AAAAMMJJ.tar.gz.gpg` | Tous les buckets (y compris privés, ex. `identite`), chemins conservés, plus un `MANIFEST.txt` listant chaque fichier |
| Empreintes | `fimela-AAAAMMJJ.sha256`, `fimela-storage-AAAAMMJJ.sha256` | SHA256 des deux archives chiffrées |

- Chiffrement : AES-256 (gpg, phrase `BACKUP_PASSPHRASE`) pour la base **et** le Storage.
- Les fichiers du Storage sont récupérés via l'API REST de Supabase (`curl`), sans identifiants S3.
- Fréquence : chaque dimanche 03:17 UTC, ou à la demande (Actions > Sauvegarde chiffrée > Run workflow).
- Conservation : 30 jours en artefact `fimela-db-backup` (le dépôt doit être **privé**). Télécharger régulièrement une copie hors GitHub.
- Secrets à créer (Settings > Secrets and variables > Actions) : `SUPABASE_DB_URL` (Session pooler), `BACKUP_PASSPHRASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Garder la phrase secrète dans un gestionnaire de mots de passe : perdue, les sauvegardes sont inutilisables.
- Lecture seule : aucune écriture en production.
- Limite : la définition des buckets (public/privé, taille max, types MIME) n'est pas dans l'archive ; elle vient des migrations `supabase/migrations/`.

## Objectifs de reprise

| Objectif | Valeur | Justification |
|---|---|---|
| **RPO** (perte de données maximale) | **7 jours** | Sauvegarde hebdomadaire. Pour réduire : lancer le workflow à la demande avant toute opération risquée. |
| **RTO** (durée maximale de remise en service) | **4 heures** | Téléchargement + déchiffrement + restauration de la base + envoi des fichiers + vérifications. |

## Restauration (toujours sur un projet ou une base jetable d'abord)

Une restauration vers la production exige un accord explicite.

### 0. Récupérer et vérifier les archives
Télécharger l'artefact `fimela-db-backup` (Actions > exécution > Artifacts), puis :
```
sha256sum -c fimela-AAAAMMJJ.sha256 fimela-storage-AAAAMMJJ.sha256
```
Si les `.sha256` pointent vers des noms de fichiers `.gpg`, les deux archives doivent être dans le même dossier. Un échec signifie une archive corrompue : ne pas continuer.

### 1. Base de données
Le dump est un fichier **SQL texte** (format `pg_dump` par défaut) : il se restaure avec `psql`, pas avec `pg_restore` (qui n'accepte que les formats custom, directory et tar).
```
export PGURL="postgresql://postgres:MOT_DE_PASSE@HOTE:5432/postgres"   # base cible, jetable d'abord
gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" -d fimela-AAAAMMJJ.sql.gpg > dump.sql
psql "$PGURL" -v ON_ERROR_STOP=1 -f dump.sql
shred -u dump.sql
```
Les rôles et extensions Supabase doivent exister (voir `docs/database/SCHEMA_RECONSTRUCTION_RUNBOOK.md`). Sur un projet Supabase neuf, `auth` existe déjà : restaurer sur une base vide créée avec `createdb`, ou suivre le runbook pour les conflits d'objets.

### 2. Fichiers Storage
```
gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" -d fimela-storage-AAAAMMJJ.tar.gz.gpg > storage.tar.gz
mkdir storage-restore && tar -xzf storage.tar.gz -C storage-restore
rm storage.tar.gz
```
Le dossier contient un sous-dossier par bucket (`identite/`, etc.) et `MANIFEST.txt`. Les buckets doivent exister dans le projet cible (créés par les migrations `supabase/migrations/`, sinon via Dashboard > Storage). Puis envoi des fichiers par l'API REST :
```
export SUPABASE_URL="https://REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."   # clé service_role du projet CIBLE
cd storage-restore
while IFS= read -r obj; do
  bucket="${obj%%/*}"; path="${obj#*/}"
  enc=$(jq -rn --arg p "$path" '$p | split("/") | map(@uri) | join("/")')
  curl -sS -f -X POST "$SUPABASE_URL/storage/v1/object/$bucket/$enc" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "x-upsert: true" -H "Content-Type: $(file -b --mime-type "$obj")" \
    --data-binary "@$obj" -o /dev/null || echo "ECHEC : $obj"
done < MANIFEST.txt
```
Toute ligne `ECHEC` est à reprendre avant de considérer la restauration terminée.

### 3. Vérifications minimales
- Nombre de fichiers envoyés = nombre de lignes de `MANIFEST.txt`.
- Quelques tables clés non vides (communes, demandes, paiements_taxes) et comptes de `auth.users` cohérents.
- Connexion d'un compte de test ; ouverture d'une pièce du bucket privé `identite`.

## Test de restauration

À faire **chaque trimestre** et après tout changement du workflow. Environnement isolé, jamais la production :

1. Lancer le workflow à la demande, télécharger l'artefact.
2. Créer une cible jetable, au choix :
   - base Postgres locale : `docker run -d --name restore-test -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:17`, avec `PGURL="postgresql://postgres:test@localhost:54329/postgres"` ;
   - ou un projet Supabase gratuit de test (jamais le projet de production), en utilisant son `SUPABASE_URL` et sa clé `service_role`.
3. Exécuter les étapes 0 à 3 ci-dessus sur cette cible. Chronométrer l'ensemble : la durée doit rester sous le RTO (4 h).
4. Noter dans `CHANGELOG.md` la date, la durée, les anomalies. Un test non réussi est un incident : corriger avant la prochaine sauvegarde hebdomadaire.
5. Supprimer la cible (`docker rm -f restore-test`, ou le projet de test) et les fichiers déchiffrés (`shred -u dump.sql`, `rm -rf storage-restore`) : ils contiennent des données personnelles en clair.
