revoke execute on function public._garde() from authenticated;

do $$
declare t text;
begin
  foreach t in array array['parametres_systeme','permissions_roles','journal_audit','sauvegardes','incidents'] loop
    execute format('drop policy if exists bloque_anonymes_%s on public.%I', t, t);
    execute format($f$create policy bloque_anonymes_%s on public.%I as restrictive for all to authenticated
      using (coalesce((select ((auth.jwt() ->> 'is_anonymous'))::boolean), false) = false)
      with check (coalesce((select ((auth.jwt() ->> 'is_anonymous'))::boolean), false) = false)$f$, t, t);
  end loop;
end $$;