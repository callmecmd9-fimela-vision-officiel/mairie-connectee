/* Applique les styles dynamiques via CSSOM (compatible CSP sans style-src-attr). Usage : data-sty="propriété:valeur;..." */
(function () {
  function one(el) {
    var v = el.getAttribute("data-sty");
    if (v === null) return;
    el.removeAttribute("data-sty");
    try {
      el.style.cssText += (el.style.cssText && !/;\s*$/.test(el.style.cssText) ? ";" : "") + v;
    } catch (e) {}
  }
  function scan(n) {
    if (!n || n.nodeType !== 1) return;
    one(n);
    var l = n.querySelectorAll ? n.querySelectorAll("[data-sty]") : [];
    for (var i = 0; i < l.length; i++) one(l[i]);
  }
  scan(document.documentElement);
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++)
      for (var j = 0; j < ms[i].addedNodes.length; j++) scan(ms[i].addedNodes[j]);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
