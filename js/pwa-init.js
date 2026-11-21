window.tsReady=function(){};
if("serviceWorker"in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});
document.addEventListener("DOMContentLoaded",function(){var s=document.createElement("script");s.src="/js/enhance.js?v=20261125";document.body.appendChild(s);var a=document.createElement("script");a.src="/js/a11y.js?v=20261121";document.body.appendChild(a)});
