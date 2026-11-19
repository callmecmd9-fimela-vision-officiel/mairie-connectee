import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
const ORIGIN=Deno.env.get("ALLOWED_ORIGIN")??"",SITE=Deno.env.get("SITE_URL")??ORIGIN;
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, content-type, apikey, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const clean=(v:unknown,max=200)=>String(v??"").trim().slice(0,max);
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(!ORIGIN||req.headers.get("origin")!==ORIGIN)return J({error:"Origine refusée ou ALLOWED_ORIGIN non configuré"},403);
 if(req.method!=="POST")return J({error:"Méthode non autorisée"},405);
 const authorization=req.headers.get("Authorization")??"",url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!authorization.startsWith("Bearer ")||!url||!anon||!service||!SITE)return J({error:"Configuration ou authentification invalide"},401);
 const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:authData,error:authError}=await caller.auth.getUser();if(authError||!authData.user)return J({error:"Non authentifié"},401);
 const gate=await caller.rpc("saas_stats");if(gate.error)return J({error:"Accès plateforme refusé (compte actif et MFA AAL2 requis)"},403);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:me,error:meError}=await admin.from("profiles").select("role,actif").eq("id",authData.user.id).maybeSingle();
 if(meError||me?.actif===false)return J({error:"Compte plateforme inactif"},403);
 let b:Record<string,unknown>;try{b=await req.json()}catch{return J({error:"Requête invalide"},400)}
 const redirectTo=new URL("/mairie",SITE).toString();
 try{
  if(b.action==="ping")return J({ok:true});
  if(b.action==="creer_mairie"){
   const email=clean(b.admin_email,254).toLowerCase(),nom=clean(b.admin_nom,120),communeNom=clean(b.nom,100),slug=clean(b.slug,40).toLowerCase(),plan=clean(b.plan,40);
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return J({error:"E-mail invalide"},400);
   if(!nom||!communeNom||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return J({error:"Nom ou identifiant invalide"},400);
   if(!plan)return J({error:"Offre obligatoire"},400);
   const invite=await admin.auth.admin.inviteUserByEmail(email,{data:{nom,invite_pending:true},redirectTo});
   if(invite.error||!invite.data.user)return J({error:invite.error?.message??"Invitation impossible"},400);
   const created=await caller.rpc("saas_creer_commune",{p_nom:communeNom,p_slug:slug,p_plan:plan,p_essai_jours:Math.max(0,Math.min(90,Number(b.essai_jours)||0)),p_admin:invite.data.user.id,p_admin_nom:nom});
   if(created.error){await admin.auth.admin.deleteUser(invite.data.user.id);return J({error:created.error.message},400)}
   const inactive=await admin.from("profiles").update({actif:false}).eq("id",invite.data.user.id);
   if(inactive.error){await admin.auth.admin.updateUserById(invite.data.user.id,{ban_duration:"876000h"});return J({error:"Commune créée, compte bloqué par sécurité : "+inactive.error.message},500)}
   let base=SITE;while(base.endsWith("/"))base=base.slice(0,-1);
   return J({id:created.data,portail_citoyen:base+"/?c="+slug,portail_mairie:redirectTo,invitation:"envoyee",compte_actif:false});
  }
  if(b.action==="reinit_mdp_admin"){
   const communeId=clean(b.commune,60),{data:commune,error:communeError}=await admin.from("communes").select("admin_principal").eq("id",communeId).single();
   if(communeError||!commune?.admin_principal)return J({error:"Administrateur principal introuvable"},404);
   const target=await admin.auth.admin.getUserById(String(commune.admin_principal));if(target.error||!target.data.user?.email)return J({error:"E-mail de l’administrateur introuvable"},404);
   const captcha=clean(b.captchaToken,4096);if(!captcha)return J({error:"Vérification anti-spam requise"},400);
   const publicAuth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const reset=await publicAuth.auth.resetPasswordForEmail(target.data.user.email,{redirectTo,captchaToken:captcha});if(reset.error)return J({error:reset.error.message},400);
   await admin.rpc("_revoquer_sessions",{p_user:String(commune.admin_principal)});
   await admin.from("platform_audit").insert({admin_id:authData.user.id,action:"admin_mdp_reset_requested",commune_id:communeId});
   return J({ok:true,reset_email_sent:true});
  }
  return J({error:"Action inconnue"},400);
 }catch(e){return J({error:e instanceof Error?e.message:"Erreur serveur"},500)}
});