window.tsReady=function(){};
if("serviceWorker"in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});
document.addEventListener("DOMContentLoaded",function(){var s=document.createElement("script");s.src="/js/enhance.js?v=20261116";document.body.appendChild(s)});
