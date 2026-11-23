/* Thème clair / sombre : un bouton unique, préférence mémorisée sur l'appareil, réglage système par défaut.
   Chargé dans <head> (avant les feuilles de style) pour éviter tout flash ; le bouton est ajouté dès que la page existe. */
(function () {
  "use strict";
  var CLE = "mc-theme",
    root = document.documentElement;
  function lire() {
    try {
      var v = localStorage.getItem(CLE);
      return v === "dark" || v === "light" ? v : null;
    } catch (e) {
      return null;
    }
  }
  function systeme() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }
  function courant() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function appliquer(t) {
    root.setAttribute("data-theme", t);
    var b = document.getElementById("mc-theme-btn");
    if (!b) return;
    var sombre = t === "dark",
      lib = sombre ? "Passer en mode clair" : "Passer en mode sombre";
    b.setAttribute("aria-label", lib);
    b.setAttribute("title", lib);
    b.setAttribute("aria-pressed", sombre ? "true" : "false");
    b.textContent = "";
    b.appendChild(icone(sombre));
  }
  function icone(sombre) {
    var ns = "http://www.w3.org/2000/svg",
      s = document.createElementNS(ns, "svg"),
      p = document.createElementNS(ns, "path");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", "22");
    s.setAttribute("height", "22");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    /* en mode sombre on propose le soleil (retour au clair), en mode clair la lune */
    p.setAttribute(
      "d",
      sombre
        ? "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"
        : "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
    );
    s.appendChild(p);
    return s;
  }
  var initial = lire() || systeme();
  root.setAttribute("data-theme", initial);
  function bouton() {
    if (document.getElementById("mc-theme-btn") || !document.body) return;
    var b = document.createElement("button");
    b.id = "mc-theme-btn";
    b.type = "button";
    b.className = "mc-theme-btn";
    b.addEventListener("click", function () {
      var t = courant() === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(CLE, t);
      } catch (e) {}
      appliquer(t);
    });
    document.body.appendChild(b);
    appliquer(courant());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bouton);
  else bouton();
  /* Sans choix explicite, on suit le réglage du système en direct. */
  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)"),
      suivre = function () {
        if (!lire()) appliquer(systeme());
      };
    if (mq.addEventListener) mq.addEventListener("change", suivre);
    else if (mq.addListener) mq.addListener(suivre);
  } catch (e) {}
  /* L'impression reste toujours en clair. */
  var avant = null;
  window.addEventListener("beforeprint", function () {
    avant = courant();
    root.setAttribute("data-theme", "light");
  });
  window.addEventListener("afterprint", function () {
    if (avant) root.setAttribute("data-theme", avant);
    avant = null;
  });
  window.McTheme = {
    get: courant,
    set: function (t) {
      if (t !== "dark" && t !== "light") return;
      try {
        localStorage.setItem(CLE, t);
      } catch (e) {}
      appliquer(t);
    }
  };
})();
