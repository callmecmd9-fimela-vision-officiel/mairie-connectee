/* Page /quittance?ref=… : quittance imprimable avec QR Code (js/qr-local.js) menant à /verifier.html?ref=… */
(function () {
  var sb = supabase.createClient("https://aiqegpijisspankpkwfj.supabase.co", "sb_publishable__Zc0adl_eD_PyMkaR5ACzA_-_yjwmbI", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  var box = document.getElementById("r"),
    pr = document.getElementById("pr");
  function el(t, c, x) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (x != null) e.textContent = x;
    return e;
  }
  function ko(t) {
    box.textContent = "";
    box.appendChild(el("div", "ko", t));
  }
  var ref = (new URLSearchParams(location.search).get("ref") || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{10,60}$/.test(ref)) return ko("Quittance introuvable.");
  sb.rpc("verifier_quittance", { p_ref: ref }).then(
    function (r) {
      var x = r && !r.error && r.data && r.data[0];
      if (!x) return ko("Quittance introuvable.");
      var d = new Date(x.date_paiement),
        rows = [
          ["Commune", x.commune || "—"],
          ["Payeur", x.nom || "—"],
          ["Objet", x.objet || "—"],
          ["Montant", (+x.montant || 0).toLocaleString("fr-FR") + " FCFA"],
          [
            "Date",
            isNaN(d) ? "—" : d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          ],
          [
            "Mode",
            x.source == "guichet" ? "Espèces au guichet" : x.source == "en_ligne_simule" ? "En ligne (simulation)" : "Paiement enregistré"
          ]
        ];
      document.getElementById("c").textContent = x.commune || "";
      box.textContent = "";
      box.appendChild(el("div", "ok", "Paiement reçu"));
      var dl = el("dl");
      rows.forEach(function (a) {
        dl.appendChild(el("dt", "", a[0]));
        dl.appendChild(el("dd", "", a[1]));
      });
      var rd = el("dd", "ref", ref);
      dl.appendChild(el("dt", "", "Référence"));
      dl.appendChild(rd);
      box.appendChild(dl);
      var q = el("div", "qr");
      try {
        q.insertAdjacentHTML(
          "beforeend",
          window.qrSvg(location.origin + "/verifier.html?ref=" + encodeURIComponent(ref), {
            size: 180,
            label: "QR Code de vérification de la quittance"
          })
        );
      } catch (e) {}
      q.appendChild(el("p", "mut", "Scannez pour vérifier l’authenticité de cette quittance."));
      box.appendChild(q);
      if (x.source == "en_ligne_simule") box.appendChild(el("p", "sim", "Paiement en ligne simulé : document de démonstration."));
      pr.hidden = false;
      pr.addEventListener("click", function () {
        window.print();
      });
    },
    function () {
      ko("Chargement impossible. Réessayez.");
    }
  );
})();
