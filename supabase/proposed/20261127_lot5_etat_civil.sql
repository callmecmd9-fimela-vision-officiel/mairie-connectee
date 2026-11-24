-- LOT 5 : registre d'état civil, copies d'actes (PDF avec QR Code) et vérification publique.
-- Idempotent. Table unifiée public.actes_etat_civil (naissance / mariage / décès).
-- Les demandes de copie continuent d'utiliser public.demandes (type 'État civil'). « Validé » = statut 'traitee'.

-- 1. Registre -----------------------------------------------------------------------------------
create table if not exists public.actes_etat_civil(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 type_acte text not null check(type_acte in('naissance','mariage','deces')),
 numero_acte text not null check(numero_acte ~ '^[A-Za-z0-9/. -]{1,30}$'),
 annee_acte integer not null check(annee_acte between 1800 and 2200),
 date_evenement date not null,
 lieu_evenement text check(lieu_evenement is null or char_length(lieu_evenement)<=120),
 nom text not null check(char_length(trim(nom)) between 1 and 80),
 prenom text not null check(char_length(trim(prenom)) between 1 and 80),
 sexe text check(sexe is null or sexe in('M','F')),
 date_naissance date,
 lieu_naissance text check(lieu_naissance is null or char_length(lieu_naissance)<=120),
 profession text check(profession is null or char_length(profession)<=120),
 pere_nom text check(pere_nom is null or char_length(pere_nom)<=120),
 mere_nom text check(mere_nom is null or char_length(mere_nom)<=120),
 conjoint_nom text check(conjoint_nom is null or char_length(conjoint_nom)<=80),
 conjoint_prenom text check(conjoint_prenom is null or char_length(conjoint_prenom)<=80),
 conjoint_date_naissance date,
 conjoint_pere_nom text check(conjoint_pere_nom is null or char_length(conjoint_pere_nom)<=120),
 conjoint_mere_nom text check(conjoint_mere_nom is null or char_length(conjoint_mere_nom)<=120),
 officier_etat_civil text check(officier_etat_civil is null or char_length(officier_etat_civil)<=120),
 observations text check(observations is null or char_length(observations)<=1000),
 saisi_par uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint actes_mariage_conjoint check(type_acte<>'mariage' or (conjoint_nom is not null and conjoint_prenom is not null))
);
create unique index if not exists actes_ec_unique_idx on public.actes_etat_civil(commune_id,type_acte,annee_acte,upper(numero_acte));
create index if not exists actes_ec_commune_idx on public.actes_etat_civil(commune_id,type_acte,annee_acte desc);
create index if not exists actes_ec_nom_idx on public.actes_etat_civil(commune_id,upper(nom));

create or replace function public.trg_actes_ec_garde() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.date_evenement>current_date then raise exception 'La date de l''évènement ne peut pas être dans le futur'; end if;
 if tg_op='UPDATE' then
  if new.commune_id is distinct from old.commune_id or new.saisi_par is distinct from old.saisi_par or new.created_at is distinct from old.created_at then
   raise exception 'Champ non modifiable';
  end if;
 else
  new.saisi_par:=auth.uid();
 end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function public.trg_actes_ec_garde() from public,anon,authenticated;
drop trigger if exists actes_ec_garde on public.actes_etat_civil;
create trigger actes_ec_garde before insert or update on public.actes_etat_civil for each row execute function public.trg_actes_ec_garde();

alter table public.actes_etat_civil enable row level security;
drop policy if exists actes_ec_sel on public.actes_etat_civil;
drop policy if exists actes_ec_ins on public.actes_etat_civil;
drop policy if exists actes_ec_upd on public.actes_etat_civil;
create policy actes_ec_sel on public.actes_etat_civil for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=actes_etat_civil.commune_id and p.role in('maire','adjoint','secretariat','agent','etat_civil')));
create policy actes_ec_ins on public.actes_etat_civil for insert to authenticated
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=actes_etat_civil.commune_id and p.role in('maire','adjoint','secretariat','agent','etat_civil')));
create policy actes_ec_upd on public.actes_etat_civil for update to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=actes_etat_civil.commune_id and p.role in('maire','adjoint','secretariat','agent','etat_civil')))
 with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=actes_etat_civil.commune_id and p.role in('maire','adjoint','secretariat','agent','etat_civil')));
