create or replace function private.commune_ouverte(p_id text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.communes c where c.id::text=p_id and c.statut in ('essai','actif')) $$;
revoke all on function private.commune_ouverte(text) from public, anon;
grant execute on function private.commune_ouverte(text) to authenticated;
drop policy pieces_depot on storage.objects;
create policy pieces_depot on storage.objects for insert to authenticated
with check (bucket_id='pieces' and private.commune_ouverte((storage.foldername(name))[1]) and (select private.nb_pieces((select auth.uid())::text)) < 3);