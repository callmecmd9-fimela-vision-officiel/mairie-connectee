do $$
declare r record; e text := $e$coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false) = false$e$;
begin
  for r in select tablename, policyname from pg_policies where schemaname='public' and policyname like 'bloque_anonymes_%' loop
    execute format('alter policy %I on public.%I using (%s) with check (%s)', r.policyname, r.tablename, e, e);
  end loop;
end $$;