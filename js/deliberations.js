/* Suivi du Conseil municipal (espace mairie > Conseil municipal > Suivi des sessions) :
   sessions du Conseil et délibérations associées (date, objet, statut de transmission), avec création rapide
   d'une session ou d'une délibération (maire, secrétariat).
   Tables public.sessions_conseil et public.deliberations (colonnes de traçabilité : migration 20261203_lot11_gouvernance.sql).
   Données déjà chargées par core.js : D().se (sessions) et D().del (délibérations).
   Module encapsulé : aucun identifiant global déclaré.
   Dépend de core.js, core-ui.js, adjoints.js (fdd), secretariat.js (SES, SNAV, V), maire.js (st2) : à charger après maire.js. */
(() => {
  const ROLES = ["maire", "secretariat"],
    DL = { projet: "Projet", adoptee: "Adoptée", rejetee: "Rejetée" },
    DC = { projet: "or", adoptee: "ok", rejetee: "rd" },
    SC = { prevue: "or", convoquee: "bl", tenue: "ok", pv_redige: "ok", archivee: "" },
    EX = { a_executer: "À exécuter", en_cours: "En cours d’exécution", executee: "Exécutée", suspendue: "Suspendue", annulee: "Annulée" },
    peut = () => !S.sa && ROLES.includes(S.pr);
  let mode = ""; /* "" | "s" (formulaire session) | "d" (formulaire délibération) */

  /* statut de transmission au représentant de l'État + suites de traçabilité (publication, caractère exécutoire, exécution) */
  const transmission = x => {
    let t;
    if (x.statut == "projet") t = st2("Projet non transmissible", "or");
    else if (x.statut == "rejetee") t = st2("Transmission sans objet", "");
    else t = x.transmise_le ? st2("Transmise le " + fdd(x.transmise_le), "ok") : st2("À transmettre", "or");
    return (
      t +
      (x.publiee_le ? " " + st2("Publiée le " + fdd(x.publiee_le), "bl") : "") +
      (x.rendue_executoire_le ? " " + st2("Exécutoire le " + fdd(x.rendue_executoire_le), "bl") : "") +
      (x.statut_execution ? " " + st2(EX[x.statut_execution] || x.statut_execution, x.statut_execution == "executee" ? "ok" : "") : "")
    );
  };

  const ligneDel = x =>
    rw(
      `<b>${esc(x.objet)}</b><div class="mut" data-sty="font-size:13px">N° ${esc(x.numero)} · ${fdd(x.jour)}</div>`,
      `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(DL[x.statut] || x.statut || "—", DC[x.statut] || "")}${transmission(x)}</div>`
    );

  const formSession = () =>
    pn(
      "Nouvelle session du Conseil",
      "users",
      frm(
        sel("gv_ty", "Type de session", ["Session ordinaire", "Session extraordinaire"]) +
          inp("gv_jo", "Date", "date", T) +
          inp("gv_he", "Heure", "time", "09:00") +
          inp("gv_li", "Lieu", "text", "", "", 'maxlength="200"')
      ) +
        `<label for="gv_od">Ordre du jour</label><textarea id="gv_od" rows="4" maxlength="5000"></textarea><p data-sty="margin-top:10px"><button class="bt" data-m="gvssave">Programmer la session</button> <button class="bo" data-m="gvcancel">Annuler</button></p>`
    );

  const formDel = () =>
    pn(
      "Nouvelle délibération",
      "doc",
      frm(
        sel(
          "gv_se",
          "Session du Conseil",
          [["", "Sans session"]].concat(D().se.map(s => [s.id, (s.numero || "Session") + " · " + fdd(s.jour)]))
        ) +
          inp("gv_nu", "Numéro", "text", "", "Ex. 2027-001", 'maxlength="30"') +
          inp("gv_ob", "Objet", "text", "", "", 'maxlength="300"') +
          inp("gv_dj", "Date (reprise de la session si elle est choisie)", "date", T) +
          sel("gv_st", "Décision", [
            ["adoptee", "Adoptée"],
            ["rejetee", "Rejetée"],
            ["projet", "Projet"]
          ])
      ) +
        `<p data-sty="margin-top:10px"><button class="bt" data-m="gvdsave">Enregistrer la délibération</button> <button class="bo" data-m="gvcancel">Annuler</button></p>`
    );

  const deliberations = () => {
    const d = D(),
      S0 = d.se,
      L = d.del,
      ids = new Set(S0.map(s => s.id)),
      libres = L.filter(x => !x.session_id || !ids.has(x.session_id)),
      att = L.filter(x => x.statut == "adoptee" && !x.transmise_le).length,
      p = peut();
    return (
      `<div class="kp">${kp("k2", "users", "Sessions", S0.length)}${kp("k3", "doc", "Délibérations", L.length)}${kp("k1", "mail", "À transmettre", att)}</div>` +
      (p && mode == "s" ? formSession() : "") +
      (p && mode == "d" ? formDel() : "") +
      pn(
        "Sessions du Conseil et délibérations",
        "users",
        S0.map(s => {
          const dl = L.filter(x => x.session_id == s.id);
          return (
            rw(
              `<b>${esc(s.numero || "")} · ${esc(s.type)}</b><div class="mut" data-sty="font-size:13px">${fdd(s.jour)} ${esc((s.heure || "").slice(0, 5))} · ${esc(s.lieu || "lieu non précisé")}${s.transmission_le ? " · transmise le " + fdd(s.transmission_le) : ""}</div>`,
              `<div data-sty="display:grid;gap:4px;justify-items:end">${st2(SES[s.statut] || s.statut || "—", SC[s.statut] || "")}<span class="mut" data-sty="font-size:13px">${dl.length} délibération${dl.length > 1 ? "s" : ""}</span></div>`
            ) +
            (dl.length
              ? `<div data-sty="margin-left:14px;border-left:3px solid #CBD5E1;padding-left:8px">${dl.map(ligneDel).join("")}</div>`
              : "")
          );
        }).join("") || emp("Aucune session enregistrée."),
        p && !mode
          ? `<button class="bt" data-m="gvsnew">Nouvelle session</button> <button class="bt" data-m="gvdnew">Nouvelle délibération</button>`
          : ""
      ) +
      (libres.length ? pn("Délibérations hors session", "doc", libres.map(ligneDel).join("")) : "")
    );
  };

  RP.suiviconseil = [
    "maire",
    "adjoint",
    "cabinet",
    "secretariat"
  ]; /* lecture : périmètre des politiques RLS de sessions_conseil et deliberations */
  SPL.suiviconseil = "Suivi des sessions";
  SUB.suiviconseil = deliberations;

  /* Le secrétariat a sa propre navigation (SNAV) et n'utilise pas les espaces SP : entrée ajoutée ici pour qu'il accède à cet écran.
     Supprimer ce bloc si le secrétariat ne doit pas avoir cet écran dans son menu. */
  if (typeof SNAV != "undefined" && !SNAV.some(n => n[0] == "s_gv")) {
    SNAV.push(["s_gv", "Suivi du Conseil", "users"]);
    V.s_gv = () => page("Suivi du Conseil municipal", deliberations());
  }

  document.addEventListener("click", async e => {
    const t = e.target.closest("[data-m^=gv]"),
      m = t && t.dataset.m;
    if (!m || !/^gv(snew|dnew|cancel|ssave|dsave)$/.test(m) || !peut()) return;
    S.err = "";
    try {
      if (m == "gvsnew") mode = "s";
      else if (m == "gvdnew") mode = "d";
      else if (m == "gvcancel") mode = "";
      else {
        const g = id => (($("#" + id) || {}).value || "").trim();
        let r;
        if (m == "gvssave") {
          const o = {
            commune_id: S.cid,
            type: g("gv_ty") || "Session ordinaire",
            jour: g("gv_jo"),
            heure: g("gv_he") || "09:00",
            lieu: g("gv_li") || null,
            ordre_du_jour: g("gv_od") || null
          };
          if (!o.jour) throw new Error("La date de la session est obligatoire.");
          r = await sb.from("sessions_conseil").insert(o);
        } else {
          const se = D().se.find(x => x.id == g("gv_se")),
            o = {
              commune_id: S.cid,
              numero: g("gv_nu"),
              objet: g("gv_ob"),
              statut: g("gv_st") || "adoptee",
              jour: se ? se.jour : g("gv_dj") || T,
              session_id: se ? se.id : null
            };
          if (!o.numero || !o.objet) throw new Error("Numéro et objet obligatoires.");
          r = await sb.from("deliberations").insert(o);
        }
        if (r.error) throw new Error("Enregistrement refusé : " + r.error.message);
        mode = "";
        await load(["sessions_conseil", "deliberations"]);
        S.err = m == "gvssave" ? "Session programmée." : "Délibération enregistrée.";
      }
    } catch (x) {
      S.err = x && x.message ? x.message : "Erreur réseau. Réessayez.";
    }
    render();
    window.scrollTo(0, 0);
  });
})();
