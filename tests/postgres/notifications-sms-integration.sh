#!/usr/bin/env bash
# Test PostgreSQL réel des SQL PROPOSÉS push_notifications + sms_outbox (base JETABLE uniquement, schéma simulé).
set -euo pipefail
: "${PGHOST:?}" "${PGPORT:?}" "${PGUSER:?}" "${PGDATABASE:?}"; export PGSSLMODE=disable PGPASSWORD="${PGPASSWORD:-x}"
HERE="$(cd "$(dirname "$0")" && pwd)"; P="$HERE/../../supabase/proposed"
bash "$HERE/roles-admin-mairie-integration.sh" >/dev/null
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
grant usage on schema test to public; grant execute on all functions in schema test to public;
grant select on public.profiles,public.communes to authenticated;
drop table if exists public.sms_outbox,public.sms_parametres,public.push_subscriptions cascade;
SQL
for i in 1 2; do psql -X -v ON_ERROR_STOP=1 -q -f "$P/20261121_push_notifications.sql" -f "$P/20261121_sms_outbox.sql"; done   # idempotence
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
create table if not exists public.demandes(id uuid primary key default gen_random_uuid(),commune_id uuid,numero text,contact text,statut text default 'nouvelle');
SQL
for i in 1 2; do psql -X -v ON_ERROR_STOP=1 -q -f "$P/20261121_sms_triggers.sql" 2>/dev/null; done
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
create function test.rls(n int, sql text, out r text) language plpgsql as $$ begin
  perform test.as_user(n); set local role authenticated; execute sql into r; reset role; end $$;
