-- Audit 3 (16/11/2026). Idempotent. Aucune table, donnée, fonction ou policy supprimée.
-- 1. creer_demande : refuse une commune non ouverte ; numéro de suivi non devinable (8 hex aléatoires sécurisés)
create or replace function public.creer_demande(p_commune text, p_type text, p_nom text, p_message text, p_objet text default null, p_contact text default null, p_pieces text[] default '{}')
returns text language plpgsql security definer set search_path = '' as $$
declare c public.communes; n text; sv text; pc text;
begin
  if p_type not in ('État civil','Audience','Aide sociale','Travaux publics','Urbanisme','Environnement','Éducation','Sport et culture','Commerce','Agriculture et pêche','Réclamations','Associations')
     or char_length(trim(coalesce(p_nom,''))) not between 1 and 120
     or char_length(trim(coalesce(p_message,''))) not between 1 and 2000
     or char_length(coalesce(p_objet,''))>200 or char_length(coalesce(p_contact,''))>40
     or cardinality(coalesce(p_pieces,'{}'))>3 then
    raise exception 'Demande invalide';
  end if;
  update public.communes set compteur=compteur+1 where slug=p_commune and statut in ('essai','actif') returning * into c;
  if c.id is null then raise exception 'Commune inconnue'; end if;
  foreach pc in array coalesce(p_pieces,'{}') loop
    if pc not like c.id::text||'/%' or char_length(pc)>200 or pc like '%..%' then raise exception 'Pièce invalide'; end if;
  end loop;
  sv := case p_type when 'État civil' then 'etat_civil' when 'Travaux publics' then 'technique' when 'Urbanisme' then 'technique' when 'Environnement' then 'technique' else 'secretariat' end;
  n := upper(left(c.slug,3))||'-'||lpad(c.compteur::text,4,'0')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.demandes(commune_id,numero,type,nom,message,objet,contact,pieces,service,citoyen_id)
  values (c.id,n,p_type,trim(p_nom),trim(p_message),nullif(trim(coalesce(p_objet,'')),''),nullif(trim(coalesce(p_contact,'')),''),coalesce(p_pieces,'{}'),sv,(select auth.uid()));
  return n;
end $$;

-- 2. Infos publiques : uniquement les communes ouvertes (comme commune_par_slug)
create or replace function public.infos_commune(p_commune text)
returns table(nom text, slogan text, devise text, tel text, adresse text)
language sql stable security definer set search_path = '' as $$
  select c.nom,i.slogan,i.devise,i.contact_tel,i.contact_adresse from public.communes c left join public.indicateurs i on i.commune_id=c.id
  where c.slug=p_commune and c.statut in ('essai','actif') $$;
create or replace function public.actualites(p_commune text)
returns table(texte text, jour date)
language sql stable security definer set search_path = '' as $$
  select p.texte,p.jour from public.publications p join public.communes c on c.id=p.commune_id
  where c.slug=p_commune and c.statut in ('essai','actif') and p.statut='publie' order by p.jour desc, p.created_at desc limit 10 $$;

-- 3. Défense en profondeur : droits inutiles retirés (PostgREST ne les utilise pas ; select/insert/update/delete inchangés)
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
  end loop; end $$;
