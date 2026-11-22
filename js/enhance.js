/* Améliorations transverses (citoyen, mairie, saas) : anti double-envoi, focus conservé après rendu, bandeau hors-ligne. Sans dépendance. */
(function () {
  var app = document.getElementById("app");
  if (!app) return;
  /* actions de navigation/lecture : jamais verrouillées ni bloquées hors-ligne */
  var FREE =
    " idea copy useia geo print csv menu go tab filt flr sopen gos flt rpgen coprint dochist ofile adjv edit ecl ruopen inopen rpopen hist rppdf pjrapport opend cld ia dir pg links cres cea eab epay eof spno chg cat back dlgo dlgx dlgc dlgp rc dm hit ".split(
      " "
    );
  var free = {};
  FREE.forEach(function (k) {
    if (k) free[k] = 1;
  });
  var busy = false,
    tmr = 0,
    last = null,
    bar = null;
  function unlock() {
    busy = false;
    clearTimeout(tmr);
  }
  function offline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }
  function banner(on) {
    if (on && !bar) {
      bar = document.createElement("div");
      bar.setAttribute("role", "status");
      bar.id = "mc-off";
      bar.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:99;background:#7F1D1D;color:#fff;padding:8px 12px;text-align:center;font:700 14px system-ui,sans-serif";
      bar.textContent = "Hors ligne : vos saisies sont conservées, réessayez au retour du réseau.";
      document.body.appendChild(bar);
    } else if (!on && bar) {
      bar.remove();
      bar = null;
    }
  }
  addEventListener("offline", function () {
    banner(true);
  });
  addEventListener("online", function () {
    banner(false);
  });
  if (offline()) banner(true);
  /* capture : s'exécute avant les gestionnaires de l'application */
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-a]") : null;
      if (!t) return;
      var a = t.dataset.a;
      last = { a: a, i: t.dataset.i, id: t.dataset.id, v: t.dataset.v, k: t.dataset.k, s: t.dataset.s, n: t.dataset.n };
      if (free[a]) return;
      if (busy || offline()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (offline()) banner(true);
        return;
      }
      busy = true;
      clearTimeout(tmr);
      tmr = setTimeout(unlock, 12000);
    },
    true
  );
  /* après chaque rendu : déverrouille et rend le focus (le rendu remplace tout le DOM) */
  var pend = 0;
  new MutationObserver(function () {
    if (pend) return;
    pend = setTimeout(function () {
      pend = 0;
      unlock();
      refocus();
    }, 30);
  }).observe(app, { childList: true, subtree: true });
  function refocus() {
    var ae = document.activeElement;
    if (ae && ae !== document.body && app.contains(ae)) return;
    var el = null;
    if (last) {
      var q = '[data-a="' + last.a + '"]';
      ["i", "id", "v", "k", "s", "n"].forEach(function (k) {
        if (last[k] != null) q += "[data-" + k + '="' + String(last[k]).replace(/["\\]/g, "") + '"]';
      });
      try {
        el = app.querySelector(q);
      } catch (x) {}
    }
    if (!el) {
      el = app.querySelector("h1");
      if (el && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    }
    if (el && el.focus)
      try {
        el.focus({ preventScroll: true });
      } catch (x) {
        el.focus();
      }
    last = null;
  }
})();
