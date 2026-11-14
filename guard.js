(function(){var show=function(m){var a=document.getElementById("app");if(a&&!a.children.length)a.innerHTML='<p style="padding:28px;font:15px/1.5 sans-serif">Le chargement a échoué.<br><b>'+String(m).replace(/[<>&]/g,"")+'</b></p>'};
addEventListener("error",function(e){show(e.message||("Ressource bloquée : "+(e.target&&(e.target.src||e.target.href))))},true);
addEventListener("securitypolicyviolation",function(e){show("CSP : "+e.blockedURI)});
setTimeout(function(){if(typeof supabase==="undefined")show("Bibliothèque Supabase introuvable")},4000)})();
