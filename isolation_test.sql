-- Test d'isolation à coller dans Supabase > SQL Editor. Lecture seule, tout est annulé (rollback). Exige >= 2 communes et 1 maire/secrétariat.
begin;
do $$
declare a record; b record; u uuid; n int; ok boolean;
begin
  select id,slug into a from communes order by created_at limit 1;
  select id,slug into b from communes where id<>a.id order by created_at limit 1;
  if b.id is null then raise exception 'Il faut 2 communes pour ce test'; end if;
  -- 1) anon : numéros d'une commune lus avec le slug d'une autre = 0 ligne
  set local role anon;
  select count(*) into n from mes_rdvs(b.slug, array(select numero from (select 'x'::text numero) q)); 
  if n<>0 then raise exception 'FAIL mes_rdvs anon'; end if;
  select annuler_rdv(b.slug,'RDV-INEXISTANT') into ok; if ok then raise exception 'FAIL annuler_rdv'; end if;
  select count(*) into n from suivre_demandes(b.slug, array['X']); if n<>0 then raise exception 'FAIL suivre'; end if;
  begin perform 1 from rdv_demandes limit 1; raise exception 'FAIL anon lit rdv_demandes'; exception when insufficient_privilege then null; end;
  reset role;
  -- 2) personnel de A : ne voit rien de B (tables à commune_id)
  select p.id into u from profiles p where p.commune_id=a.id and p.role in('maire','cabinet','secretariat') limit 1;
  if u is null then raise exception 'Aucun personnel dans %',a.slug; end if;
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  set local role authenticated;
  select count(*) into n from rdv_demandes where commune_id<>a.id; if n<>0 then raise exception 'FAIL rdv_demandes fuite'; end if;
  select count(*) into n from demandes where commune_id<>a.id;     if n<>0 then raise exception 'FAIL demandes fuite'; end if;
  select count(*) into n from rdv_planning where commune_id<>a.id; if n<>0 then raise exception 'FAIL planning fuite'; end if;
  select count(*) into n from projets where commune_id<>a.id;      if n<>0 then raise exception 'FAIL projets fuite'; end if;
  select count(*) into n from publications where commune_id<>a.id; if n<>0 then raise exception 'FAIL publications fuite'; end if;
  reset role;
  raise notice 'ISOLATION OK (% / %)',a.slug,b.slug;
end $$;
rollback;
