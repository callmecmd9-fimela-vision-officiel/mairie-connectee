create extension if not exists pg_net with schema extensions;
select vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'purge_pieces_secret','Secret cron -> edge function purge-pieces');
create or replace function public.pieces_orphelines(p_secret text) returns table(name text) language plpgsql security definer set search_path='' as $$
begin
 if p_secret is null or p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where vault.decrypted_secrets.name='purge_pieces_secret') then raise exception 'Accès refusé' using errcode='42501'; end if;
 return query select o.name from storage.objects o where o.bucket_id='pieces' and o.created_at<now()-interval '24 hours' and not exists(select 1 from public.demandes d where o.name = any(d.pieces)) order by o.created_at limit 200;
end $$;
revoke all on function public.pieces_orphelines(text) from public, anon, authenticated;
grant execute on function public.pieces_orphelines(text) to service_role;
select cron.schedule('purge-pieces','40 3 * * 0',$c$select net.http_post(url:='https://aiqegpijisspankpkwfj.supabase.co/functions/v1/purge-pieces',headers:=jsonb_build_object('Content-Type','application/json','x-purge-secret',(select decrypted_secret from vault.decrypted_secrets where name='purge_pieces_secret')),body:='{}'::jsonb)$c$);