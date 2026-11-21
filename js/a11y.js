/* Accessibilité transverse (citoyen, mairie, saas) : lien d'évitement, région main, annonce des changements de page,
   noms accessibles des champs/boutons/images, icônes décoratives masquées. Sans dépendance, idempotent, aucune donnée lue. */
(function(){
var app=document.getElementById("app");if(!app||app.getAttribute("data-a11y"))return;app.setAttribute("data-a11y","1");
var d=document;
var st=d.createElement("style");
st.textContent=".mc-skip{position:fixed;left:8px;top:-60px;z-index:100;background:#fff;color:#111;padding:10px 14px;border:3px solid #2563EB;border-radius:8px;font:700 15px system-ui,sans-serif;text-decoration:none}.mc-skip:focus{top:8px}.mc-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}";
d.head.appendChild(st);
if(!app.hasAttribute("role")&&!d.querySelector("main,[role=main]"))app.setAttribute("role","main");
if(!app.hasAttribute("tabindex"))app.setAttribute("tabindex","-1");
var sk=d.createElement("a");sk.className="mc-skip";sk.href="#app";sk.textContent="Aller au contenu";
sk.addEventListener("click",function(e){e.preventDefault();try{app.focus({preventScroll:false})}catch(x){app.focus()}});
d.body.insertBefore(sk,d.body.firstChild);
var live=d.createElement("div");live.id="mc-live";live.className="mc-sr";live.setAttribute("role","status");live.setAttribute("aria-live","polite");live.setAttribute("aria-atomic","true");d.body.appendChild(live);
var lastH="";
function txt(n){return (n&&n.textContent||"").replace(/\s+/g," ").trim()}
function label(el){
 if(el.getAttribute("aria-label")||el.getAttribute("aria-labelledby"))return;
 var t=el.tagName,ty=(el.getAttribute("type")||"").toLowerCase();
 if(t==="INPUT"&&(ty==="hidden"||ty==="submit"||ty==="button"||ty==="reset"))return;
 if(el.id&&d.querySelector('label[for="'+String(el.id).replace(/["\\]/g,"")+'"]'))return;
 if(el.closest("label"))return;
 var v=el.getAttribute("title")||el.getAttribute("placeholder");
 if(!v){var p=el.previousElementSibling;if(p&&/^(LABEL|SPAN|DIV|B|STRONG|SMALL)$/.test(p.tagName))v=txt(p).slice(0,80)}
 if(!v&&el.parentElement){var pp=el.parentElement.previousElementSibling;if(pp&&/^(LABEL|SPAN|DIV|B|STRONG|SMALL)$/.test(pp.tagName))v=txt(pp).slice(0,80)}
 if(v)el.setAttribute("aria-label",v)}
function pass(){
 var i,l;
 l=app.querySelectorAll("input,select,textarea");for(i=0;i<l.length;i++)label(l[i]);
 l=app.querySelectorAll("button,a[href],[role=button]");for(i=0;i<l.length;i++){var b=l[i];if(!txt(b)&&!b.getAttribute("aria-label")&&!b.getAttribute("aria-labelledby")){var im=b.querySelector("img[alt]:not([alt=''])"),v=b.getAttribute("title")||(im&&im.getAttribute("alt"));if(v)b.setAttribute("aria-label",v)}}
 l=app.querySelectorAll("img:not([alt])");for(i=0;i<l.length;i++)l[i].setAttribute("alt",l[i].getAttribute("title")||"");
 l=app.querySelectorAll("svg:not([aria-label]):not([role])");for(i=0;i<l.length;i++)l[i].setAttribute("aria-hidden","true");
 l=app.querySelectorAll("table:not([role])");for(i=0;i<l.length;i++){var th=l[i].querySelectorAll("th:not([scope])");for(var j=0;j<th.length;j++)th[j].setAttribute("scope","col")}
 var h=app.querySelector("h1");var s=h?txt(h):"";if(s&&s!==lastH){lastH=s;live.textContent="";setTimeout(function(){live.textContent=s},50)}}
var pend=0;new MutationObserver(function(){if(pend)return;pend=setTimeout(function(){pend=0;pass()},40)}).observe(app,{childList:true,subtree:true});
pass();
})();
