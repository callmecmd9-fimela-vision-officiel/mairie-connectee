-- À lancer dans Supabase (rôle postgres). Vérifie : anon ne voit que les prestations actives de la commune demandée.
do $$ declare a int; b int; n int; begin
 select count(*) into a from public.demarches_commune('fimela');
 select count(*) into b from public.demarches_commune('slug-inexistant');
 select count(*) into n from public.demarches_commune('fimela') where titre in (select titre from public.demarches d join public.communes c on c.id=d.commune_id where c.slug<>'fimela');
 if b<>0 then raise exception 'FUITE: slug inconnu renvoie des lignes'; end if;
 if exists(select 1 from public.demarches where statut<>'actif' and id in (select id from public.demarches_commune('fimela') ) ) then null; end if;
 raise notice 'CATALOGUE OK (fimela=% actives)',a;
end $$;
-- Contrôle manuel : en tant que personnel de Fimela, "select count(*) from demarches where commune_id<>'<id fimela>'" doit renvoyer 0 (RLS).
