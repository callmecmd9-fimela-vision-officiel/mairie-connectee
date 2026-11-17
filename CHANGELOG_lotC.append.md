
## Lot C — RLS sensibles via org_droit, traçabilité
- `20261126_lot_c_rls.sql` : policies additives (OR) sur personnel, congés, rémunérations, paies/paie_lignes, marchés, archives non confidentielles — aucune policy existante retirée.
- Table `acces_sensibles` + fonction `org_tracer(module, cible)` : journal des consultations sensibles, lecture réservée maire/super_admin.
- `isolation_lotc.sql` : croisement Diofior/Fimela sur personnel, rémunérations, paies, marchés, archives.
### À appliquer
- Exécuter `20261126_lot_c_rls.sql` dans Supabase, puis `isolation_lotc.sql` (remplacer les placeholders par des ids réels) : attendu 0 sur chaque ligne croisée, vrai sur le témoin positif.