-- aucun DELETE : un registre d'état civil ne s'efface pas
revoke all on public.actes_etat_civil from anon,authenticated;
grant select on public.actes_etat_civil to authenticated;
grant insert(commune_id,type_acte,numero_acte,annee_acte,date_evenement,lieu_evenement,nom,prenom,sexe,date_naissance,lieu_naissance,profession,pere_nom,mere_nom,conjoint_nom,conjoint_prenom,conjoint_date_naissance,conjoint_pere_nom,conjoint_mere_nom,officier_etat_civil,observations) on public.actes_etat_civil to authenticated;
grant update(type_acte,numero_acte,annee_acte,date_evenement,lieu_evenement,nom,prenom,sexe,date_naissance,lieu_naissance,profession,pere_nom,mere_nom,conjoint_nom,conjoint_prenom,conjoint_date_naissance,conjoint_pere_nom,conjoint_mere_nom,officier_etat_civil,observations) on public.actes_etat_civil to authenticated;

-- 2. Copies délivrées (une par demande, référence unique encodée dans le QR Code) -------------------
create table if not exists public.actes_copies(
 id uuid primary key default gen_random_uuid(),
 commune_id uuid not null references public.communes(id) on delete cascade,
 demande_id uuid not null unique references public.demandes(id) on delete cascade,
 acte_id uuid not null references public.actes_etat_civil(id) on delete restrict,
 reference text not null unique check(reference ~ '^[A-Z0-9-]{10,60}$'),
 delivre_par uuid default auth.uid(),
 created_at timestamptz not null default now()
);
create index if not exists actes_copies_commune_idx on public.actes_copies(commune_id,created_at desc);
create index if not exists actes_copies_acte_idx on public.actes_copies(acte_id);
alter table public.actes_copies enable row level security;
drop policy if exists actes_copies_sel on public.actes_copies;
create policy actes_copies_sel on public.actes_copies for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.commune_id=actes_copies.commune_id and p.role in('maire','adjoint','secretariat','agent','etat_civil')));
revoke all on public.actes_copies from anon,authenticated;
grant select on public.actes_copies to authenticated;

-- 3. Génération de la copie : demande « Validée » (statut traitee), même commune, même type d'acte
create or replace function public.generer_copie_acte(p_demande uuid,p_acte uuid) returns text
language plpgsql security definer set search_path='' as $$
declare d public.demandes; a public.actes_etat_civil; c public.actes_copies; t text; k text; ref text;
begin
 if auth.uid() is null then raise exception 'Session requise'; end if;
 select * into d from public.demandes where id=p_demande for update;
 if d.id is null then raise exception 'Demande introuvable'; end if;
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.commune_id=d.commune_id and p.role in('maire','adjoint','secretariat','agent','etat_civil')) then
  raise exception 'Accès refusé';
 end if;
 if d.type<>'État civil' then raise exception 'Cette demande n''est pas une demande d''état civil'; end if;
 if d.statut<>'traitee' then raise exception 'La demande doit être validée avant de générer la copie'; end if;
 select * into c from public.actes_copies where demande_id=d.id;
 if c.id is not null then return c.reference; end if;
 select * into a from public.actes_etat_civil where id=p_acte and commune_id=d.commune_id;
 if a.id is null then raise exception 'Acte introuvable dans le registre de la commune'; end if;
 t:=lower(translate(coalesce(d.objet,'')||' '||coalesce(d.message,''),'éèêÉÈÊ','eeeEEE'));
 k:=case when t like '%naissance%' then 'naissance' when t like '%mariage%' then 'mariage' when t like '%deces%' then 'deces' end;
 if k is not null and k<>a.type_acte then raise exception 'Le type de l''acte ne correspond pas à la demande'; end if;
 ref:='EC-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 insert into public.actes_copies(commune_id,demande_id,acte_id,reference) values(d.commune_id,d.id,a.id,ref);
 return ref;
end $$;
revoke all on function public.generer_copie_acte(uuid,uuid) from public,anon;
grant execute on function public.generer_copie_acte(uuid,uuid) to authenticated;

-- 4. Vérification publique (QR Code) : données minimales, identité masquée
create or replace function public.verifier_acte(p_ref text)
returns table(commune text,type_acte text,numero_acte text,annee_acte integer,titulaire text,date_delivrance timestamptz)
language sql stable security definer set search_path='' as $$
 select c.nom,a.type_acte,a.numero_acte,a.annee_acte,
  upper(left(a.nom,1))||'*** '||upper(left(a.prenom,1))||'***',x.created_at
 from public.actes_copies x
 join public.actes_etat_civil a on a.id=x.acte_id
 join public.communes c on c.id=x.commune_id
 where x.reference=upper(trim(p_ref)) and upper(trim(p_ref)) ~ '^[A-Z0-9-]{10,60}$' $$;
revoke all on function public.verifier_acte(text) from public;
grant execute on function public.verifier_acte(text) to anon,authenticated;
