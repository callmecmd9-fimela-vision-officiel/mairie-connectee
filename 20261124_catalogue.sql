-- Lot 3 + 5 : catalogue configurable par commune + routage vers le service. Idempotent, rien n'est supprimé (sauf l'ancienne signature de 2 fonctions, recréées).
alter table public.demarches
 add column if not exists famille text,
 add column if not exists service text,
 add column if not exists frais text,
 add column if not exists retrait text,
 add column if not exists modele text,
 add column if not exists statut text;
update public.demarches set statut=case when actif then 'actif' else 'inactif' end where statut is null;
alter table public.demarches alter column statut set default 'actif', alter column statut set not null;
alter table public.demarches drop constraint if exists demarches_statut_check, drop constraint if exists demarches_service_check, drop constraint if exists demarches_modele_check;
alter table public.demarches
 add constraint demarches_statut_check check (statut in ('actif','inactif','archive')),
 add constraint demarches_service_check check (service is null or service in ('secretariat','etat_civil','technique','finances','rh','maire','adjoint','externe')),
 add constraint demarches_modele_check check (modele is null or modele in ('identite','legalisation','foncier','social','libre')),
 add constraint demarches_longueurs_check check (char_length(coalesce(frais,''))<=120 and char_length(coalesce(retrait,''))<=500 and char_length(coalesce(famille,''))<=80);
