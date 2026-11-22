# Bibliothèques embarquées (copiées dans le dépôt, sans gestionnaire de paquets)

| Fichier | Bibliothèque | Version | Contrôle |
|---|---|---|---|
| `js/supabase.js` | supabase-js (build navigateur) | 2.45.4 (identique aux Edge Functions, qui importent `esm.sh/@supabase/supabase-js@2.45.4`) | suivre les avis de sécurité sur github.com/supabase/supabase-js |
| `js/leaflet.js`, `css/leaflet.css` | Leaflet | 1.9.4 | idem github.com/Leaflet/Leaflet |
| `js/qr.js` | générateur QR (qrcode-generator) | non indiquée dans le fichier | à identifier avant toute mise à jour |

Mise à jour : remplacer le fichier, relancer `npm test` et `tests/browser/run.sh`, incrémenter les `?v=` des pages. Noter la nouvelle version ici.
