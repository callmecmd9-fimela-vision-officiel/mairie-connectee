-- Lot E2 : écritures des postes (org_droit) sur personnel, remunerations, conges, conges_droits, marches, documents.
-- ADDITIF (policies permissives en plus des policies historiques ; isolation_commune RESTRICTIVE s'applique toujours). Actions : INSERT=creer, UPDATE=modifier, DELETE=supprimer.
-- documents : jamais le confidentiel par cette voie. paies/paie_lignes : écriture uniquement par RPC (lot E).
do $$
declare x record;
begin
 for x in select * from (values ('personnel','personnel',''),('remunerations','remun',''),('conges','conges',''),('conges_droits','conges',''),('marches','marches',''),('documents','archives',' and confidentialite<>''confidentiel''')) v(t,m,extra)
 loop
  execute format('drop policy if exists %I on public.%I', x.t||'_org_ins', x.t);
  execute format('create policy %I on public.%I for insert to authenticated with check (commune_id=(select org_commune()) and (select org_droit(%L,%L))%s)', x.t||'_org_ins', x.t, x.m, 'creer', x.extra);
  execute format('drop policy if exists %I on public.%I', x.t||'_org_upd', x.t);
  execute format('create policy %I on public.%I for update to authenticated using (commune_id=(select org_commune()) and (select org_droit(%L,%L))%s) with check (commune_id=(select org_commune()) and (select org_droit(%L,%L))%s)', x.t||'_org_upd', x.t, x.m, 'modifier', x.extra, x.m, 'modifier', x.extra);
  execute format('drop policy if exists %I on public.%I', x.t||'_org_del', x.t);
  execute format('create policy %I on public.%I for delete to authenticated using (commune_id=(select org_commune()) and (select org_droit(%L,%L))%s)', x.t||'_org_del', x.t, x.m, 'supprimer', x.extra);
 end loop;
end $$;