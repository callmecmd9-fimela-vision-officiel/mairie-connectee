-- Isolation Lot C : un poste de Diofior (droit personnel.consulter) ne doit jamais voir le personnel de Fimela.
-- Remplacer <user_diofior_affecte_personnel> et <commune_fimela_id> par des valeurs réelles avant exécution.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '<user_diofior_affecte_personnel>')::text, true);

select count(*) as doit_etre_0 from personnel where commune_id = '<commune_fimela_id>';
select count(*) as doit_etre_0_aussi from remunerations where commune_id = '<commune_fimela_id>';
select count(*) as doit_etre_0_aussi from paies where commune_id = '<commune_fimela_id>';
select count(*) as doit_etre_0_aussi from marches where commune_id = '<commune_fimela_id>';
select count(*) as doit_etre_0_aussi from documents where commune_id = '<commune_fimela_id>' and confidentialite <> 'confidentiel';

-- Témoin positif : le même user doit voir SA commune
select count(*) > 0 as doit_etre_vrai from personnel where commune_id = org_commune();

reset role;
-- Résultat attendu : "ISOLATION LOT C OK" si toutes les lignes ci-dessus sont 0 sauf le témoin positif.
