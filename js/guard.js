(function(){var A=function(){return document.getElementById("app")};
var show=function(m){var a=A();if(a&&!a.children.length)a.innerHTML='<p style="padding:28px;font:15px/1.5 sans-serif">Le chargement a échoué.<br><b>'+String(m).replace(/[<>&]/g,"")+'</b><br><br><button onclick="location.reload()" style="padding:10px 18px">Réessayer</button></p>'};
addEventListener("error",function(e){show(e.message||("Ressource bloquée : "+(e.target&&(e.target.src||e.target.href))))},true);
addEventListener("securitypolicyviolation",function(e){if(e.blockedURI!=="inline")show("CSP : "+e.blockedURI)});
setTimeout(function(){if(typeof supabase==="undefined")show("Bibliothèque Supabase introuvable")},4000);
/* page blanche : purge du service worker et des caches, un seul rechargement automatique */
setTimeout(function(){var a=A();if(a&&a.children.length)return;var k="mc_heal";try{if(sessionStorage.getItem(k)){show("Page vide après rechargement");return}sessionStorage.setItem(k,"1")}catch(x){}
Promise.all([("serviceWorker"in navigator?navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}):0),("caches"in window?caches.keys().then(function(l){return Promise.all(l.map(function(x){return caches.delete(x)}))}):0)]).catch(function(){}).then(function(){location.reload()})},6000)})();
