const ORIGIN=Deno.env.get("ALLOWED_ORIGIN")??"";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(!ORIGIN||req.headers.get("Origin")!==ORIGIN)return new Response(JSON.stringify({error:"Origine refusée"}),{status:403,headers:cors});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"Méthode non autorisée"}),{status:405,headers:cors});
 return new Response(JSON.stringify({error:"Endpoint retiré. Utilisez sa-admin : invitations et réinitialisations par lien sécurisé, sans mot de passe administrateur."}),{status:410,headers:cors});
});