/* Page publique /suivi.html : numéro de suivi + téléphone -> état du dossier via la RPC suivi_public (aucune connexion requise).
   Toutes les valeurs affichées passent par textContent (jamais de HTML injecté) ; la RPC ne renvoie aucune donnée personnelle. */
(function () {
  "use strict";
  var NOT_FOUND = "Aucune demande trouvée. Vérifiez le numéro et le téléphone.",
    UNAVAILABLE = "Vérification impossible pour le moment. Réessayez dans quelques instants.",
    ST = {
      nouvelle: "Reçue",
      depose: "Déposée",
      orientee: "Orientée vers le service compétent",
      en_cours: "En cours de traitement",
      a_valider: "En attente de validation",
      en_attente_pieces: "Pièces complémentaires à fournir",
      a_payer: "En attente de paiement",
      paye: "Payée",
      en_production: "En cours de préparation",
      traitee: "Traitée",
      acceptee: "Acceptée",
      pret_a_retirer: "Prête à retirer",
      retire: "Retirée",
      redirigee: "Redirigée vers un autre organisme",
      rejetee: "Rejetée",
      cloturee: "Clôturée"
    },
    form = document.getElementById("sv-f"),
    inNum = document.getElementById("sv-n"),
    inTel = document.getElementById("sv-t2"),
    btn = document.getElementById("sv-b"),
    box = document.getElementById("sv-r");
  if (!form || !box) return;
  var sb = supabase.createClient("https://aiqegpijisspankpkwfj.supabase.co", "sb_publishable__Zc0adl_eD_PyMkaR5ACzA_-_yjwmbI", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function msg(cls, txt) {
    box.textContent = "";
    box.appendChild(el("p", cls, txt));
  }
  function row(label, value, strong) {
    var r = el("div", "rw"),
      l = el("span", "mu", label),
      v = el(strong ? "b" : "span", "", value);
    r.appendChild(l);
    r.appendChild(v);
    return r;
  }
  function fmtDate(x) {
    var d = x ? new Date(x) : null;
    return d && !isNaN(d)
      ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) +
          " à " +
          d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : "—";
  }
  function render(x) {
    var st = String(x.statut || ""),
      du = +x.montant_du || 0;
    box.textContent = "";
    var ok = el("div", "okb");
    ok.appendChild(el("b", "", "Demande " + String(x.num_suivi || "")));
    box.appendChild(ok);
    box.appendChild(row("Statut", ST[st] || "En cours de traitement", true));
    if (st === "a_payer" && du > 0) box.appendChild(row("Montant dû", du.toLocaleString("fr-FR") + " FCFA", true));
    if (x.presence_requise) {
      var pp = x.presence_pieces ? String(x.presence_pieces) : "selon les indications de la mairie";
      box.appendChild(row("Présence requise", "En mairie. À apporter : " + pp, true));
    }
    box.appendChild(row("Lieu de retrait", x.lieu_retrait ? String(x.lieu_retrait) : "À préciser par la mairie"));
    box.appendChild(row("Dernière mise à jour", fmtDate(x.date_maj)));
    if (st === "a_payer")
      box.appendChild(el("p", "mu sm", "Présentez-vous au guichet de la mairie avec ce numéro pour régler le montant dû."));
    if (st === "pret_a_retirer") box.appendChild(el("p", "mu sm", "Munissez-vous de votre pièce d’identité pour retirer le document."));
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var num = String(inNum.value || "")
        .trim()
        .toUpperCase(),
      tel = String(inTel.value || "").trim(),
      digits = tel.replace(/\D/g, "");
    inNum.value = num;
    /* Mêmes contrôles que la RPC : un format invalide ne part pas sur le réseau */
    if (!/^FIM-[0-9]{4}-[0-9]{6}$/.test(num) || digits.length < 9 || digits.length > 15) return msg("al", NOT_FOUND);
    btn.disabled = true;
    msg("mu", "Vérification en cours…");
    sb.rpc("suivi_public", { p_num: num, p_tel: tel }).then(
      function (r) {
        btn.disabled = false;
        if (r.error) return msg("al", UNAVAILABLE);
        var x = Array.isArray(r.data) ? r.data[0] : r.data;
        if (!x || !x.num_suivi) return msg("al", NOT_FOUND);
        render(x);
      },
      function () {
        btn.disabled = false;
        msg("al", UNAVAILABLE);
      }
    );
  });
})();
(function () {
  "use strict";
  var h = document.querySelector(".hd");
  if (!h) return;
  function onScroll() {
    h.classList.toggle("is-scrolled", window.scrollY > 10);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
