-- Portail fiscal : RLS proposée pour public.paiements_taxes (à comparer avec les politiques déjà en place).
alter table public.paiements_taxes enable row level security;
drop policy if exists ptx_cit_sel on public.paiements_taxes;
drop policy if exists ptx_cit_ins on public.paiements_taxes;
drop policy if exists ptx_staff_sel on public.paiements_taxes;
drop policy if exists ptx_staff_upd on public.paiements_taxes;
create policy ptx_cit_sel on public.paiements_taxes for select to authenticated using(citoyen_id=(select auth.uid()));
create policy ptx_cit_ins on public.paiements_taxes for insert to authenticated with check(citoyen_id=(select auth.uid()) and statut='en_attente');
create policy ptx_staff_sel on public.paiements_taxes for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=paiements_taxes.commune_id and p.role in('maire','finances','secretariat','agent')));
create policy ptx_staff_upd on public.paiements_taxes for update to authenticated
 using(statut='en_attente' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=paiements_taxes.commune_id and p.role in('maire','finances','secretariat','agent')))
 with check(statut='paye' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=paiements_taxes.commune_id and p.role in('maire','finances','secretariat','agent')));
grant select,insert on public.paiements_taxes to authenticated;
grant update(statut,quittance_url) on public.paiements_taxes to authenticated;
-- TEST UNIQUEMENT (« Simuler le paiement » côté citoyen) : à NE PAS activer en production, un citoyen pourrait se déclarer payeur.
-- create policy ptx_cit_sim on public.paiements_taxes for update to authenticated using(citoyen_id=(select auth.uid()) and statut='en_attente') with check(citoyen_id=(select auth.uid()) and statut='paye');
