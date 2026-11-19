create or replace function private.nb_pieces(p_uid text) returns integer language sql stable security definer set search_path='' as $$
select count(*)::int from storage.objects o where o.bucket_id='pieces' and o.owner_id=p_uid
$$;
revoke all on function private.nb_pieces(text) from public, anon;
grant execute on function private.nb_pieces(text) to authenticated;
alter policy pieces_depot on storage.objects with check (
  bucket_id = 'pieces' and (storage.foldername(name))[1] in (select c.id::text from public.communes c)
  and (select private.nb_pieces((select auth.uid())::text)) < 3);