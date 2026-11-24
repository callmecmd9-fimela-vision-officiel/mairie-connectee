/* actions */
const TBA = (() => {
  const o = {},
    s = (t, l) => l.split(" ").forEach(k => (o[k] = t));
  s(["adjoints"], "adjsave adjphoto adjlink adjoff");
  s(["delegations"], "delsave delacte delval delend deldl");
  s(["projets"], "pjassign pjsuivi addproj cycp delproj pjpub");
  s(["reunions", "reunion_participants"], "rusave rudel ruconv");
  s(["reunions"], "rucr");
  s(["instructions"], "insave inrep incl sinsave sinaff sinst sinobs sinrel");
  s(["rapports"], "rpsave rpobs rparch");
  s(["messages"], "mssend msopen");
  s(["notifications"], "ntall ntgo");
  s(["courrier"], "cinsave cinaff cinadj cintrm cinst cinobs cosave costatut coatt coenv codel addmail cycm");
  s(["actes"], "acsave acst acsign acpreuve actrans acdel");
  s(["sessions_conseil"], "sesave secv sedoc sepv setrans sesuites sest");
  s(["session_presences"], "sepres");
  s(["deliberations"], "sedel sedtr adddel cycd deldel");
  s(["conseillers"], "cnsave cnoff");
  s(["services"], "svsave svdel");
  s(["dossiers"], "dosave dost dosdoc dosobs");
  s(["documents"], "arsave arst");
  s(["rdv"], "addrdv delrdv");
  s(["publications"], "addpost nextp delp");
  s(["medias", "publications"], "addphoto addvideo delmed");
  s(["finances"], "addfin delfin");
  s(["indicateurs"], "saveind upimg");
  return o;
})();
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-a]");
  if (!t) return;
  const a = t.dataset.a,
    i = +t.dataset.i,
    g = id => (($("#" + id) || {}).value || "").trim(),
    d = D(),
    c = S.cid,
    n = id => +g(id) || 0;
  if (a == "idea") {
    $("#pt").value = P[Math.floor(Math.random() * P.length)].replace("{c}", S.co);
    return;
  }
  if (a == "copy") {
    try {
      navigator.clipboard.writeText(d.posts[i].t);
      t.textContent = "Copié";
    } catch (x) {}
    return;
  }
  if (a == "useia") {
    $("#pt").value = (S.ia || [])[i] || "";
    return;
  }
  if (a == "geo") {
    navigator.geolocation &&
      navigator.geolocation.getCurrentPosition(
        p => {
          $("#jy").value = p.coords.latitude.toFixed(6);
          $("#jx").value = p.coords.longitude.toFixed(6);
        },
        () => {
          t.textContent = "Position refusée";
        },
        { enableHighAccuracy: true }
      );
    return;
  }
  if (a == "print") {
    window.print();
    return;
  }
  if (a == "csv") {
    const k = t.dataset.k,
      rows =
        k == "projets"
          ? [["Titre", "Localité", "Catégorie", "Statut", "Avancement", "Budget"]].concat(
              d.proj.map(p => [p.titre, p.localite, p.categorie, PSL[p.statut], p.avancement, p.budget])
            )
          : [["Numéro", "Type", "Nom", "Message", "Statut"]].concat(d.req.map(r => [r.n, r.t, r.w, r.m, r.st])),
      q = x =>
        '"' +
        String(x == null ? "" : x)
          .replace(/^[=+\-@]/, "'$&")
          .replace(/"/g, '""') +
        '"',
      u = URL.createObjectURL(new Blob(["\ufeff" + rows.map(r => r.map(q).join(";")).join("\n")], { type: "text/csv" })),
      l = document.createElement("a");
    l.href = u;
    l.download = k + ".csv";
    l.click();
    URL.revokeObjectURL(u);
    return;
  }
  if (a == "ia") {
    const out = $("#iar");
    try {
      out.textContent = "Écriture en cours…";
      t.disabled = true;
      const r = await sb.functions.invoke("ia-texte", { body: { commune: slug(), sujet: g("ps"), reseau: g("pr") } });
      t.disabled = false;
      if (r.error) {
        let m = "IA indisponible pour le moment.";
        try {
          m = (await r.error.context.json()).error || m;
        } catch (x) {}
        out.textContent = m;
        return;
      }
      S.ia = r.data.textes || [];
      out.innerHTML = S.ia
        .map(
          (x, k) =>
            `<div class="pn" data-sty="padding:12px"><i>${esc(x)}</i><p data-sty="margin:8px 0 0"><button class="tg" data-a="useia" data-i="${k}">Utiliser ce texte</button></p></div>`
        )
        .join("");
    } catch (x) {
      t.disabled = false;
      if (out) out.textContent = "IA indisponible pour le moment.";
    }
    return;
  }
  S.err = "";
  try {
    if (a == "enter") {
      if (!S.tok) S.err = "Veuillez valider la vérification anti-spam, puis réessayer.";
      else {
        const r = await sb.auth.signInWithPassword({
          email: g("em"),
          password: ($("#pw") || {}).value || "",
          options: { captchaToken: S.tok }
        });
        if (r.error) S.err = r.error.message;
        else if (await profil()) await load();
      }
    } else if (a == "mfa-enroll-verify") {
      if (!S.mfa || !S.mfa.setup || !S.mfa.factorId) throw new Error("Aucune configuration TOTP en attente.");
      const code = g("mfa_code");
      if (!/^\d{6}$/.test(code)) throw new Error("Saisissez le code à 6 chiffres.");
      const v = await sb.auth.mfa.challengeAndVerify({ factorId: S.mfa.factorId, code });
      if (v.error) throw new Error("Code TOTP invalide. Vérifiez l’heure de votre appareil et réessayez.");
      S.mfa = null;
      if (await profil()) await load();
    } else if (a == "mfa-verify") {
      if (!S.mfa || !S.mfa.factorId || !S.mfa.challengeId) throw new Error("Aucun défi MFA actif. Renvoyez un défi.");
      const code = g("mfa_code");
      if (!/^\d{6}$/.test(code)) throw new Error("Saisissez le code à 6 chiffres.");
      const v = await sb.auth.mfa.verify({ factorId: S.mfa.factorId, challengeId: S.mfa.challengeId, code });
      if (v.error) throw new Error("Code MFA invalide ou expiré. Réessayez.");
      S.mfa = null;
      if (await profil()) await load();
    } else if (a == "mfa-resend") {
      if (!S.mfa || !S.mfa.factorId) throw new Error("Facteur MFA indisponible.");
      const ch = await sb.auth.mfa.challenge({ factorId: S.mfa.factorId });
      if (ch.error) throw ch.error;
      S.mfa.challengeId = ch.data.id;
      S.err = "Un nouveau défi MFA est prêt.";
    } else if (a == "mfa-cancel") {
      if (S.mfa && S.mfa.setup && S.mfa.factorId) await sb.auth.mfa.unenroll({ factorId: S.mfa.factorId });
      S.mfa = null;
      S.role = null;
      S.cid = null;
      S.uid = null;
      S.sa = false;
      S.db = E0;
      S.ind = {};
      await sb.auth.signOut();
      S.err = "Connexion annulée.";
    } else if (a == "out") {
      S.role = null;
      S.cid = null;
      S.uid = null;
      S.sa = false;
      S.db = E0;
      S.ind = {};
      await sb.auth.signOut();
    } else if (a == "menu") S.menu = !S.menu;
    else if (a == "go") {
      S.view = t.dataset.v;
      S.menu = false;
    } else if (a == "tab") S.tab[t.dataset.g] = t.dataset.v;
    else if (a == "filt") S.f = t.dataset.f;
    else if (a == "opend") {
      S.dd = d.req[i].id;
      markSeen(S.dd);
      await openD();
    } else if (a == "cld") {
      S.dd = null;
    } else if (a == "dact") {
      const r = d.req.find(x => x.id == S.dd);
      if (r) {
        const u = {};
        if (t.dataset.s) u.statut = t.dataset.s;
        if (t.dataset.o) u.service = g("dsv");
        if (t.dataset.r) u.reponse = g("drp") || null;
        if (t.dataset.pc) {
          u.pieces_demandees = g("dpc") || null;
          u.reponse = u.pieces_demandees;
        }
        if (t.dataset.mr) {
          u.motif_rejet = g("dmr") || null;
          u.reponse = u.motif_rejet;
        }
        if (t.dataset.pc && !u.pieces_demandees) S.err = "Indiquez la pièce manquante à demander au citoyen.";
        else if (t.dataset.mr && !u.motif_rejet) S.err = "Saisissez le motif du rejet.";
        else if (["traitee", "redirigee", "rejetee", "en_attente_pieces", "pret_a_retirer"].includes(u.statut) && !u.reponse)
          S.err = "Rédigez d’abord le message au citoyen (réponse, motif du rejet, pièces demandées ou lieu et modalités de retrait).";
        else {
          const ur = await run(sb.from("demandes").update(u).eq("id", r.id));
          await load(["demandes"]);
          await openD();
          /* LOT 6 : proposition d'avertir le citoyen par WhatsApp après un changement de statut réussi (js/notifications.js) */
          if (!ur.error && u.statut && typeof notifProposer == "function") notifProposer(r.id, u.statut);
        }
      }
    } else if (UIB.includes(a)) {
      if (a == "sopen") {
        S.sel[t.dataset.k] = t.dataset.id || null;
        S.hk = null;
      } else if (a == "gos") {
        const v = t.dataset.v;
        if (t.dataset.r) {
          printTab(REP[t.dataset.r]());
          return;
        }
        if (isS()) S.view = v;
        else {
          S.view = "s_sec";
          S.tab.secretariat = SMAP[v] || "sdash";
        }
        S.menu = false;
      } else if (a == "flt") {
        const m = t.dataset.m;
        S.fl[m] = {
          q: g("f_" + m + "_q"),
          st: g("f_" + m + "_st"),
          sv: g("f_" + m + "_sv"),
          d1: g("f_" + m + "_d1"),
          d2: g("f_" + m + "_d2"),
          an: g("f_" + m + "_an"),
          cf: g("f_" + m + "_cf")
        };
      } else if (a == "flr") S.fl[t.dataset.m] = {};
      else if (a == "rpgen") {
        const R = REP[t.dataset.k]();
        if (t.dataset.f == "csv") csvx(R, t.dataset.k);
        else printTab(R);
        return;
      } else if (a == "coprint") {
        const o = d.cr.find(x => x.id == S.sel.cout);
        if (o) {
          $("#prt").innerHTML =
            `<div data-sty="font:16px/1.6 'Nunito Sans',sans-serif;padding:40px"><div data-sty="text-align:center"><b>MAIRIE DE ${esc(S.co.toUpperCase())}</b><br>${esc(S.ind.slogan || "")}</div><p data-sty="text-align:right">${esc(S.co)}, le ${fdd(o.date_envoi || T)}</p><p>Réf. : ${esc(o.reference)}<br><b>À : ${esc(o.correspondant)}</b></p><p><b>Objet : ${esc(o.objet)}</b></p><div data-sty="white-space:pre-wrap">${esc(o.contenu || "")}</div></div>`;
          setTimeout(() => window.print(), 400);
        }
        return;
      } else if (a == "dochist") {
        const r = await run(
          sb
            .from("documents_consultations")
            .select("created_at")
            .eq("document_id", t.dataset.id)
            .order("created_at", { ascending: false })
            .limit(30)
        );
        S.dch = { id: t.dataset.id, rows: r.data || [] };
      } else if (a == "ofile") {
        const w = window.open("", "_blank"),
          r = await sb.storage.from("archives").createSignedUrl(t.dataset.p, 120);
        if (t.dataset.d) await sb.rpc("journal_consultation", { p_doc: t.dataset.d });
        if (r.data && w) {
          w.location = r.data.signedUrl;
          return;
        }
        if (w) w.close();
        S.err = "Document indisponible.";
      }
    } else if (MUT2.includes(a)) {
      const id = t.dataset.id,
        sx = S.sel,
        upd = (tb, o, k) => run(sb.from(tb).update(o).eq("id", k));
      if (a == "cinsave") {
        const o = {
          sens: "in",
          correspondant: g("c_ex"),
          organisme: g("c_or") || null,
          objet: g("c_ob"),
          categorie: g("c_ca"),
          priorite: g("c_pr"),
          date_reception: g("c_dr") || T,
          date_limite: g("c_dl") || null,
          service: g("c_sv") || null,
          destinataire: g("c_de") || null,
          observations: g("c_obs") || null,
          statut: "recu",
          commune_id: c
        };
        if (!o.correspondant || !o.objet) S.err = "L’expéditeur et l’objet sont obligatoires.";
        else {
          const u = await upa("c_fi", o.categorie == "Correspondance confidentielle" ? "confidentiel" : "courrier");
          if (u) o.pieces = [u.p];
          const r = await run(sb.from("courrier").insert(o));
          if (!r.error) S.err = "Courrier enregistré.";
        }
      } else if (a == "cinaff") {
        await upd("courrier", { service: g("cp_sv") || null, statut: g("cp_sv") ? "affecte" : "a_traiter" }, sx.cin);
        if (!S.err) S.err = "Courrier affecté.";
      } else if (a == "cinadj") {
        await upd("courrier", { adjoint_id: g("cp_aj") || null, statut: "affecte" }, sx.cin);
        if (!S.err) S.err = "Courrier transmis à l’adjoint.";
      } else if (a == "cintrm") {
        await upd("courrier", { service: "maire", destinataire: "Le Maire", statut: "affecte" }, sx.cin);
        if (!S.err) S.err = "Courrier transmis au maire.";
      } else if (a == "cinst") await upd("courrier", { statut: t.dataset.s }, sx.cin);
      else if (a == "cinobs") {
        await upd("courrier", { observations: g("cp_ob") || null }, sx.cin);
        if (!S.err) S.err = "Observations enregistrées.";
      } else if (a == "cosave") {
        const e = S.ed && S.ed.e == "cr",
          o = { sens: "out", correspondant: g("o_de"), objet: g("o_ob"), contenu: g("o_ct") || null, modele: g("o_mo") || null };
        if (!o.correspondant || !o.objet) S.err = "Le destinataire et l’objet sont obligatoires.";
        else {
          const u = await upa("o_fi", "courrier");
          let r;
          if (e) {
            if (u) o.pieces = (S.ed.r.pieces || []).concat(u.p);
            r = await run(sb.from("courrier").update(o).eq("id", S.ed.r.id));
          } else {
            o.statut = "brouillon";
            o.commune_id = c;
            if (u) o.pieces = [u.p];
            r = await run(sb.from("courrier").insert(o));
          }
          if (!r.error) {
            S.ed = {};
            S.err = "Brouillon enregistré.";
          }
        }
      } else if (a == "costatut") {
        await upd("courrier", { statut: t.dataset.s }, sx.cout);
        if (!S.err) S.err = "Statut mis à jour.";
      } else if (a == "coatt") {
        const u = await upa("o_sg", "courrier");
        if (!u) S.err = "Choisissez la copie signée.";
        else {
          const o = d.cr.find(x => x.id == sx.cout);
          await upd("courrier", { pieces: (o.pieces || []).concat(u.p) }, sx.cout);
          if (!S.err) S.err = "Copie signée jointe.";
        }
      } else if (a == "coenv") {
        const u = await upa("o_pv", "courrier"),
          o = { statut: "envoye", date_envoi: g("o_dt") || T, mode_transmission: g("o_md") };
        if (u) o.preuve_envoi = u.p;
        await upd("courrier", o, sx.cout);
        if (!S.err) S.err = "Envoi enregistré.";
      } else if (a == "codel") {
        if (confirm("Supprimer ce brouillon ?")) {
          await run(sb.from("courrier").delete().eq("id", sx.cout));
          sx.cout = null;
        }
      } else if (a == "acsave") {
        const o = {
          nature: g("a_na"),
          objet: g("a_ob"),
          date_redaction: g("a_dr") || T,
          service: g("a_sv") || null,
          signataire: g("a_sg") || null,
          commune_id: c
        };
        if (!o.objet) S.err = "L’objet est obligatoire.";
        else {
          const u = await upa("a_fi", "actes");
          if (u) o.pdf = u.p;
          const r = await run(sb.from("actes").insert(o));
          if (!r.error) S.err = "Acte enregistré (brouillon).";
        }
      } else if (a == "acst") {
        await upd("actes", { statut: t.dataset.s }, sx.act);
        if (!S.err) S.err = "Statut de l’acte mis à jour.";
      } else if (a == "acsign") {
        const x = d.act.find(y => y.id == sx.act),
          u = await upa("a_ps", "actes");
        await upd(
          "actes",
          {
            statut: "signe",
            date_signature: g("a_ds") || null,
            signataire: g("a_sg2") || x.signataire,
            preuve_signature: u ? u.p : x.preuve_signature
          },
          sx.act
        );
        if (!S.err) S.err = "Signature enregistrée : l’acte est désormais verrouillé.";
      } else if (a == "acpreuve") {
        const u = await upa("a_ps", "actes");
        if (!u) S.err = "Choisissez le fichier de preuve.";
        else {
          await upd("actes", { preuve_signature: u.p, date_signature: g("a_ds") || null, signataire: g("a_sg2") || null }, sx.act);
          if (!S.err) S.err = "Preuve enregistrée : le maire peut maintenant signer.";
        }
      } else if (a == "actrans") {
        const u = await upa("a_pt", "actes"),
          o = { statut: "transmis", date_transmission: g("a_dt") || T };
        if (u) o.preuve_transmission = u.p;
        await upd("actes", o, sx.act);
        if (!S.err) S.err = "Transmission enregistrée.";
      } else if (a == "acdel") {
        if (confirm("Supprimer ce brouillon ?")) {
          await run(sb.from("actes").delete().eq("id", sx.act));
          sx.act = null;
        }
      } else if (a == "sesave") {
        const o = {
          type: g("se_ty"),
          jour: g("se_jo"),
          heure: g("se_he") || "09:00",
          lieu: g("se_li") || null,
          ordre_du_jour: g("se_od") || null,
          commune_id: c
        };
        if (!o.jour) S.err = "La date est obligatoire.";
        else {
          await run(sb.from("sessions_conseil").insert(o));
          if (!S.err) S.err = "Session programmée.";
        }
      } else if (a == "secv") {
        await upd("sessions_conseil", { convocation_le: g("se_cv") || T, statut: "convoquee" }, sx.ses);
        if (!S.err) S.err = "Convocations enregistrées.";
      } else if (a == "sedoc") {
        const u = await upa("se_dc", "conseil");
        if (!u) S.err = "Choisissez un document.";
        else {
          const o = d.se.find(x => x.id == sx.ses);
          await upd("sessions_conseil", { documents: (o.documents || []).concat(u.p) }, sx.ses);
        }
      } else if (a == "sepres") {
        const rows = d.cn
          .filter(x => x.actif)
          .map(x => ({ session_id: sx.ses, conseiller_id: x.id, present: !!($("#pc_" + x.id) && $("#pc_" + x.id).checked) }));
        if (rows.length) {
          await run(sb.from("session_presences").upsert(rows, { onConflict: "session_id,conseiller_id" }));
          if (!S.err) S.err = "Présences enregistrées.";
        }
      } else if (a == "sepv") {
        const u = await upa("se_pv", "conseil");
        if (!u) S.err = "Choisissez le procès-verbal.";
        else {
          await upd("sessions_conseil", { pv: u.p, statut: "pv_redige" }, sx.ses);
          if (!S.err) S.err = "Procès-verbal enregistré.";
        }
      } else if (a == "sedel") {
        const o = d.se.find(x => x.id == sx.ses),
          r = { commune_id: c, numero: g("sd_nu"), objet: g("sd_ob"), statut: g("sd_st"), jour: o.jour, session_id: o.id };
        if (!r.objet || !r.numero) S.err = "Numéro et objet obligatoires.";
        else {
          await run(sb.from("deliberations").insert(r));
          if (!S.err) S.err = "Délibération enregistrée.";
        }
      } else if (a == "sedtr") {
        await upd("deliberations", { transmise_le: T }, id);
      } else if (a == "setrans") {
        await upd("sessions_conseil", { transmission_le: g("se_tr") || T }, sx.ses);
        if (!S.err) S.err = "Transmission enregistrée.";
      } else if (a == "sesuites") {
        await upd("sessions_conseil", { observations_etat: g("se_oe") || null, suites: g("se_su") || null }, sx.ses);
        if (!S.err) S.err = "Observations et suites enregistrées.";
      } else if (a == "sest") await upd("sessions_conseil", { statut: t.dataset.s }, sx.ses);
      else if (a == "cnsave") {
        const o = { prenom: g("k_pr"), nom: g("k_nm"), fonction: g("k_fn") || null, contact: g("k_ct") || null };
        if (!o.prenom || !o.nom) S.err = "Prénom et nom obligatoires.";
        else {
          const e = S.ed && S.ed.e == "cn",
            r = e ? await upd("conseillers", o, S.ed.r.id) : await run(sb.from("conseillers").insert({ ...o, commune_id: c }));
          if (!r.error) {
            S.ed = {};
            S.err = "Conseiller enregistré.";
          }
        }
      } else if (a == "cnoff") {
        const x = d.cn.find(y => y.id == id);
        await upd("conseillers", { actif: !x.actif }, id);
      } else if (a == "sinsave") {
        const o = {
          service: g("n_s2") || null,
          responsable: g("n_r2") || null,
          objet: g("n_o2"),
          auteur: g("n_a2") || null,
          priorite: g("n_p2"),
          date_limite: g("n_d2") || null,
          description: g("n_t2") || null,
          statut: "affectee",
          commune_id: c
        };
        if (!o.objet || !o.service) S.err = "Le service destinataire et l’objet sont obligatoires.";
        else {
          const u = await upa("n_f2", "instructions");
          if (u) o.pieces = [u.p];
          await run(sb.from("instructions").insert(o));
          if (!S.err) S.err = "Instruction enregistrée et affectée.";
        }
      } else if (a == "sinaff") {
        await upd("instructions", { service: g("n_sv") || null, responsable: g("n_re") || null, statut: "affectee" }, sx.ins);
        if (!S.err) S.err = "Instruction affectée.";
      } else if (a == "sinst") await upd("instructions", { statut: t.dataset.s }, sx.ins);
      else if (a == "sinobs") {
        await upd("instructions", { observations: g("n_ob") || null }, sx.ins);
        if (!S.err) S.err = "Observations enregistrées.";
      } else if (a == "sinrel") {
        await run(sb.rpc("relancer_instruction", { p_id: sx.ins }));
        if (!S.err) S.err = "Relance envoyée.";
      } else if (a == "svsave") {
        const o = { nom: g("v_no"), code: g("v_co"), responsable: g("v_re") || null, effectif: g("v_ef") === "" ? null : n("v_ef") };
        if (!o.nom) S.err = "Le nom du service est obligatoire.";
        else {
          const e = S.ed && S.ed.e == "sv",
            r = e ? await upd("services", o, S.ed.r.id) : await run(sb.from("services").insert({ ...o, commune_id: c }));
          if (!r.error) {
            S.ed = {};
            S.err = "Service enregistré.";
          }
        }
      } else if (a == "svdel") {
        if (confirm("Retirer ce service ?")) await upd("services", { actif: false }, id);
      } else if (a == "dosave") {
        const o = {
          intitule: g("d_in"),
          demandeur: g("d_de") || null,
          categorie: g("d_ca") || null,
          service: g("d_sv") || null,
          responsable: g("d_re") || null,
          echeance: g("d_ec") || null,
          objet: g("d_ob") || null,
          commune_id: c
        };
        if (!o.intitule) S.err = "L’intitulé est obligatoire.";
        else {
          const u = await upa("d_fi", "dossiers");
          if (u) o.documents = [u.p];
          const r = await run(sb.from("dossiers").insert(o));
          if (!r.error) S.err = "Dossier ouvert.";
        }
      } else if (a == "dost") {
        await upd("dossiers", { statut: t.dataset.s }, sx.dos);
      } else if (a == "dosdoc") {
        const u = await upa("d_f2", "dossiers");
        if (!u) S.err = "Choisissez un document.";
        else {
          const o = d.dos.find(x => x.id == sx.dos);
          await upd("dossiers", { documents: (o.documents || []).concat(u.p) }, sx.dos);
        }
      } else if (a == "dosobs") {
        await upd("dossiers", { observations: g("d_o2") || null }, sx.dos);
        if (!S.err) S.err = "Observations enregistrées.";
      } else if (a == "arsave") {
        const e = S.ed && S.ed.e == "dc",
          f = ($("#ar_fi") || {}).files && $("#ar_fi").files[0],
          ti = g("ar_ti");
        if (!f || !ti) S.err = "Choisissez un fichier et indiquez un titre.";
        else {
          const cf = g("ar_cf"),
            u = await upa("ar_fi", cf == "confidentiel" ? "confidentiel" : "documents"),
            o = {
              commune_id: c,
              titre: ti,
              annee: n("ar_an") || Y,
              service: g("ar_sv") || null,
              categorie: g("ar_ca") || null,
              type_doc: g("ar_ty") || null,
              confidentialite: cf,
              chemin: u.p,
              mime: u.mime,
              taille: u.size,
              conservation_ans: g("ar_cs") === "" ? null : n("ar_cs")
            };
          if (e) {
            const root = S.ed.r.parent_id || S.ed.r.id,
              mx = Math.max.apply(
                null,
                d.dc.filter(x => x.id == root || x.parent_id == root).map(x => x.version)
              );
            o.reference = S.ed.r.reference;
            o.parent_id = root;
            o.version = mx + 1;
          }
          const r = await run(sb.from("documents").insert(o));
          if (!r.error) {
            S.ed = {};
            S.err = e ? "Nouvelle version enregistrée." : "Document archivé.";
          }
        }
      } else if (a == "arst") {
        await upd("documents", { statut: "archive" }, id);
      } else if (a == "ruconv") {
        await run(sb.rpc("convoquer_reunion", { p_id: S.rd }));
        if (!S.err) S.err = "Convocations envoyées.";
      }
      await load(TBA[a]);
    } else if (UIA.includes(a)) {
      if (a == "adjv") {
        S.adjv = t.dataset.id || null;
        if (S.adjv) {
          S.view = SP.administration.v;
          S.tab.administration = "adjlist";
        }
      } else if (a == "edit") {
        S.ed = { e: t.dataset.e, r: d[t.dataset.e].find(x => x.id == t.dataset.id) };
      } else if (a == "ecl") S.ed = {};
      else if (a == "ruopen") S.rd = t.dataset.id || null;
      else if (a == "inopen") S.ri = t.dataset.id || null;
      else if (a == "rpopen") S.rr = t.dataset.id || null;
      else if (a == "hist") {
        const r = await run(
          sb.from("ops_historique").select("*").eq("table_name", t.dataset.tb).eq("row_id", t.dataset.id).order("created_at")
        );
        S.hi = r.data || [];
        S.hk = t.dataset.id;
      } else if (a == "rppdf") {
        printRap(d.rap.find(x => x.id == t.dataset.id));
        return;
      } else if (a == "pjrapport") {
        const p = d.proj[i];
        S.pre = {
          type: "Rapport d’avancement des projets",
          titre: "Suivi : " + p.titre,
          contenu:
            "Projet " +
            (p.numero || "") +
            " — " +
            p.titre +
            "\nStatut : " +
            PSS[p.statut] +
            " (" +
            p.avancement +
            "%)\nDifficultés : " +
            (p.difficultes || "—") +
            "\nObservations : " +
            (p.observations || "—")
        };
        S.ed = {};
        S.view = "a_rapp";
      }
    } else if (MUT.includes(a)) {
      const id = t.dataset.id;
      if (a == "adjsave") {
        const o = {
          prenom: g("a_pr"),
          nom: g("a_nm"),
          rang: n("a_rg"),
          fonction: g("a_fn") || null,
          telephone: g("a_tl") || null,
          email: g("a_em") || null
        };
        if (!o.prenom || !o.nom || !o.rang) S.err = "Prénom, nom et rang sont obligatoires.";
        else {
          const e = S.ed && S.ed.e == "adj",
            r = e
              ? await run(sb.from("adjoints").update(o).eq("id", S.ed.r.id))
              : await run(sb.from("adjoints").insert({ ...o, commune_id: c }));
          if (!r.error) {
            S.ed = {};
            S.err = "Adjoint enregistré.";
          }
        }
      } else if (a == "adjphoto") {
        const p = await upl("ph_" + id, id);
        if (p) {
          const a0 = d.adj.find(x => x.id == id);
          if (a0.photo) await sb.storage.from("adjoints").remove([a0.photo]);
          await run(sb.from("adjoints").update({ photo: p }).eq("id", id));
        } else S.err = "Choisissez d’abord une photo.";
      } else if (a == "adjlink") {
        await run(sb.rpc("lier_adjoint", { p_adjoint: id, p_email: g("lk_" + id) }));
        if (!S.err) S.err = "Compte lié à l’adjoint.";
      } else if (a == "adjoff") {
        const a0 = d.adj.find(x => x.id == id);
        await run(sb.from("adjoints").update({ actif: !a0.actif }).eq("id", id));
      } else if (a == "delsave") {
        const o = {
          adjoint_id: g("d_aj"),
          domaine: g("d_dm"),
          missions: g("d_ms") || null,
          limites: g("d_lm") || null,
          date_debut: g("d_db") || null,
          date_fin: g("d_df") || null
        };
        if (!o.adjoint_id) S.err = "Choisissez un adjoint.";
        else {
          const e = S.ed && S.ed.e == "dl",
            r = e
              ? await run(sb.from("delegations").update(o).eq("id", S.ed.r.id))
              : await run(sb.from("delegations").insert({ ...o, commune_id: c }));
          if (!r.error) {
            S.ed = {};
            S.err = "Délégation enregistrée. Elle deviendra effective après validation avec l’acte officiel.";
          }
        }
      } else if (a == "delacte") {
        const x = d.dl.find(y => y.id == id),
          p = await upl("ac_" + id, x.adjoint_id);
        if (p) {
          await run(sb.from("delegations").update({ acte: p }).eq("id", id));
          if (!S.err) S.err = "Acte enregistré.";
        } else S.err = "Choisissez le fichier de l’acte (PDF ou image).";
      } else if (a == "delval") {
        await run(sb.from("delegations").update({ statut: "effective" }).eq("id", id));
        if (!S.err) S.err = "Délégation effective : l’adjoint a été notifié.";
      } else if (a == "delend") await run(sb.from("delegations").update({ statut: "terminee" }).eq("id", id));
      else if (a == "deldl") {
        if (confirm("Supprimer cette délégation ?")) await run(sb.from("delegations").delete().eq("id", id));
      } else if (a == "pjassign") {
        await run(
          sb
            .from("projets")
            .update({ adjoint_id: g("pa_" + i) || null })
            .eq("id", d.proj[i].id)
        );
        if (!S.err) S.err = "Affectation enregistrée.";
      } else if (a == "pjsuivi") {
        const p = d.proj[i],
          o = {
            statut: g("ps_" + i),
            avancement: Math.max(0, Math.min(100, n("pv_" + i))),
            difficultes: g("pd_" + i) || null,
            observations: g("po_" + i) || null
          },
          ph = await upl("pph_" + i, S.mine || p.adjoint_id),
          dc = await upl("pdc_" + i, S.mine || p.adjoint_id);
        if (ph) o.photos = (p.photos || []).concat(ph);
        if (dc) o.docs = (p.docs || []).concat(dc);
        await run(sb.from("projets").update(o).eq("id", p.id));
        if (!S.err) S.err = "Suivi du projet enregistré.";
      } else if (a == "rusave") {
        const o = {
          objet: g("r_ob"),
          type: g("r_ty"),
          jour: g("r_jo"),
          heure: g("r_he"),
          lieu: g("r_li") || null,
          participants_texte: g("r_pt") || null,
          commune_id: c,
          responsable_id: isG() ? g("r_rs") || null : S.mine
        };
        if (!o.objet || !o.jour || !o.heure) S.err = "Objet, date et heure sont obligatoires.";
        else {
          const r = await run(sb.from("reunions").insert(o).select("id").single());
          if (!r.error) {
            const ids = d.adj
              .filter(a2 => $("#rp_" + a2.id) && $("#rp_" + a2.id).checked)
              .map(a2 => ({ reunion_id: r.data.id, adjoint_id: a2.id }));
            if (ids.length) await run(sb.from("reunion_participants").insert(ids));
            if (!S.err) S.err = "Événement programmé.";
          }
        }
      } else if (a == "rucr") {
        const o = d.ru.find(x => x.id == S.rd),
          u = Object.assign(
            { compte_rendu: g("ru_cr") || null, statut: g("ru_st") },
            isG() ? { presences: g("ru_pr") || null, actions: g("ru_ac") || null } : {}
          ),
          p = await upl("ru_dc", S.mine || o.responsable_id);
        if (p) u.docs = (o.docs || []).concat(p);
        await run(sb.from("reunions").update(u).eq("id", o.id));
        if (!S.err) S.err = "Compte rendu enregistré.";
      } else if (a == "rudel") {
        if (confirm("Supprimer cet événement ?")) {
          await run(sb.from("reunions").delete().eq("id", S.rd));
          S.rd = null;
        }
      } else if (a == "insave") {
        const o = {
          adjoint_id: g("i_aj"),
          objet: g("i_ob"),
          description: g("i_ds") || null,
          date_limite: g("i_dl") || null,
          priorite: g("i_pr"),
          commune_id: c
        };
        if (!o.adjoint_id || !o.objet) S.err = "L’adjoint destinataire et l’objet sont obligatoires.";
        else {
          const p = await upl("i_fi", o.adjoint_id);
          if (p) o.pieces = [p];
          await run(sb.from("instructions").insert(o));
          if (!S.err) S.err = "Instruction transmise à l’adjoint.";
        }
      } else if (a == "inrep") {
        const x = d.ins.find(y => y.id == S.ri),
          o = { statut: g("in_st"), reponse: g("in_rp") || null },
          p = await upl("in_fi", S.mine);
        if (p) o.pieces = (x.pieces || []).concat(p);
        await run(sb.from("instructions").update(o).eq("id", x.id));
        if (!S.err) S.err = "Réponse enregistrée : le maire a été notifié.";
      } else if (a == "incl") {
        await run(sb.from("instructions").update({ statut: "cloturee" }).eq("id", S.ri));
      } else if (a == "rpsave") {
        const e = S.ed && S.ed.e == "rap",
          o = { type: g("rp_ty"), titre: g("rp_ti"), periode: g("rp_pe") || null, contenu: g("rp_ct") || null, statut: t.dataset.s };
        if (!S.mine) S.err = "Votre compte n’est pas lié à une fiche d’adjoint.";
        else if (!o.titre) S.err = "Le titre est obligatoire.";
        else if (o.statut == "transmis" && !o.contenu) S.err = "Rédigez le contenu avant de transmettre.";
        else {
          const base = e ? S.ed.r : { photos: [], docs: [] },
            ph = await upl("rp_ph", S.mine),
            dc = await upl("rp_dc", S.mine);
          o.photos = (base.photos || []).concat(ph || []);
          o.docs = (base.docs || []).concat(dc || []);
          const r = e
            ? await run(sb.from("rapports").update(o).eq("id", S.ed.r.id))
            : await run(sb.from("rapports").insert({ ...o, adjoint_id: S.mine, commune_id: c }));
          if (!r.error) {
            S.ed = {};
            S.pre = null;
            S.err = o.statut == "transmis" ? "Rapport transmis au maire." : "Brouillon enregistré.";
          }
        }
      } else if (a == "rpobs") {
        await run(
          sb
            .from("rapports")
            .update({ observations_maire: g("rp_ob") || null, statut: t.dataset.s })
            .eq("id", S.rr)
        );
      } else if (a == "rparch") {
        await run(sb.from("rapports").update({ statut: "archive" }).eq("id", S.rr));
      } else if (a == "mssend") {
        const o = { sujet: g("m_su"), corps: g("m_co"), a: g("m_to") || null, commune_id: c };
        if (!o.sujet || !o.corps) S.err = "Le sujet et le message sont obligatoires.";
        else {
          await run(sb.from("messages").insert(o));
          if (!S.err) S.err = "Message envoyé.";
        }
      } else if (a == "msopen") {
        S.mo = S.mo == id ? null : id;
        const m = d.ms.find(x => x.id == id);
        if (m && m.a == S.uid && !m.lu) await run(sb.from("messages").update({ lu: true }).eq("id", id));
      } else if (a == "ntall") {
        await run(sb.from("notifications").update({ lu: true }).eq("user_id", S.uid).eq("lu", false));
      } else if (a == "ntgo") {
        await run(sb.from("notifications").update({ lu: true }).eq("id", id));
        const M2 = {
          instr: ["a_instr", "instr"],
          rapp: ["a_rapp", "rapp"],
          reun: ["a_reun", "reun"],
          deleg: ["a_deleg", "deleg"],
          msg: ["a_msg", "msg"]
        }[t.dataset.l];
        const L2 = t.dataset.l || "";
        if (L2.startsWith("s_")) {
          if (isS()) S.view = L2;
          else if (isM()) {
            S.view = "s_sec";
            S.tab.secretariat = SMAP[L2] || "sdash";
          }
        } else if (M2) {
          if (isA()) S.view = M2[0];
          else if (!isS()) {
            const T2 = {
              instr: ["maire", "instr"],
              rapp: ["maire", "rapp"],
              reun: ["maire", "aud"],
              deleg: ["administration", "deleg"],
              msg: ["maire", "msg"]
            }[t.dataset.l];
            S.view = SP[T2[0]].v;
            S.tab[T2[0]] = T2[1];
          }
        }
      }
      await load(TBA[a]);
    } else {
      if (a == "addrdv") {
        if (g("rt")) await run(sb.from("rdv").insert({ commune_id: c, jour: g("rd") || T, heure: g("rh") || "09:00", titre: g("rt") }));
      } else if (a == "delrdv") await run(sb.from("rdv").delete().eq("id", d.rdv[i].id));
      else if (a == "addmail") {
        if (g("mo"))
          await run(sb.from("courrier").insert({ commune_id: c, sens: g("ms"), correspondant: g("mf") || "Non précisé", objet: g("mo") }));
        S.f = g("ms") || S.f;
      } else if (a == "cycm") {
        const m = d.mail[i];
        if (MS.indexOf(m.st) < 0) {
          S.err = "Ce courrier suit le circuit du Secrétariat municipal.";
        } else
          await run(
            sb
              .from("courrier")
              .update({ statut: MC[(MS.indexOf(m.st) + 1) % MS.length] })
              .eq("id", m.id)
          );
      } else if (a == "cycr") {
        const m = d.req[i];
        await run(
          sb
            .from("demandes")
            .update({ statut: RC[(RS.indexOf(m.st) + 1) % RS.length] })
            .eq("id", m.id)
        );
      } else if (a == "addpost") {
        if (g("pt"))
          await run(
            sb.from("publications").insert({
              commune_id: c,
              reseau: g("pr"),
              jour: g("pd") || T,
              texte: g("pt"),
              categorie: g("pc") || "actualite",
              media_id: g("pm") || null
            })
          );
      } else if (a == "nextp") {
        const p = d.posts[i],
          k = PS.indexOf(p.st);
        if (k < 3)
          await run(
            sb
              .from("publications")
              .update({ statut: PS[k + 1] })
              .eq("id", p.id)
          );
      } else if (a == "delp") await run(sb.from("publications").delete().eq("id", d.posts[i].id));
      else if (a == "addphoto") {
        const f = ($("#pf") || {}).files && $("#pf").files[0],
          ti = g("pt2");
        if (f && ti) {
          const bl = await comp(f),
            pa = c + "/" + crypto.randomUUID() + "." + (bl.type == "image/webp" ? "webp" : "jpg"),
            up = await sb.storage.from("medias").upload(pa, bl, { contentType: bl.type });
          if (up.error) S.err = "Envoi impossible : " + up.error.message;
          else {
            const r = await run(sb.from("medias").insert({ commune_id: c, type: "photo", titre: ti, chemin: pa }));
            if (!r.error) S.err = "Photo enregistrée : " + kb(f.size) + " réduits à " + kb(bl.size) + ".";
          }
        } else S.err = "Choisissez une photo et un titre.";
      } else if (a == "addvideo") {
        if (g("vt") && /^https:\/\//.test(g("vu")))
          await run(sb.from("medias").insert({ commune_id: c, type: "video", titre: g("vt"), url: g("vu") }));
        else S.err = "Indiquez un titre et un lien commençant par https://";
      } else if (a == "delmed") {
        const m = d.med[i];
        if (m && confirm("Retirer ce média ?")) {
          if (m.ty == "photo") await sb.storage.from("medias").remove([m.p]);
          await run(sb.from("medias").delete().eq("id", m.id));
        }
      } else if (a == "adddel") {
        if (g("dn") && g("do"))
          await run(
            sb.from("deliberations").insert({ commune_id: c, numero: g("dn"), objet: g("do"), jour: g("dj") || T, statut: g("ds") })
          );
      } else if (a == "cycd") {
        const x = d.del[i],
          o = ["adoptee", "projet", "rejetee"];
        await run(
          sb
            .from("deliberations")
            .update({ statut: o[(o.indexOf(x.statut) + 1) % 3] })
            .eq("id", x.id)
        );
      } else if (a == "deldel") {
        if (confirm("Retirer cette délibération ?")) await run(sb.from("deliberations").delete().eq("id", d.del[i].id));
      } else if (a == "addfin") {
        await run(
          sb
            .from("finances")
            .upsert(
              { commune_id: c, annee: Y, mois: n("bm"), recettes: n("br"), depenses: n("bd") },
              { onConflict: "commune_id,annee,mois" }
            )
        );
      } else if (a == "delfin") await run(sb.from("finances").delete().eq("id", d.fin[i].id));
      else if (a == "addproj") {
        if (g("jt")) {
          const la = g("jy").replace(",", "."),
            lo = g("jx").replace(",", ".");
          await run(
            sb.from("projets").insert({
              commune_id: c,
              titre: g("jt"),
              localite: g("jl") || null,
              categorie: g("jc"),
              statut: g("js"),
              avancement: g("js") == "termine" ? 100 : Math.min(100, n("ja")),
              budget: n("jb"),
              domaine: g("jdm") || null,
              adjoint_id: g("jaj") || null,
              date_debut: g("jd1") || null,
              date_fin: g("jd2") || null,
              financement: g("jfi") || null,
              responsable: g("jre") || null,
              description: g("jds") || null,
              lat: la && !isNaN(la) ? +la : null,
              lng: lo && !isNaN(lo) ? +lo : null
            })
          );
        }
      } else if (a == "cycp") {
        const p = d.proj[i],
          s2 = PST[(PST.indexOf(p.statut) + 1) % 3];
        await run(
          sb
            .from("projets")
            .update({ statut: s2, avancement: s2 == "termine" ? 100 : p.statut == "termine" ? 90 : p.avancement })
            .eq("id", p.id)
        );
      } else if (a == "pjpub") {
        const p = d.proj[i];
        await run(sb.from("projets").update({ public: !p.public }).eq("id", p.id));
      } else if (a == "delproj") {
        if (confirm("Retirer ce projet ?")) await run(sb.from("projets").delete().eq("id", d.proj[i].id));
      } else if (a == "saveind") {
        const la = g("pla").replace(",", "."),
          lo = g("plo").replace(",", ".");
        await run(
          sb.from("indicateurs").upsert({
            commune_id: c,
            population: n("pp"),
            croissance: +g("pg") || 0,
            villages: n("pv"),
            menages: n("pm"),
            agents: n("pa"),
            budget_annuel: n("pb"),
            slogan: g("psl") || null,
            devise: g("pdv") || null,
            contact_tel: g("ptl") || null,
            contact_adresse: g("pad") || null,
            centre_lat: la && !isNaN(la) ? +la : null,
            centre_lng: lo && !isNaN(lo) ? +lo : null,
            zoom: n("pz") || 11,
            departement: g("pdp") || null,
            region: g("prg") || null,
            pays: g("ppy") || null
          })
        );
        if (!S.err) S.err = "Paramètres enregistrés.";
      } else if (a == "upimg") {
        const k = t.dataset.k,
          f = ($("#" + t.dataset.f) || {}).files && $("#" + t.dataset.f).files[0];
        if (f) {
          const bl = await comp(f, k == "blason" ? 600 : 1600, k == "blason" ? 150000 : 400000),
            pa = c + "/" + k + "-" + crypto.randomUUID() + "." + (bl.type == "image/webp" ? "webp" : "jpg"),
            up = await sb.storage.from("medias").upload(pa, bl, { contentType: bl.type });
          if (up.error) S.err = "Envoi impossible : " + up.error.message;
          else {
            if (S.ind[k]) await sb.storage.from("medias").remove([S.ind[k]]);
            const o = { commune_id: c };
            o[k] = pa;
            await run(sb.from("indicateurs").upsert(o));
            if (!S.err) S.err = "Image enregistrée (" + kb(bl.size) + ").";
            /* blason et bannière : publication automatique vers l'application citoyenne (même routine que les boutons « Publier ») */
            if (!S.err.startsWith("Envoi") && (k == "bandeau" || k == "blason")) {
              const want = k == "bandeau" ? "lnkbandeau" : "lnkblason";
              (async () => {
                for (let n = 0; n < 25 && S.ind[k] !== pa; n++) await new Promise(r => setTimeout(r, 200));
                const b = document.createElement("button");
                b.dataset.m = want;
                b.hidden = true;
                document.body.appendChild(b);
                b.click();
                b.remove();
              })();
            }
          }
        } else S.err = "Choisissez d’abord une image.";
      }
      await load(TBA[a]);
    }
  } catch (x) {
    S.err = x && x.message && !/fetch|network|Failed/i.test(x.message) ? x.message : "Erreur réseau. Réessayez.";
  }
  render();
  if (a != "menu") window.scrollTo(0, 0);
});
document.addEventListener("change", async e => {
  const t = e.target.closest("[data-ch]");
  if (!t) return;
  const p = D().proj[+t.dataset.i];
  if (t.dataset.ch == "avc" && p) {
    const v = Math.max(0, Math.min(100, +t.value || 0));
    S.err = "";
    await run(
      sb
        .from("projets")
        .update({ avancement: v, statut: v >= 100 ? "termine" : p.statut == "termine" ? "en_cours" : p.statut })
        .eq("id", p.id)
    );
    await load(["projets"]);
    render();
  }
});
let LOGIN_AT = 0;
sb.auth.onAuthStateChange((ev, ses) => {
  if (S.role != "cab" || Date.now() - LOGIN_AT < 5000) return;
  if (ev == "SIGNED_OUT" || (ses && S.uid && ses.user.id !== S.uid)) {
    setTimeout(async () => {
      try {
        const x = (await sb.auth.getSession()).data.session;
        if (!x || x.user.id !== S.uid) {
          S.role = null;
          S.cid = null;
          S.sa = false;
          S.uid = null;
          S.err = "Votre session a expiré ou a changé (" + ev + "). Reconnectez-vous.";
          render();
        }
      } catch (e) {}
    }, 0);
  }
});
/* Nouvelles demandes : rafraîchissement discret toutes les 45 s (pastille seulement, l'écran n'est pas redessiné) */
setInterval(() => {
  if (S.role == "cab" && S.cid && !S.sa && !document.hidden)
    load(["demandes", "dvues"])
      .then(() => {
        syncSeen();
        majBadge();
      })
      .catch(() => {});
}, 45000);
setInterval(() => {
  const e = $(".dc div");
  if (e) e.innerHTML = dt();
}, 30000);
(async () => {
  try {
    await lcm();
    const x = (await sb.auth.getSession()).data.session;
    if (x && (await profil())) {
      await load();
      syncSeen();
    }
  } catch (e) {}
  render();
})();
