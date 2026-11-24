/* Page publique /verifier.html?ref=… : lit la référence dans l'URL et interroge Supabase (aucune connexion requise). */
(function () {
  var sb = supabase.createClient("https://aiqegpijisspankpkwfj.supabase.co", "sb_publishable__Zc0adl_eD_PyMkaR5ACzA_-_yjwmbI", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  var box = document.getElementById("r");
  function msg(cls, t) {
    box.textContent = "";
    var d = document.createElement("div");
    d.className = cls;
    d.textContent = t;
    box.appendChild(d);
    return d;
  }
  var ref = (new URLSearchParams(location.search).get("ref") || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{10,60}$/.test(ref)) return msg("ko", "Faux reçu : référence absente ou invalide.");
  sb.rpc("verifier_quittance", { p_ref: ref }).then(
    function (r) {
      var x = r && !r.error && r.data && r.data[0];
      if (!x) return msg("ko", r && r.error ? "Vérification impossible pour le moment. Réessayez." : "Faux reçu");
      var m = (+x.montant || 0).toLocaleString("fr-FR") + " FCFA",
        d = new Date(x.date_paiement),
        ds = isNaN(d) ? "—" : d.toLocaleDateString("fr-FR");
      msg("ok", "Quittance Valide : " + (x.nom || "—") + ", " + m + ", " + ds);
      var p = document.createElement("p");
      p.className = "mut";
      p.textContent = (x.commune || "") + (x.objet ? " · " + x.objet : "") + " · Réf. " + ref + (x.source == "en_ligne_simule" ? " · paiement en ligne simulé (démonstration)" : "");
      box.appendChild(p);
    },
    function () {
      msg("ko", "Vérification impossible pour le moment. Réessayez.");
    }
  );
})();
