# LOT 2 — en-têtes retirés des migrations (D/E/F)

Le SQL de supabase/proposed/2026120{7,8,9}_*.sql = SQL exécuté en prod le 2026-11-27, sans ces en-têtes.

## 20261207_budget_conseil.sql (lignes 1-9 retirées)
```sql
-- LOT D : Budget (DOB, tutelle) et Conseil municipal (quorum, procurations, délai de convocation).
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Idempotente. À appliquer après 20261202000300 (gouvernance) et 20261202000900 (machines d'états).
-- Aucune politique RLS existante n'est modifiée. Les contraintes CHECK sont créées NOT VALID : elles s'appliquent aux nouvelles écritures
-- sans rejeter l'historique ; après régularisation des anciennes lignes : alter table … validate constraint ….
-- Tables existantes, non recréées : budgets, sessions_conseil, session_presences, deliberations, conseillers.
-- Parcours budgétaire : dob -> brouillon -> vote -> approuve -> cloture (sans saut, sans retour).
-- Rappel : le trigger existant trg_budgets_garde_immuable rend un budget voté / approuvé immuable pour les rôles API ;
-- la transmission à la tutelle et la décision de la tutelle passent donc par des RPC SECURITY DEFINER (propriétaire postgres).
```

## 20261208_marches_fiscalite.sql (lignes 1-6 retirées)
```sql
-- LOT E : Marchés publics (mode de passation en enum, références de l'appel) et Fiscalité / Trésor
-- (NINEA, circuit ordonnateur -> comptable public, quittance du Trésor).
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Idempotente. À appliquer après 20261202000200 (marchés), 20261203000200 (fiscalité) et 20261207.
-- Aucune politique RLS existante n'est modifiée. Contraintes CHECK créées NOT VALID (nouvelles écritures contrôlées, historique conservé).
-- Tables existantes, non recréées : marches, contribuables, paiements_taxes, engagements.
```

## 20261209_urbanisme.sql (lignes 1-7 retirées)
```sql
-- LOT F : Urbanisme — permis de construire (workflow d'instruction strict, délai d'instruction de 3 mois, silence de l'administration).
-- ÉTAT : PROPOSÉE, NON APPLIQUÉE. Idempotente. Nouvelle table : public.permis_construire (la démarche générique « Autorisation d'urbanisme »
-- du catalogue citoyen reste le point d'entrée du citoyen ; l'instruction communale se fait ici).
-- Workflow : depot -> instruction_services_techniques -> avis_commission -> decision_maire -> delivrance (sans saut, sans retour).
-- Un refus du Maire reste enregistré à l'étape decision_maire (decision_maire = 'refuse') : le dossier n'est pas délivré.
-- Isolation : private.my_commune() ; mêmes garde-fous que les autres tables (anonymes, maintenance, super_admin sans écriture, audit).
```
