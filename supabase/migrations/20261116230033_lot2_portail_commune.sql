-- Lot 2 (16/11/2026). Additif : nouvelle fonction publique, aucune fonction/table/policy modifiée ou supprimée.
create or replace function public.portail_commune(p_commune text)
returns table(horaires text, email text, bandeau boolean)
language sql stable security definer set search_path = '' as $$
  select nullif(trim(i.horaires),''), nullif(trim(i.contact_email),''),
         exists(select 1 from storage.objects o where o.bucket_id='identite' and o.name=c.id::text||'/bandeau.webp')
  from public.communes c left join public.indicateurs i on i.commune_id=c.id
  where c.slug=p_commune and c.statut in ('essai','actif') $$;
revoke all on function public.portail_commune(text) from public;
grant execute on function public.portail_commune(text) to anon, authenticated;