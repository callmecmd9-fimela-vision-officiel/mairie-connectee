
- Lot C : RLS `org_droit` toujours additive (nouvelle policy permissive en OR avec l'existant), jamais en remplacement — élimine le risque de régression sur les accès legacy par rôle.
- Documents confidentiels : `org_droit('archives',...)` ne débloque que le non-confidentiel ; le confidentiel reste exclusivement maire/secrétariat via la policy historique, intacte.
- Traçabilité sensible centralisée dans `acces_sensibles` plutôt qu'une table de log par module (évite la prolifération de tables).
