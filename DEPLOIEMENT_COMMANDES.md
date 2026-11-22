> **2026-11-22 : les migrations et Edge Functions listées ci-dessous sont déjà appliquées/déployées en production** (voir `supabase/PRODUCTION_VERSION_MAP.md`). Seul reste le déploiement du front (`wrangler deploy`).

# Déploiement — commandes exactes (À NE LANCER QU'AVEC L'AUTORISATION DU PROPRIÉTAIRE)
Pré-requis : `npm i -g wrangler supabase` ; `supabase login` ; `wrangler login` ; projet `aiqegpijisspankpkwfj`. `bright-worker` est conservé tel quel (ne pas supprimer).

## 0. Contrôle local (sans effet sur la production)
    for f in tests/*.test.js js/smoke.js; do node $f || echo "ÉCHEC $f"; done      # jsdom requis pour enhance/a11y (CI)
    bash scripts/deploy/apply-migrations.sh --dry-run                               # refuse sans CONFIRM_PROD=oui

## 1. Base (ordre strict, 1 transaction par fichier)
    export CONFIRM_PROD=oui SUPABASE_DB_URL='postgresql://postgres:***@db.aiqegpijisspankpkwfj.supabase.co:5432/postgres'
    bash scripts/deploy/apply-migrations.sh
    supabase migration list --linked
Contenu : 01 droits admin_mairie · 02 KPI v2 · 03 push · 04 SMS (file) · 05 SMS (déclencheurs, opt-in par commune).

## 2. Edge Functions
    supabase functions deploy sa-admin --project-ref aiqegpijisspankpkwfj
    supabase functions deploy saas-admin --project-ref aiqegpijisspankpkwfj
    supabase functions deploy admin-comptes --project-ref aiqegpijisspankpkwfj
    # Push / SMS (inactifs sans secrets, répondent 503) :
    supabase functions deploy push-send --no-verify-jwt --project-ref aiqegpijisspankpkwfj
    supabase functions deploy sms-dispatch --no-verify-jwt --project-ref aiqegpijisspankpkwfj
Secrets (valeurs jamais dans le dépôt) :
    supabase secrets set PUSH_WEBHOOK_SECRET=$(openssl rand -hex 24) VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:contact@… --project-ref aiqegpijisspankpkwfj
    supabase secrets set SMS_DISPATCH_SECRET=$(openssl rand -hex 24) SMS_PROVIDER=dryrun --project-ref aiqegpijisspankpkwfj

## 3. Front (Cloudflare Workers)
    wrangler deploy            # racine = assets, voir wrangler.jsonc / .assetsignore
Puis : vider le cache / réinstaller la PWA une fois (SW `mc-v9`).

## 4. Vérifications
    # SQL Editor : tests/isolation/isolation_test.sql → « ISOLATION OK »
    # /saas : créer/affecter un admin_mairie ; /mairie : indicateurs Organisation (valeurs « — » pour admin_mairie)
Webhook push (Dashboard > Database > Webhooks) : table `citoyen_notifications`, INSERT, POST …/functions/v1/push-send, en-tête `x-push-secret`.
Planification SMS (après `dryrun` validé) : pg_cron + pg_net, appel `sms-dispatch` chaque minute avec `x-sms-secret`.

## Action externe restante (hors code)
Choix du fournisseur SMS + identifiant d'expéditeur ; clé VAPID publique à placer dans `index.html` (`<meta name="mc-vapid">`).
