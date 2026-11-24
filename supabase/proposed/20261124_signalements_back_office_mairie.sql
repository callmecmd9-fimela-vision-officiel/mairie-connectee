-- Back-office mairie des signalements citoyens : lecture et changement de statut limités à la commune du personnel.
-- À appliquer après vérification (le front fonctionne sans, mais la liste restera vide / la mise à jour sera refusée).
alter table public.signalements_citoyens enable row level security;
drop policy if exists sigc_staff_sel on public.signalements_citoyens;
drop policy if exists sigc_staff_upd on public.signalements_citoyens;
create policy sigc_staff_sel on public.signalements_citoyens for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=signalements_citoyens.commune_id and p.role in('maire','adjoint','cabinet','secretariat','technique')));
create policy sigc_staff_upd on public.signalements_citoyens for update to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=signalements_citoyens.commune_id and p.role in('maire','adjoint','cabinet','secretariat','technique')))
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=signalements_citoyens.commune_id and p.role in('maire','adjoint','cabinet','secretariat','technique')) and statut in('nouveau','en_cours','resolu','rejete'));
grant select on public.signalements_citoyens to authenticated;
grant update(statut) on public.signalements_citoyens to authenticated;
