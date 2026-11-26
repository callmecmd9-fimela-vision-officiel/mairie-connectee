// Photo par utilisateur : l'admin ne reprend plus la photo du maire. node tests/photo-profil-utilisateur.test.js
const fs=require('fs'),path=require('path');let f=0;const ok=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)f++};
const R=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const core=R('js/core.js'),maire=R('js/maire.js'),sa=R('js/superadmin.js'),sql=R('supabase/migrations/20261204000200_photo_profil_utilisateur.sql');
ok('admin : plus de photo_maire commune dans le hero',/mph\(false\)/.test(sa)&&!/ph = url\("photo_maire"\)/.test(sa));
ok('maire : photo perso puis repli photo_maire',/mph\(true\)/.test(maire));
ok('autres rôles : repli photo_maire réservé au maire',/mph\(S\.pr == "maire"\)/.test(core)&&/const mph = fb =>/.test(core));
ok('photo perso signée et chargée',/mon_profil_photo/.test(core)&&/S\.myph\]\.filter/.test(core));
ok('admin : envoi dans <commune>/profils/ + RPC',/"\/profils\/"/.test(sa)&&/sa_set_profil_photo/.test(sa)&&/u_photo"/.test(sa));
ok('SQL : garde admin de la commune',/_garde_am\(p_commune\)/.test(sql)&&(sql.match(/_garde_am/g)||[]).length>=2);
ok('SQL : chemin imposé <commune>/profils/',/'\/profils\/'/.test(sql));
ok('SQL : aucun droit anon',/revoke all on function public\.sa_set_profil_photo\(text, uuid, text\) from public, anon;/.test(sql)&&!/to anon/.test(sql));
ok('SQL : search_path vide partout',(sql.match(/set search_path = ''/g)||[]).length===3);
process.exit(f?1:0)
