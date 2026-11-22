/* Politique de mot de passe : changement obligatoire tous les 30 jours, alerte 7 jours avant l'échéance.
   L'échéance est calculée par la base (RPC mdp_politique_statut) ; aucun mot de passe n'est lisible nulle part.
   Si la migration n'est pas encore appliquée, ce module ne fait rien (l'application reste inchangée). */
(function () {
  "use strict";
  var MAX_JOURS = 30,
    ALERTE_JOURS = 7,
    MIN_LONGUEUR = 10,
    JOUR = 86400000,
    CLE_MASQUE = "mdp-alerte-masquee";

  /* Fonctions pures (testées) */
  function statut(changedAt, now) {
    var t = Date.parse(changedAt);
    if (!isFinite(t)) return null;
    var n = now == null ? Date.now() : +now,
      ecoules = Math.max(0, Math.floor((n - t) / JOUR)),
      restants = MAX_JOURS - ecoules;
    return {
      jours_ecoules: ecoules,
      jours_restants: Math.max(0, restants),
      expire: ecoules >= MAX_JOURS,
      alerte: ecoules < MAX_JOURS && restants <= ALERTE_JOURS
    };
  }
  function validerMdp(a, b) {
    a = String(a == null ? "" : a);
    if (a.length < MIN_LONGUEUR) return "Au moins " + MIN_LONGUEUR + " caractères sont requis.";
    if (!/[A-Za-z]/.test(a) || !/[0-9]/.test(a)) return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
    if (a !== String(b == null ? "" : b)) return "Les deux saisies ne correspondent pas.";
    return "";
  }
  function traduire(m) {
    m = String(m || "");
    if (/different from the old|same as the old/i.test(m)) return "Le nouveau mot de passe doit être différent de l’ancien.";
    if (/aal2|mfa/i.test(m)) return "Validez d’abord votre code MFA, puis réessayez.";
    if (/weak|too short|at least|pwned|compromised/i.test(m)) return "Mot de passe trop faible ou déjà compromis : choisissez-en un plus long et plus original.";
    return "Modification impossible : " + (m || "erreur inconnue") + ".";
  }
  var api = { statut: statut, validerMdp: validerMdp, traduire: traduire, MAX_JOURS: MAX_JOURS, ALERTE_JOURS: ALERTE_JOURS };
  window.MdpPolicy = api;

  var c = typeof sb !== "undefined" ? sb : null;
  if (!c || !c.auth || typeof document === "undefined") return;

  var occupe = false,
    derniere = 0,
    minuteur = null;

  function el(tag, txt, css) {
    var e = document.createElement(tag);
    if (txt) e.textContent = txt;
    if (css) e.style.cssText = css;
    return e;
  }
  function retirer(id) {
    var e = document.getElementById(id);
    if (e && e.parentNode) e.parentNode.removeChild(e);
  }
  function masquee() {
    try {
      return sessionStorage.getItem(CLE_MASQUE) === "1";
    } catch (e) {
      return false;
    }
  }
  function masquer() {
    try {
      sessionStorage.setItem(CLE_MASQUE, "1");
    } catch (e) {}
  }
  function pluriel(n) {
    return n + " jour" + (n > 1 ? "s" : "");
  }

  function bouton() {
    if (document.getElementById("mdp-btn")) return;
    var b = el(
      "button",
      "Mon mot de passe",
      "position:fixed;left:10px;bottom:10px;z-index:2147482000;padding:6px 10px;font-size:12px;border-radius:8px;border:1px solid rgba(0,0,0,.25);background:#fff;color:#073a1e;opacity:.8;cursor:pointer"
    );
    b.id = "mdp-btn";
    b.type = "button";
    b.addEventListener("click", function () {
      ouvrir(false);
    });
    document.body.appendChild(b);
  }

  function bandeau(restants) {
    if (document.getElementById("mdp-alerte")) return;
    var d = el("div", "", "position:fixed;top:0;left:0;right:0;z-index:2147482500;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 14px;background:#fff3cd;color:#5c4400;border-bottom:1px solid #e0b84a;font-size:14px");
    d.id = "mdp-alerte";
    d.setAttribute("role", "status");
    d.appendChild(el("span", "Sécurité : votre mot de passe expire dans " + pluriel(restants) + ". Merci de le modifier dès maintenant."));
    var o = el("button", "Modifier maintenant", "padding:6px 12px;cursor:pointer");
    o.type = "button";
    o.addEventListener("click", function () {
      ouvrir(false);
    });
    var l = el("button", "Plus tard", "padding:6px 12px;cursor:pointer");
    l.type = "button";
    l.addEventListener("click", function () {
      masquer();
      retirer("mdp-alerte");
    });
    d.appendChild(o);
    d.appendChild(l);
    document.body.appendChild(d);
  }

  function champ(box, id, libelle) {
    var l = el("label", libelle, "display:block;margin:12px 0 4px;font-weight:600;font-size:14px");
    l.setAttribute("for", id);
    var i = el("input", "", "width:100%;box-sizing:border-box;padding:10px;font-size:15px;border:1px solid #888;border-radius:8px");
    i.id = id;
    i.type = "password";
    i.autocomplete = "new-password";
    box.appendChild(l);
    box.appendChild(i);
    return i;
  }

  function ouvrir(obligatoire) {
    if (document.getElementById("mdp-ov")) return;
    retirer("mdp-alerte");
    var ov = el("div", "", "position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;background:rgba(7,58,30,.75);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto");
    ov.id = "mdp-ov";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-labelledby", "mdp-titre");
    var box = el("div", "", "background:#fff;color:#111;max-width:420px;width:100%;border-radius:14px;padding:22px;box-shadow:0 10px 40px rgba(0,0,0,.4)");
    var h = el("h2", obligatoire ? "Mot de passe expiré" : "Changer mon mot de passe", "margin:0 0 8px;font-size:20px");
    h.id = "mdp-titre";
    box.appendChild(h);
    box.appendChild(
      el(
        "p",
        obligatoire
          ? "Par sécurité, votre mot de passe doit être renouvelé tous les " + MAX_JOURS + " jours. Choisissez-en un nouveau pour continuer."
          : "Choisissez un nouveau mot de passe (" + MIN_LONGUEUR + " caractères minimum, avec au moins une lettre et un chiffre).",
        "margin:0;font-size:14px;line-height:1.45"
      )
    );
    var a = champ(box, "mdp-a", "Nouveau mot de passe"),
      b = champ(box, "mdp-b", "Confirmer le nouveau mot de passe"),
      msg = el("p", "", "min-height:20px;margin:12px 0 0;font-size:14px;color:#b00020");
    msg.setAttribute("role", "alert");
    box.appendChild(msg);
    var ok = el("button", "Enregistrer", "margin-top:8px;padding:10px 16px;font-size:15px;cursor:pointer");
    ok.type = "button";
    ok.className = "bt";
    var sec = el("button", obligatoire ? "Se déconnecter" : "Annuler", "margin:8px 0 0 8px;padding:10px 16px;font-size:15px;cursor:pointer");
    sec.type = "button";
    sec.addEventListener("click", function () {
      if (!obligatoire) return retirer("mdp-ov");
      Promise.resolve(c.auth.signOut()).then(
        function () {
          location.reload();
        },
        function () {
          location.reload();
        }
      );
    });
    ok.addEventListener("click", function () {
      var e = validerMdp(a.value, b.value);
      if (e) {
        msg.textContent = e;
        return;
      }
      ok.disabled = true;
      msg.textContent = "";
      Promise.resolve(c.auth.updateUser({ password: a.value })).then(
        function (r) {
          if (r && r.error) {
            msg.textContent = traduire(r.error.message);
            ok.disabled = false;
            return;
          }
          a.value = b.value = "";
          retirer("mdp-ov");
          retirer("mdp-alerte");
          try {
            sessionStorage.removeItem(CLE_MASQUE);
          } catch (x) {}
          confirmation();
          verifier(true);
        },
        function (x) {
          msg.textContent = traduire(x && x.message);
          ok.disabled = false;
        }
      );
    });
    box.appendChild(ok);
    box.appendChild(sec);
    ov.appendChild(box);
    document.body.appendChild(ov);
    a.focus();
  }

  function confirmation() {
    var d = el("div", "Mot de passe modifié.", "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483100;padding:10px 16px;background:#0b5a2e;color:#fff;border-radius:8px;font-size:14px");
    d.id = "mdp-ok";
    d.setAttribute("role", "status");
    document.body.appendChild(d);
    setTimeout(function () {
      retirer("mdp-ok");
    }, 5000);
  }

  function nettoyer() {
    retirer("mdp-ov");
    retirer("mdp-alerte");
    retirer("mdp-btn");
  }

  function verifier(force) {
    var t = Date.now();
    if (occupe || (!force && t - derniere < 60000)) return Promise.resolve();
    occupe = true;
    derniere = t;
    var mfa = c.auth.mfa && c.auth.mfa.getAuthenticatorAssuranceLevel ? Promise.resolve(c.auth.mfa.getAuthenticatorAssuranceLevel()) : Promise.resolve(null);
    return mfa
      .then(function (a) {
        var d = a && a.data;
        if (d && d.nextLevel === "aal2" && d.currentLevel !== "aal2") return null; /* MFA pas encore validée : on attend */
        return c.rpc("mdp_politique_statut");
      })
      .then(function (r) {
        if (!r || r.error || !r.data) return; /* migration absente ou non connecté : ne rien changer */
        bouton();
        if (r.data.expire) ouvrir(true);
        else if (r.data.alerte && !masquee()) bandeau(r.data.jours_restants);
        else retirer("mdp-alerte");
      })
      .catch(function () {})
      .then(function () {
        occupe = false;
      });
  }

  c.auth.onAuthStateChange(function (ev, session) {
    if (ev === "SIGNED_OUT" || !session) {
      nettoyer();
      return;
    }
    if (ev === "SIGNED_IN" || ev === "INITIAL_SESSION" || ev === "MFA_CHALLENGE_VERIFIED") {
      /* Pas d'appel Supabase directement dans le callback (verrou interne) */
      clearTimeout(minuteur);
      minuteur = setTimeout(function () {
        verifier(ev === "MFA_CHALLENGE_VERIFIED");
      }, 400);
    }
  });
  setInterval(function () {
    verifier(true);
  }, 6 * 3600 * 1000);
  api.ouvrir = function () {
    ouvrir(false);
  };
  api.verifier = verifier;
})();
