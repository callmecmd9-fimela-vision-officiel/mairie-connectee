-- Lot 7 : catégories d'infos + projets publiables (idempotent)
alter table public.publications add column if not exists categorie text not null default 'actualite';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='publications_categorie_chk') then
    alter table public.publications add constraint publications_categorie_chk check (categorie in ('actualite','communique','avis','evenement'));
  end if; end $$;
alter table public.projets add column if not exists public boolean not null default false;

drop function if exists public.actualites(text);
create function public.actualites(p_commune text)
returns table(texte text, jour date, categorie text)
language sql stable security definer set search_path = '' as $$
  select p.texte,p.jour,p.categorie from public.publications p join public.communes c on c.id=p.commune_id
  where c.slug=p_commune and c.statut in ('essai','actif') and p.statut='publie' order by p.jour desc, p.created_at desc limit 10 $$;

create or replace function public.projets_publics(p_commune text)
returns table(titre text, localite text, categorie text, statut text, avancement int, date_fin date)
language sql stable security definer set search_path = '' as $$
  select j.titre,j.localite,j.categorie,j.statut,j.avancement::int,j.date_fin from public.projets j join public.communes c on c.id=j.commune_id
  where c.slug=p_commune and c.statut in ('essai','actif') and j.public and j.statut<>'suspendu' order by j.created_at desc limit 20 $$;

revoke all on function public.actualites(text), public.projets_publics(text) from public;
grant execute on function public.actualites(text), public.projets_publics(text) to anon, authenticated;
