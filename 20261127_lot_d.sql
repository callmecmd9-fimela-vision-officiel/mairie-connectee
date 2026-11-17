-- Lot D : durcissement de org_tracer + index de lecture du journal. ADDITIF, idempotent, aucune policy modifiée.
create or replace function org_tracer(p_module text, p_cible text default null)
returns void language sql security definer set search_path = public as $$
  insert into acces_sensibles(commune_id,user_id,module,cible)
  select org_commune(), auth.uid(), left(p_module,40), left(p_cible,200) where org_commune() is not null and auth.uid() is not null;
$$;
revoke all on function org_tracer(text,text) from public, anon;
grant execute on function org_tracer(text,text) to authenticated;
create index if not exists acces_sensibles_commune_idx on acces_sensibles(commune_id, created_at desc);
