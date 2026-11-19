do $$
declare r record; u text; w text;
begin
  for r in select policyname, qual, with_check from pg_policies where schemaname='storage' and tablename='objects' and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(^|[^.])is_super_admin\(\)' loop
    u := replace(r.qual, 'is_super_admin()', 'public.is_super_admin()');
    w := replace(r.with_check, 'is_super_admin()', 'public.is_super_admin()');
    execute format('alter policy %I on storage.objects%s%s', r.policyname,
      case when u is not null then ' using ('||u||')' else '' end,
      case when w is not null then ' with check ('||w||')' else '' end);
  end loop;
end $$;