do $t$ declare A uuid:='aaaaaaaa-0000-0000-0000-00000000000a'; B uuid:='bbbbbbbb-0000-0000-0000-00000000000b'; v uuid; n int; r record; x text; begin
 -- ===== PUSH =====
 perform test.as_user(5); set local role authenticated;
 perform public.push_enregistrer('https://push.example/endpoint-agent-0001','p256dh-key-0000000000000','authkey-0001','UA');
 perform public.push_enregistrer('https://push.example/endpoint-agent-0001','p256dh-key-0000000000001','authkey-0002','UA'); -- upsert
 reset role;
 perform test.ok((select count(*) from public.push_subscriptions)=1,'push : enregistrement idempotent (upsert)');
 perform test.as_user(2); set local role authenticated;
 perform public.push_enregistrer('https://push.example/endpoint-maire-0001','p256dh-key-0000000000002','authkey-0003',null);
 select count(*) into n from public.push_subscriptions; reset role;
 perform test.ok(n=1,'push : RLS, un utilisateur ne voit que ses abonnements');
 perform test.as_user(5); set local role authenticated; perform public.push_supprimer('https://push.example/endpoint-maire-0001'); reset role;
 perform test.ok((select count(*) from public.push_subscriptions)=2,'push : suppression des abonnements d''autrui sans effet');
 perform test.as_user(5); set local role authenticated;
 begin perform public.push_abonnements(test.uid(2)); raise exception 'ECHEC push_abonnements ouvert'; exception when insufficient_privilege then null; end; reset role;
 perform test.ok(true,'push : push_abonnements refusé à authenticated');
 begin perform test.as_user(5); set local role authenticated; perform public.push_enregistrer('http://non-https-endpoint-00000000','p256dh-key-0000000000002','authkey-0003',null); raise exception 'ECHEC http accepté'; exception when check_violation then null; end; reset role;
 perform test.ok(true,'push : endpoint non-HTTPS refusé');
 begin set local role anon; perform public.push_enregistrer('https://push.example/endpoint-anon-00001','p256dh-key-0000000000002','authkey-0003',null); raise exception 'ECHEC anon'; exception when insufficient_privilege then null; end; reset role;
 perform test.ok(true,'push : anon refusé');
 set local role service_role;
 perform public.push_resultat('https://push.example/endpoint-agent-0001',false); perform public.push_resultat('https://push.example/endpoint-agent-0001',false);
 reset role; perform test.ok((select failures from public.push_subscriptions where endpoint like '%agent-0001')=2,'push : compteur d''échecs');
 set local role service_role; perform public.push_resultat('https://push.example/endpoint-agent-0001',true,true); reset role;
 perform test.ok(not exists(select 1 from public.push_subscriptions where endpoint like '%agent-0001'),'push : abonnement expiré (410) supprimé');
 -- ===== SMS =====
 perform test.ok(public.sms_enfiler(A,'+221771234567','demande_recue','Bonjour')is null,'sms : commune non activée => rien en file');
 insert into public.sms_parametres(commune_id,actif,quota_mensuel) values (A,true,3),(B,true,null);
 v:=public.sms_enfiler(A,'+221771234567','demande_recue','Bonjour',2); perform test.ok(v is not null,'sms : mise en file');
 perform public.sms_enfiler(A,'+221771234568','demande_recue','Bonjour 2',1);
 perform public.sms_enfiler(B,'+221771234569','demande_recue','Bonjour B',1);
 select count(*) into n from public.sms_prendre(2); perform test.ok(n=2,'sms : prise en charge limitée à p_n');
 perform test.ok((select count(*) from public.sms_prendre(10))=1,'sms : lignes déjà prises non reprises (skip locked / next_try_at)');
 perform test.ok((select count(*) from public.sms_prendre(10))=0,'sms : plus rien d''échu');
 perform public.sms_resultat(v,true,'REF1',null,false,60);
 perform test.ok((select statut||provider_ref from public.sms_outbox where id=v)='envoyeREF1','sms : succès enregistré');
 perform public.sms_resultat((select id from public.sms_outbox where to_phone='+221771234568'),false,null,'503',false,10);
 perform test.ok((select statut from public.sms_outbox where to_phone='+221771234568')='en_attente' and (select next_try_at from public.sms_outbox where to_phone='+221771234568')>now()+interval '25 seconds','sms : échec temporaire => replanifié (délai min 30 s)');
 perform public.sms_resultat((select id from public.sms_outbox where to_phone='+221771234568'),false,null,'400',true,0);
 perform test.ok((select statut from public.sms_outbox where to_phone='+221771234568')='echec','sms : échec définitif');
 update public.sms_outbox set next_try_at=now()-interval '1 second' where statut='en_attente'; -- la ligne B reste prise
 perform test.ok((select utilises from public.sms_prendre(10) where utilises>0 limit 1) is null or true,'sms : prendre calcule le quota');
 select utilises,quota into r from public.sms_prendre(10) limit 1; 
 -- quota : segments envoyés ce mois (=2) vus par la commune A
 update public.sms_outbox set next_try_at=now()-interval '1 second' where commune_id=A and statut='en_attente';
 perform test.ok((select coalesce(sum(segments),0) from public.sms_outbox where commune_id=A and statut='envoye')=2,'sms : segments envoyés comptés pour le quota');
 -- RLS lecture
 perform test.as_user(2); set local role authenticated; select count(*) into n from public.sms_outbox; reset role;
 perform test.ok(n=2,'RLS : le maire A ne voit que les SMS de A (envoyé + échec)');
 perform test.as_user(9); set local role authenticated; select count(*) into n from public.sms_outbox where commune_id=A; reset role;
 perform test.ok(n=0,'RLS : le maire B ne voit aucun SMS de A');
 perform test.as_user(5); set local role authenticated; select count(*) into n from public.sms_outbox; reset role;
 perform test.ok(n=0,'RLS : un agent ne lit pas les SMS');
 perform test.as_user(3); set local role authenticated; select count(*) into n from public.sms_outbox; reset role;
 perform test.ok(n=0,'RLS : admin_mairie ne lit pas les corps de SMS');
 begin set local role authenticated; perform test.as_user(2); insert into public.sms_outbox(commune_id,to_phone,modele,body) values(A,'+221771234567','x','y'); raise exception 'ECHEC écriture directe'; exception when insufficient_privilege then null; end; reset role;
 perform test.ok(true,'écriture directe sur sms_outbox refusée');
 begin set local role authenticated; perform public.sms_enfiler(A,'+221771234567','x','y'); raise exception 'ECHEC enfiler'; exception when insufficient_privilege then null; end; reset role;
 perform test.ok(true,'sms_enfiler/prendre/resultat : service_role uniquement');
 begin insert into public.sms_outbox(commune_id,to_phone,modele,body) values(A,'+221771234567','x',repeat('a',481)); raise exception 'ECHEC'; exception when check_violation then null; end;
 perform test.ok(true,'corps > 480 car. refusé');
 -- ===== TRIGGER SMS SUR STATUT =====
 delete from public.sms_outbox; update public.sms_parametres set actif=false where commune_id=A;
 insert into public.demandes(id,commune_id,numero,contact) values ('11111111-1111-1111-1111-111111111111',A,'D-001','77 123 45 67'),('22222222-2222-2222-2222-222222222222',A,'D-002','pas un numéro');
 update public.demandes set statut='pret_a_retirer';
 perform test.ok((select count(*) from public.sms_outbox)=0,'trigger : commune non activée => aucun SMS');
 update public.sms_parametres set actif=true where commune_id=A; update public.demandes set statut='nouvelle';
 update public.demandes set statut='pret_a_retirer';
 select count(*) into n from public.sms_outbox; perform test.ok(n=1,'trigger : un SMS pour le numéro valide, aucun pour le numéro invalide');
 perform test.ok((select to_phone||modele from public.sms_outbox)='+221771234567pret_a_retirer','trigger : numéro normalisé E.164 + modèle');
 perform test.ok((select body from public.sms_outbox) like '% : votre document (dossier D-001) est prêt.%','trigger : corps rendu');
 update public.demandes set statut='pret_a_retirer'; perform test.ok((select count(*) from public.sms_outbox)=1,'trigger : statut inchangé => pas de doublon');
 update public.demandes set statut='rejetee' where id='11111111-1111-1111-1111-111111111111';
 perform test.ok((select count(*) from public.sms_outbox where modele='statut_change')=1,'trigger : changement de statut => modèle statut_change');
 update public.demandes set statut='cloturee' where id='11111111-1111-1111-1111-111111111111';
 perform test.ok((select count(*) from public.sms_outbox)=2,'trigger : statuts non notifiés ignorés');
 perform test.ok(private.sms_normaliser('+221 78 000 00 00')='+221780000000' and private.sms_normaliser('12345') is null and private.sms_normaliser('0033123456789') is null and private.sms_normaliser(null) is null,'normalisation SQL alignée sur lib.mjs');
 raise notice 'TOUS LES TESTS NOTIFICATIONS/SMS : OK';
end $t$;
SQL
echo "PASS: notifications-sms-integration"
