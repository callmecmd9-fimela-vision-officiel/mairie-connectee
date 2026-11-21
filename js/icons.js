/* Icônes PWA PNG par commune (192, 512, maskable 512) générées dans le navigateur à partir du blason et de la couleur.
   Utilisé par l'espace mairie (publication) et par les tests/scripts (icônes par défaut). Aucune dépendance. */
(function(g){
"use strict";
var NAMES=["icon-192.png","icon-512.png","icon-maskable-512.png"];
var MAXB=290000; /* le bucket « identite » refuse > 300 Ko */
function okHex(c){return /^#[0-9a-f]{6}$/i.test(c||"")}
function shade(h,f){var n=[1,3,5].map(function(i){return Math.max(0,Math.min(255,Math.round(parseInt(h.slice(i,i+2),16)*f)))});return "#"+n.map(function(x){return(x<16?"0":"")+x.toString(16)}).join("")}
function initials(nm){var w=String(nm||"").replace(/^(Commune|Mairie)\s+(de |d['’]|du |des )?/i,"").replace(/[^\p{L}\s'’-]/gu,"").trim().split(/[\s'’-]+/).filter(Boolean);if(!w.length)return "M";return(w.length>1?w[0][0]+w[1][0]:w[0].slice(0,2)).toUpperCase()}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function shield(c,cx,cy,s,fill){c.beginPath();var w=s*.78,h=s;c.moveTo(cx,cy-h/2);c.lineTo(cx+w/2,cy-h/2+h*.14);c.lineTo(cx+w/2,cy+h*.04);c.quadraticCurveTo(cx+w/2,cy+h*.34,cx,cy+h/2);c.quadraticCurveTo(cx-w/2,cy+h*.34,cx-w/2,cy+h*.04);c.lineTo(cx-w/2,cy-h/2+h*.14);c.closePath();c.fillStyle=fill;c.fill()}
/* dessine une icône de côté n ; maskable = fond plein (le système applique son masque), contenu dans la zone sûre (80 % central) */
function draw(n,img,o,maskable){
 var cv=document.createElement("canvas");cv.width=cv.height=n;var c=cv.getContext("2d");
 var col=okHex(o.color)?o.color:"#0B5A2E",dk=shade(col,.72);
 var grad=c.createLinearGradient(0,0,n,n);grad.addColorStop(0,col);grad.addColorStop(1,dk);
 if(maskable){c.fillStyle=grad;c.fillRect(0,0,n,n)}
 else{rr(c,0,0,n,n,n*.22);c.fillStyle=grad;c.fill()}
 var cx=n/2,cy=n/2,safe=maskable?n*.8:n*.9,pl=safe*.74; /* plaque blanche circulaire */
 c.save();c.shadowColor="rgba(0,0,0,.28)";c.shadowBlur=n*.035;c.shadowOffsetY=n*.012;c.beginPath();c.arc(cx,cy,pl/2,0,Math.PI*2);c.fillStyle="#fff";c.fill();c.restore();
 c.lineWidth=n*.014;c.strokeStyle="#E3B64D";c.beginPath();c.arc(cx,cy,pl/2-c.lineWidth*.5,0,Math.PI*2);c.stroke(); /* filet or */
 if(img){var iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,box=pl*.8,k=Math.min(box/iw,box/ih),w=iw*k,h=ih*k;
  c.save();c.beginPath();c.arc(cx,cy,pl/2-n*.02,0,Math.PI*2);c.clip();c.imageSmoothingQuality="high";c.drawImage(img,cx-w/2,cy-h/2,w,h);c.restore()}
 else{shield(c,cx,cy-pl*.02,pl*.62,col);c.fillStyle="#fff";c.font="700 "+Math.round(pl*.25)+"px 'Nunito Sans',Arial,sans-serif";c.textAlign="center";c.textBaseline="middle";c.fillText(initials(o.name),cx,cy-pl*.035)}
 return cv}
function toBlob(cv){return new Promise(function(res,rej){cv.toBlob(function(b){b?res(b):rej(new Error("Ce navigateur ne sait pas créer d’image PNG."))},"image/png")})}
function load(src){return new Promise(function(res,rej){var i=new Image();i.onload=function(){res(i)};i.onerror=function(){rej(new Error("Blason illisible."))};i.src=src})}
/* blob : image du blason (ou null → monogramme). Retourne {nom: Blob PNG}. */
async function make(blob,o){
 o=o||{};var img=null,u=null;
 if(blob){u=URL.createObjectURL(blob);try{img=await load(u)}finally{URL.revokeObjectURL(u)}}
 var out={};
 var spec=[["icon-192.png",192,false],["icon-512.png",512,false],["icon-maskable-512.png",512,true]];
 for(var i=0;i<spec.length;i++){var b=await toBlob(draw(spec[i][1],img,o,spec[i][2]));
  if(b.size>MAXB)throw new Error("Icône trop lourde ("+Math.round(b.size/1000)+" Ko) : choisissez un blason plus simple.");out[spec[i][0]]=b}
 return out}
g.mcIcons={make:make,names:NAMES,initials:initials,okHex:okHex,draw:draw};
})(typeof window!=="undefined"?window:globalThis);
