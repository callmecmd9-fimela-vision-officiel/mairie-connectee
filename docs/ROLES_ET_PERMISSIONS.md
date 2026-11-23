# Rôles et permissions — modèle cible (migration `20261120100000`)

> Statut : **proposé, non appliqué en production.** Aucune donnée réelle n'a été modifiée.
> Cadre : Supabase Free (aucun service payant ajouté), JS vanilla, RLS + RPC `SECURITY DEFINER`.

## 1. Hiérarchie

| Rôle | Périmètre | Peut | Ne peut pas |
|---|---|---|---|
| **Super Admin / admin plateforme** (`platform_admins` + AAL2, ou profil `super_admin` + AAL2) | Toute la plateforme | Créer/modifier/activer/suspendre les communes, comptes, **admins municipaux**, privilèges globaux | — |
| **`admin_mairie`** | **Sa seule commune** | Administrer l'organisation : organigramme, services, postes, rôles/droits des postes (hors droits réservés), affectations ; lire l'annuaire des profils de sa commune | Accéder aux données métier ; modifier son rôle/commune/statut ; créer un autre admin ; recevoir un poste ; recevoir ou déléguer un droit `org` d'écriture |
| **`maire`** | Sa commune | Supervision, arbitrage, validations, signatures, délégations métier, liaison des adjoints | Administration technique du module `org` ; s'attribuer un privilège administratif ; modifier un `admin_mairie` |
| Autres rôles | Leurs fonctions | Selon rôle, poste, délégation | Tout ce qui n'est pas accordé |

Droits réservés = module `org`, actions `creer`, `modifier`, `supprimer`, `administrer` (`private.droit_reserve`). Ils ne sont **jamais** accordables à un poste ni délégables par un acteur municipal ; seule la plateforme (ou un appel système) le peut.

## 2. Cycle de vie d'un admin municipal (`profiles.statut_admin`, dérivé par trigger)

| Statut | Conditions | Droits |
|---|---|---|
| `en_attente` | rôle `admin_mairie`, **sans commune** (actif forcé à `false`) | **Aucun** |
| `affecte` | commune attribuée, `actif=false`, jamais activé | **Aucun** |
| `actif` | commune + `actif=true` | org de SA commune uniquement |
| `suspendu` | `actif=false` après avoir été actif | **Aucun** |

Invariant (contrainte `profiles_admin_mairie_coherence`) : un `admin_mairie` n'est jamais actif sans commune.

### Procédure (Super Admin, interface `/mairie` → Gestion des utilisateurs → *Administrateurs municipaux*)
1. **Créer ou rattacher** : e-mail d'un compte Auth **existant** (+ commune facultative). Sans commune → `en_attente`. Avec commune → `affecte`. Aucun compte créé, supprimé ni modifié côté Auth ; aucun mot de passe généré.
2. **Affecter** (si créé sans commune) : même formulaire avec la commune (RPC `saas_affecter_admin_mairie`).
3. **Activer** : bouton *Activer* (Edge Function `sa-admin`, action `activer`) — exige commune et MFA plateforme ; l’e-mail non confirmé est confirmé par le super admin à l’activation (tracé dans le journal) ; synchronise les affectations.
4. **Suspendre** : bouton *Suspendre* (révoque les sessions).
Une nouvelle commune créée via `/saas` (`creer_mairie`) réutilise un compte existant et lui attribue `admin_mairie` inactif.

## 3. Garde-fous (défense en profondeur)

| Couche | Garde |
|---|---|
| Contrainte | `profiles_role_check` (+`admin_mairie`), `profiles_admin_mairie_coherence` |
| Trigger `trg_garde_profil_roles` | Seule la plateforme crée/modifie/active/suspend un `admin_mairie` ; personne ne change son propre rôle ou sa commune |
| Trigger `trg_garde_org_affectation` | Un `admin_mairie` ne reçoit aucun poste ; pas d'auto-affectation |
| Trigger `trg_garde_org_role_droits` | Droits réservés refusés aux acteurs municipaux |
| Trigger `trg_garde_org_delegation` | Pas de délégation des droits réservés ni à un `admin_mairie` |
| `org_gest` / `org_droit_propre` / `org_peut_accorder` | Admin = plateforme, super-admin ou `admin_mairie` **de la commune** ; maire sans écriture `org` |
| RPC plateforme | `saas_preparer_admin_mairie`, `saas_affecter_admin_mairie`, `saas_admins_mairie`, `saas_compte_par_email` : `private.pgarde` (MFA), `revoke … from public, anon` |
| `lier_adjoint`, `admin_attribuer` | N'écrasent jamais un `admin_mairie` ; `admin_attribuer('admin_mairie')` crée un compte inactif |
| RLS | Lecture `profiles` de sa commune pour `admin_mairie` (SELECT seul) ; écriture `profiles` inchangée (Super Admin) |
| Journal | `profil_role_change` (journal_audit) + `platform_audit` (`admin_mairie_preparer`, `admin_mairie_affecter`, …) |
| Edge Functions | `sa-admin` / `saas-admin` : portail plateforme ; un compte existant n'est **jamais supprimé** en cas d'échec |

