create policy bloque_anonymes_communes on public.communes as restrictive for all to authenticated
using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false)
with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean,false)=false);