-- Jeu de données du test navigateur (base JETABLE, après roles-admin-mairie-integration.sh).
set session_replication_role = replica;
truncate public.profiles, public.platform_admins, public.platform_audit, public.journal_audit, public.adjoints,
  public.org_roles, public.org_postes, public.org_role_droits, public.org_affectations, public.org_delegations_droits, public.communes, auth.users cascade;
set session_replication_role = origin;
-- colonnes lues par l'interface et absentes des stubs
alter table public.org_roles add column if not exists nom text, add column if not exists description text, add column if not exists created_at timestamptz default now();
alter table public.org_postes add column if not exists nom text, add column if not exists famille text, add column if not exists parent_code text, add column if not exists service_code text;
alter table public.org_affectations add column if not exists created_at timestamptz default now();
alter table public.org_delegations_droits add column if not exists created_at timestamptz default now();
-- RLS de substitution (les vraies politiques sont dans l'historique Supabase, non rejouable ici)
alter table public.communes enable row level security;
drop policy if exists t_comm on public.communes; create policy t_comm on public.communes for select to authenticated using (public.is_super_admin() or id = private.my_commune());
do $x$ declare t text; begin foreach t in array array['org_roles','org_postes','org_role_droits','org_affectations','org_delegations_droits'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('drop policy if exists t_iso on public.%I', t);
  execute format('create policy t_iso on public.%I for select to authenticated using (public.is_super_admin() or commune_id = private.my_commune())', t); end loop; end $x$;
grant select on all tables in schema public to authenticated;

insert into public.communes(id,nom,slug,statut) values
 ('aaaaaaaa-0000-0000-0000-00000000000a','Commune A','commune-a','actif'),('bbbbbbbb-0000-0000-0000-00000000000b','Commune B','commune-b','actif');
insert into auth.users(id,email,email_confirmed_at) select test.uid(n),'u'||n||'@example.test',case when n=7 then null else now() end from generate_series(1,10) n;
update auth.users set email='superadmin@example.test' where id=test.uid(1);
insert into public.platform_admins(user_id,email) values (test.uid(1),'superadmin@example.test');
insert into public.plans values ('essentiel',true) on conflict do nothing;
insert into public.profiles(id,role,commune_id,actif,nom) values
 (test.uid(1),'super_admin',null,true,'Super Admin'),
 (test.uid(2),'maire','aaaaaaaa-0000-0000-0000-00000000000a',true,'Maire A'),
 (test.uid(5),'agent','aaaaaaaa-0000-0000-0000-00000000000a',true,'Agent A'),
 (test.uid(6),'citoyen',null,true,'Citoyen six'),(test.uid(7),'citoyen',null,true,'Citoyen sept non confirmé'),(test.uid(11),'citoyen',null,true,'x') on conflict do nothing;
insert into public.profiles(id,role,commune_id,actif,nom) values (test.uid(9),'maire','bbbbbbbb-0000-0000-0000-00000000000b',true,'Maire B');
insert into public.profiles(id,role,commune_id,actif,nom) values
 (test.uid(3),'admin_mairie','aaaaaaaa-0000-0000-0000-00000000000a',true,'Admin A'),
 (test.uid(4),'admin_mairie','bbbbbbbb-0000-0000-0000-00000000000b',true,'Admin B'),
 (test.uid(8),'admin_mairie',null,false,'Admin en attente'),
 (test.uid(10),'admin_mairie','aaaaaaaa-0000-0000-0000-00000000000a',false,'Admin suspendu A');
update public.profiles set nom='Citoyen onze' where id=test.uid(11);
insert into public.org_roles(commune_id,code,nom,actif) values ('aaaaaaaa-0000-0000-0000-00000000000a','secretaire','Secrétaire A',true),('bbbbbbbb-0000-0000-0000-00000000000b','secretaire','Secrétaire B',true);
insert into public.org_postes(commune_id,code,nom,actif,role_code) values ('aaaaaaaa-0000-0000-0000-00000000000a','sec1','Poste secrétariat A',true,'secretaire'),('bbbbbbbb-0000-0000-0000-00000000000b','secb','Poste secrétariat B',true,'secretaire');
alter table public.adjoints add column if not exists rang int;