Les triggers laissent passer les appels sans utilisateur (service_role, migrations, trigger d'inscription Auth).

## 4. Comptes visés (état de production constaté en lecture seule le 2026-11-20)
- `admindiofior@gmail.com` → Diofior (`commune-de-diofior`) ; `adminjoal@gmail.com` → Joal. Comptes Auth existants, confirmés, rôle `citoyen`, sans commune.
- Préparation anticipée : statut `en_attente` (aucun droit), puis `affecte` quand la commune existe, puis `actif`.
- `adminfatick@…`, `admindjirnda@…` : hors périmètre de cette livraison (communes inexistantes).
- Le compte maire actuel de Diofior n'est **ni modifié ni désigné admin principal**.

## 5. Application (ordre — **accord explicite requis**, rien n'est appliqué)
1. Sauvegarde / export du schéma (`scripts/database/export-production-schema.sh`).
2. Appliquer d'abord `20261119070000` et `20261119090000` (en attente en production), puis `20261120100000`.
3. Déployer `sa-admin` et `saas-admin`, puis le front (`mairie.html`, `js/*`).
4. Via l'interface Super Admin : préparer les deux comptes, affecter, activer.
**Impact à connaître** : dès la migration, le maire perd l'écriture `org` ; tant qu'aucun `admin_mairie` n'est actif, seul le Super Admin administre l'organigramme.

## 6. Retour arrière (avant que des `admin_mairie` existent en production)
```sql
begin;
drop trigger if exists trg_garde_profil_roles on public.profiles;
drop trigger if exists trg_profil_statut_admin on public.profiles;
drop trigger if exists trg_journaliser_profil_role_ins on public.profiles;
drop trigger if exists trg_journaliser_profil_role_upd on public.profiles;
drop trigger if exists trg_garde_org_affectation on public.org_affectations;
drop trigger if exists trg_garde_org_role_droits on public.org_role_droits;
drop trigger if exists trg_garde_org_delegation on public.org_delegations_droits;
drop policy if exists profiles_lecture_admin_mairie on public.profiles;
-- Rétablir org_gest / org_droit_propre / org_peut_accorder / saas_creer_commune / admin_attribuer / lier_adjoint
-- depuis les migrations 20261118210521, 20261118212626, 20261118212309, 20261118210757, 20261118153749, 20261119070000.
-- Si des profils admin_mairie existent : les passer d'abord en 'citoyen' (actif=false) AVANT de retirer la valeur de la contrainte.
alter table public.profiles drop constraint if exists profiles_admin_mairie_coherence, drop constraint if exists profiles_statut_admin_check;
-- (la colonne statut_admin peut rester ; la supprimer seulement avec accord)
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role = any (array['super_admin','maire','adjoint','cabinet','secretariat','finances','rh','etat_civil','technique','agent','citoyen']::text[]));
commit;
```
Retour front : restaurer `js/core.js`, `js/org.js`, `js/org-f.js`, `js/superadmin.js`, `mairie.html` depuis l'archive précédente. Edge Functions : redéployer les versions précédentes.

## 7. Tests
- `node tests/roles-admin-mairie.test.js` : contrat statique (migration, Edge Functions, interface).
- `bash tests/postgres/roles-admin-mairie-integration.sh` : 59 scénarios réels sur **PostgreSQL jetable** (statuts, escalades, isolation communes A/B, RLS, journal). Rejouable (repart d'un schéma `public` vierge ; refuse une base contenant des utilisateurs Auth non-test ou nommée *prod*). CI : `.github/workflows/postgres-concurrency.yml`.
- `bash tests/browser/run.sh` : test d'intégration SQL puis **test navigateur** (Chromium/Playwright, 53 contrôles) des interfaces Super Admin, Admin mairie, Maire, Agent. Prérequis : `npm i pg playwright` (`tests/browser/package.json`).
  - Backend simulé (`tests/browser/backend.js`) : lectures REST et RPC exécutées en **SQL réel** avec les claims JWT de l'utilisateur et le rôle `authenticated` (RLS appliquée) ; Edge `sa-admin` **émulée** d'après son code (Deno absent) ; écritures REST directes refusées et journalisées.
  - Limites : schéma et politiques RLS de substitution (`tests/browser/seed.sql`, `communes` et tables `org_*`) ; MFA simulée par la claim `aal` du JWT ; pas de test des Edge Functions réelles, du déploiement, ni du Turnstile/e-mails.
- Sans Docker : cluster PostgreSQL local éphémère en socket Unix (voir l'en-tête de `tests/browser/run.sh`).
