import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
const ORIGIN=Deno.env.get("ALLOWED_ORIGIN")??"",SITE=Deno.env.get("SITE_URL")??ORIGIN;
const ROLES=["admin_mairie","maire","adjoint","cabinet","secretariat","finances","rh","etat_civil","technique","agent"];
const headers={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const fail=(message:string,status=400)=>out({error:message},status);
const clean=(v:unknown,max=200)=>String(v??"").trim().slice(0,max);
Deno.serve(async(req)=>{
 const origin=req.headers.get("Origin")??"";
 if(!ORIGIN||origin!==ORIGIN)return fail("Origine refusée ou ALLOWED_ORIGIN non configuré.",403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return fail("Méthode non autorisée.",405);
 if(!SITE)return fail("SITE_URL non configuré.",500);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),authorization=req.headers.get("Authorization")??"";
 if(!url||!anon||!service||!authorization.startsWith("Bearer "))return fail("Configuration ou authentification invalide.",401);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:authData,error:authError}=await caller.auth.getUser();const user=authData.user;
 if(authError||!user)return fail("Non authentifié.",401);
 const gate=await caller.rpc("is_super_admin");const platformGate=await caller.rpc("saas_stats");const isPlatformAdmin=!platformGate.error;if((gate.error||gate.data!==true)&&!isPlatformAdmin)return fail("Super-administrateur ou administrateur plateforme actif avec MFA AAL2 requis.",403);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:me,error:meError}=await admin.from("profiles").select("role,actif").eq("id",user.id).maybeSingle();
 if(meError||me?.actif===false||(me?.role!=="super_admin"&&!isPlatformAdmin))return fail("Accès refusé.",403);
 let b:Record<string,unknown>;try{b=await req.json()}catch{return fail("Requête JSON invalide.")};
 const action=clean(b.action,40),redirectTo=new URL("/mairie",SITE).toString();
 const audit=async(commune:string|null,event:string,target:string,detail:unknown)=>{const {error}=await admin.from("journal_audit").insert({commune_id:commune,user_id:user.id,email:user.email??null,action:event,cible:target,detail});if(error)throw error};
 try{
  if(action==="ping")return out({ok:true});
  if(action==="inviter"){
   const email=clean(b.email,254).toLowerCase(),nom=clean(b.nom,120),service=clean(b.service,120),role=clean(b.role,40),communeSlug=clean(b.commune,80);
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return fail("Adresse e-mail invalide.");
   if(!nom)return fail("Nom obligatoire.");if(!ROLES.includes(role))return fail("Rôle invalide.");
   const {data:commune,error:ce}=await admin.from("communes").select("id").eq("slug",communeSlug).maybeSingle();
   if(ce||!commune)return fail("Commune introuvable.",404);
   const {data:invite,error:ie}=await admin.auth.admin.inviteUserByEmail(email,{data:{nom,invite_pending:true},redirectTo});
   if(ie||!invite.user)return fail(ie?.message??"Invitation impossible.");
   const {error:pe}=await admin.from("profiles").upsert({id:invite.user.id,role,commune_id:commune.id,nom,service:service||null,actif:false});
   if(pe){await admin.auth.admin.deleteUser(invite.user.id);return fail("Invitation créée mais profil impossible à enregistrer : "+pe.message,500)}
   await audit(String(commune.id),"user_invite",email,{role,nom,actif:false});return out({ok:true,id:invite.user.id,status:"invited_inactive"});
  }
  if(action==="affecter_admin_mairie"){
   // Création anticipée : commune facultative. Sans commune -> statut « en_attente »
   // (aucun droit) ; avec commune -> « affecte ». Jamais actif : l'activation reste
   // l'action distincte « activer ». Aucun mot de passe, aucun doublon Auth.
   const email=clean(b.email,254).toLowerCase(),communeSlug=clean(b.commune,80),nom=clean(b.nom,120);
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return fail("Adresse e-mail invalide.");
   const {data:uid,error:ae}=communeSlug
    ?await caller.rpc("saas_affecter_admin_mairie",{p_email:email,p_slug:communeSlug,p_nom:nom||null})
    :await caller.rpc("saas_preparer_admin_mairie",{p_email:email,p_nom:nom||null});
   if(ae)return fail(ae.message,403);
   return out({ok:true,id:uid,status:communeSlug?"affecte":"en_attente"});
  }
  const id=clean(b.id,60);if(!id)return fail("Compte manquant.");
  const {data:target,error:te}=await admin.from("profiles").select("id,role,commune_id,actif,nom,service").eq("id",id).maybeSingle();
  if(te||!target)return fail("Compte introuvable.",404);
  const communeId=target.commune_id?String(target.commune_id):null,self=id===user.id,isSA=target.role==="super_admin";
  const {data:platformTarget,error:platformTargetError}=await admin.from("platform_admins").select("user_id").eq("user_id",id).eq("actif",true).maybeSingle();
  if(platformTargetError)return fail("Vérification du compte plateforme impossible.",500);
  const isPlatformTarget=!!platformTarget;
  if((isSA||isPlatformTarget)&&!(action==="reinit_mdp"&&self))return fail("Compte administrateur protégé : utilisez la procédure dédiée.",403);
  if(action==="modifier"){
   const patch:Record<string,unknown>={};if(b.nom!==undefined)patch.nom=clean(b.nom,120);if(b.service!==undefined)patch.service=clean(b.service,120)||null;
   if(b.role!==undefined){const role=clean(b.role,40);if(!ROLES.includes(role))return fail("Rôle invalide.");if(self||isSA)return fail("Le rôle d’un super-administrateur ne peut pas être modifié.");patch.role=role}
   if(!Object.keys(patch).length)return fail("Aucune modification demandée.");
   const {error}=await admin.from("profiles").update(patch).eq("id",id);if(error)return fail(error.message);
   await audit(communeId,"user_update",id,patch);return out({ok:true});
  }
  if(action==="activer"){
   const actif=b.actif===true;if(isSA)return fail("Les comptes super-administrateur sont gérés séparément.");if(actif&&target.role==="admin_mairie"&&!communeId)return fail("Un administrateur municipal doit être rattaché à une commune.",409);if(!actif&&self)return fail("Vous ne pouvez pas désactiver votre propre compte.");
   const {data:authTarget,error:authReadError}=await admin.auth.admin.getUserById(id);if(authReadError||!authTarget.user)return fail("Compte Auth introuvable.",404);const emailAConfirmer=actif&&!authTarget.user.email_confirmed_at;const {error:ae}=await admin.auth.admin.updateUserById(id,emailAConfirmer?{ban_duration:"none",email_confirm:true}:{ban_duration:actif?"none":"876000h"});if(ae)return fail(ae.message);
   const {error:pe}=await admin.from("profiles").update({actif}).eq("id",id);if(pe)return fail(pe.message,500);
   if(!actif)await admin.rpc("_revoquer_sessions",{p_user:id});
   else{const sync=await admin.rpc("org_sync_user_affectations",{p_user:id});if(sync.error){await admin.from("profiles").update({actif:false}).eq("id",id);await admin.auth.admin.updateUserById(id,{ban_duration:"876000h"});return fail("Activation annulée : synchronisation des droits impossible. "+sync.error.message,500)}}
   const {data:au}=await admin.auth.admin.getUserById(id);await admin.auth.admin.updateUserById(id,{user_metadata:{...(au.user?.user_metadata??{}),invite_pending:false}});
   await audit(communeId,actif?"user_enable":"user_disable",id,{affectations_synchronisees:actif,...(emailAConfirmer?{email_confirme_par_admin:true}:{})});return out({ok:true,actif,...(emailAConfirmer?{email_confirme:true}:{})});
  }
  if(action==="reinit_mdp"){
   if(isSA&&!self)return fail("Réinitialisation du mot de passe d’un autre super-administrateur interdite.");
   const {data:au,error:ae}=await admin.auth.admin.getUserById(id);if(ae||!au.user?.email)return fail("Adresse e-mail introuvable.",404);
   const captcha=clean(b.captchaToken,4096);if(!captcha)return fail("Vérification anti-spam requise.");
   const publicAuth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const {error}=await publicAuth.auth.resetPasswordForEmail(au.user.email,{redirectTo,captchaToken:captcha});if(error)return fail(error.message);
   await admin.rpc("_revoquer_sessions",{p_user:id});await audit(communeId,"user_password_reset_requested",id,{email:au.user.email});return out({ok:true,status:"reset_email_sent"});
  }
  if(action==="supprimer")return fail("Suppression désactivée : désactivez le compte pour conserver son historique.",403);
  return fail("Action inconnue.");
 }catch(e){return fail(e instanceof Error?e.message:"Erreur serveur.",500)}
});