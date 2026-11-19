-- Idempotent. Porte d'entrée citoyenne : couleur, blason public, résolution par sous-domaine.
alter table public.indicateurs add column if not exists couleur text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='indicateurs_couleur_chk') then
  alter table public.indicateurs add constraint indicateurs_couleur_chk check (couleur is null or couleur ~ '^#[0-9A-Fa-f]{6}$');
 end if; end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('identite','identite',true,300000,array['image/webp','image/jpeg','image/png']) on conflict(id) do nothing;

do $$ declare r text; begin
 foreach r in array array['select','insert','update','delete'] loop
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='identite_'||r) then
   execute format($f$create policy %I on storage.objects for %s to authenticated %s$f$,'identite_'||r,r,
    case r when 'insert' then $c$with check (bucket_id='identite' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id::text=(storage.foldername(name))[1] and p.role in ('maire','cabinet','secretariat')))$c$
    when 'update' then $c$using (bucket_id='identite' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id::text=(storage.foldername(name))[1] and p.role in ('maire','cabinet','secretariat'))) with check (bucket_id='identite' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id::text=(storage.foldername(name))[1] and p.role in ('maire','cabinet','secretariat')))$c$
    else $c$using (bucket_id='identite' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id::text=(storage.foldername(name))[1] and p.role in ('maire','cabinet','secretariat')))$c$ end);
  end if;
 end loop; end $$;

create or replace function public.identite_commune(p_commune text)
returns table(couleur text, blason boolean) language sql stable security definer set search_path='' as $$
 select i.couleur, exists(select 1 from storage.objects o where o.bucket_id='identite' and o.name=c.id::text||'/blason.webp')
 from public.communes c left join public.indicateurs i on i.commune_id=c.id
 where c.slug=p_commune and c.statut in ('essai','actif') $$;
revoke all on function public.identite_commune(text) from public;
grant execute on function public.identite_commune(text) to anon,authenticated;

create or replace function public.commune_par_hote(p_hote text)
returns table(id uuid, slug text, nom text) language sql stable security definer set search_path='' as $$
 select c.id,c.slug,c.nom from public.communes c
 where c.statut in ('essai','actif') and length(coalesce(p_hote,''))<=253
  and ((c.domaine_perso is not null and c.domaine_perso=lower(trim(p_hote)))
    or (c.sous_domaine is not null and c.sous_domaine=split_part(lower(trim(p_hote)),'.',1))) limit 1 $$;
revoke all on function public.commune_par_hote(text) from public;
grant execute on function public.commune_par_hote(text) to anon,authenticated;