-- actif reste cohérent avec statut (l'ancien écran qui bascule « actif » continue de fonctionner)
create or replace function public.demarches_sync() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.actif is distinct from old.actif and new.statut is not distinct from old.statut then
  new.statut:=case when new.actif then 'actif' else 'inactif' end;
 end if;
 new.actif:=(new.statut='actif'); return new; end $$;
drop trigger if exists demarches_sync_tg on public.demarches;
create trigger demarches_sync_tg before insert or update on public.demarches for each row execute function public.demarches_sync();

-- RPC publique : uniquement les prestations ACTIVES de la commune demandée (slug)
drop function if exists public.demarches_commune(text);
create function public.demarches_commune(p_commune text)
returns table(id uuid,type text,titre text,description text,pieces text,conditions text,delai text,autorite text,famille text,service text,frais text,retrait text,modele text,statut text)
language sql stable security definer set search_path='' as $$
 select d.id,d.type,d.titre,d.description,d.pieces,d.conditions,d.delai,d.autorite,d.famille,d.service,d.frais,d.retrait,d.modele,d.statut
 from public.demarches d join public.communes c on c.id=d.commune_id
 where c.slug=p_commune and c.statut in ('essai','actif') and d.statut='actif' order by d.famille nulls last,d.titre $$;
revoke all on function public.demarches_commune(text) from public;
grant execute on function public.demarches_commune(text) to anon,authenticated;

-- Lot 5 : creer_demande accepte la prestation choisie ; type et service viennent de la base (même commune obligatoire, prestation active)
drop function if exists public.creer_demande(text,text,text,text,text,text,text[]);
create function public.creer_demande(p_commune text, p_type text, p_nom text, p_message text, p_objet text default null, p_contact text default null, p_pieces text[] default '{}', p_demarche uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare c public.communes; n text; sv text; pc text; dm public.demarches;
begin
  if char_length(trim(coalesce(p_nom,''))) not between 1 and 120
     or char_length(trim(coalesce(p_message,''))) not between 1 and 2000
     or char_length(coalesce(p_objet,''))>200 or char_length(coalesce(p_contact,''))>40
     or cardinality(coalesce(p_pieces,'{}'))>3 then raise exception 'Demande invalide'; end if;
  update public.communes set compteur=compteur+1 where slug=p_commune and statut in ('essai','actif') returning * into c;
  if c.id is null then raise exception 'Commune inconnue'; end if;
  if p_demarche is not null then
    select * into dm from public.demarches where id=p_demarche and commune_id=c.id and statut='actif';
    if dm.id is null then raise exception 'Démarche invalide'; end if;
    p_type:=dm.type;
  end if;
  if p_type not in ('État civil','Audience','Aide sociale','Travaux publics','Urbanisme','Environnement','Éducation','Sport et culture','Commerce','Agriculture et pêche','Réclamations','Associations') then raise exception 'Demande invalide'; end if;
  foreach pc in array coalesce(p_pieces,'{}') loop
    if pc not like c.id::text||'/%' or char_length(pc)>200 or pc like '%..%' then raise exception 'Pièce invalide'; end if;
  end loop;
  sv := coalesce(dm.service, case p_type when 'État civil' then 'etat_civil' when 'Travaux publics' then 'technique' when 'Urbanisme' then 'technique' when 'Environnement' then 'technique' else 'secretariat' end);
  n := upper(left(c.slug,3))||'-'||lpad(c.compteur::text,4,'0')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.demandes(commune_id,numero,type,nom,message,objet,contact,pieces,service,citoyen_id)
  values (c.id,n,p_type,trim(p_nom),trim(p_message),nullif(trim(coalesce(p_objet,'')),''),nullif(trim(coalesce(p_contact,'')),''),coalesce(p_pieces,'{}'),sv,(select auth.uid()));
  return n;
end $$;
revoke all on function public.creer_demande(text,text,text,text,text,text,text[],uuid) from public;
grant execute on function public.creer_demande(text,text,text,text,text,text,text[],uuid) to authenticated;

-- Catalogue de départ de Fimela : aucun frais, pièce ou délai inventé. Seuls les 4 documents validés sont actifs.
with c as (select id from public.communes where slug='fimela'),
v(famille,type,titre,service,modele,statut) as (values
 ('État civil','État civil','Extrait de naissance','etat_civil','libre','actif'),
 ('État civil','État civil','Extrait de mariage','etat_civil','libre','actif'),
 ('État civil','État civil','Extrait de décès','etat_civil','libre','actif'),
 ('État civil','État civil','Copie littérale d’acte de naissance','etat_civil','libre','inactif'),
 ('État civil','État civil','Copie littérale d’acte de mariage','etat_civil','libre','inactif'),
 ('État civil','État civil','Copie littérale d’acte de décès','etat_civil','libre','inactif'),
 ('Certificats et attestations','État civil','Certificat de résidence','etat_civil','identite','actif'),
 ('Certificats et attestations','État civil','Certificat de vie','etat_civil','identite','inactif'),
 ('Certificats et attestations','État civil','Certificat de vie et d’entretien','etat_civil','identite','inactif'),
 ('Certificats et attestations','État civil','Certificat de célibat','etat_civil','identite','inactif'),
 ('Certificats et attestations','État civil','Certificat de non-remariage','etat_civil','identite','inactif'),
 ('Certificats et attestations','État civil','Certificat de non-divorce','etat_civil','identite','inactif'),
 ('Certificats et attestations','État civil','Certificat d’individualité','etat_civil','identite','inactif'),
 ('Certificats et attestations','État civil','Certificat de non-inscription au registre d’état civil','etat_civil','identite','inactif'),
 ('Certificats et attestations','Aide sociale','Certificat d’indigence','secretariat','social','inactif'),
 ('Légalisations et certifications','État civil','Légalisation de signature','secretariat','legalisation','inactif'),
 ('Légalisations et certifications','État civil','Certification conforme de photocopies','secretariat','legalisation','inactif'),
 ('Foncier et urbanisme','Urbanisme','Demande d’affectation de terre','technique','foncier','inactif'),
 ('Foncier et urbanisme','Urbanisme','Demande d’extrait de délibération foncière','secretariat','foncier','inactif'),
 ('Foncier et urbanisme','Urbanisme','Demande relative à une délibération foncière','secretariat','foncier','inactif'),
 ('Foncier et urbanisme','Urbanisme','Demande de régularisation foncière','technique','foncier','inactif'),
 ('Foncier et urbanisme','Urbanisme','Demande d’autorisation de construire','technique','foncier','inactif'),
 ('Action sociale et services communaux','Aide sociale','Demande d’aide sociale','secretariat','social','inactif'),
 ('Action sociale et services communaux','Aide sociale','Demande d’assistance aux personnes vulnérables','secretariat','social','inactif'),
 ('Action sociale et services communaux','Aide sociale','Demande d’appui communal','secretariat','social','inactif'),
 ('Action sociale et services communaux','Sport et culture','Réservation d’une salle ou d’un équipement communal','secretariat','libre','inactif'),
 ('Action sociale et services communaux','Urbanisme','Autorisation d’occupation du domaine public','technique','foncier','inactif'))
insert into public.demarches(commune_id,famille,type,titre,service,modele,statut)
select c.id,v.famille,v.type,v.titre,v.service,v.modele,v.statut from c,v
where not exists(select 1 from public.demarches d where d.commune_id=c.id and d.titre=v.titre);
