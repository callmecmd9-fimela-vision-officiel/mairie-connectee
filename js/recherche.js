/* Recherche intelligente (interface mairie) : pages, rubriques, contenu des écrans, dossiers chargés, actions.
   N'affiche que ce que le rôle peut ouvrir (NAV, espAll, can). Aucune requête réseau : tout vient de S/D(). Ctrl/⌘+K ou « / ». */
(function () {
  const nz = s =>
    String(s == null ? "" : s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const STOP = new Set(
    "a au aux avec ce comment dans de des du en et est faire il je la le les ma mes mon ou par pour que qui sur trouver truc un une veux voir se trouve chercher aller l d j".split(
      " "
    )
  );
  /* Groupes de synonymes : un mot du groupe trouve les autres */
  const SYN = [
    "conge vacance absence permission repos",
    "paie salaire remuneration bulletin traitement solde",
    "personnel employe agent rh effectif recrutement",
    "budget argent finance recette depense caisse comptabilite",
    "civil naissance mariage deces extrait livret certificat",
    "courrier lettre mail correspondance",
    "demande requete dossier citoyen administre habitant",
    "reunion rencontre agenda calendrier rendezvous rdv audience planning",
    "projet travaux chantier infrastructure",
    "territoire foncier terrain parcelle carte urbanisme permis construire",
    "deliberation conseil session vote commission",
    "marche appel offre fournisseur contrat",
    "patrimoine bien materiel vehicule batiment inventaire",
    "publication annonce actualite communication facebook photo video media",
    "notification alerte message whatsapp sms prevenir",
    "parametre reglage configuration logo blason photo identite",
    "rapport statistique indicateur bilan graphique",
    "taxe impot fiscalite redevance paiement quittance encaissement guichet",
    "reclamation plainte signalement probleme",
    "signer signature valider validation approuver",
    "utilisateur compte acces role droit"
  ].map(g => g.split(" "));
  const stem = w => (w.length > 3 ? w.replace(/(s|x)$/, "") : w);
  /* distance de Damerau-Levenshtein bornée (fautes de frappe) */
  const dist = (a, b) => {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const m = [];
    for (let i = 0; i <= a.length; i++) {
      m[i] = [i];
      for (let j = 1; j <= b.length; j++) {
        if (!i) {
          m[i][j] = j;
          continue;
        }
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1);
      }
    }
    return m[a.length][b.length];
  };
  const word = (q, words) => {
    let best = 0;
    for (const w of words) {
      const s = stem(w);
      if (s == q) return 10;
      if (s.startsWith(q)) best = Math.max(best, 8);
      else if (q.length >= 3 && s.includes(q)) best = Math.max(best, 5);
      else if (q.length >= 4 && !/\d/.test(q)) {
        const max = q.length >= 8 ? 2 : 1;
        if (dist(q, s) <= max || (s.length > q.length && dist(q, s.slice(0, q.length)) <= 1 && q.length >= 5)) best = Math.max(best, 4);
      }
    }
    return best;
  };
  const token = (q, words) => {
    let s = word(q, words);
    if (s >= 8) return s;
    for (const g of SYN)
      if (g.some(x => x == q || (q.length >= 4 && (x.startsWith(q) || dist(x, q) <= 1))))
        if (g.some(x => words.some(w => stem(w) == stem(x)))) s = Math.max(s, 6);
    return s;
  };
  function search(index, query, usage) {
    let qs = nz(query).split(" ").filter(Boolean);
    const f = qs.filter(w => !STOP.has(w));
    if (f.length) qs = f;
    qs = qs.map(stem);
    if (!qs.length) return [];
    const all = [];
    for (const e of index) {
      let score = 0,
        hit = 0;
      for (const q of qs) {
        const s = Math.max(token(q, e.t) * 3, token(q, e.k));
        if (s) hit++;
        score += s;
      }
      if (hit) all.push({ e, hit, score: score + (e.w || 0) + Math.min(((usage || {})[e.id] || 0) * 2, 10) });
    }
    const full = all.filter(x => x.hit == qs.length);
    return (full.length ? full : all.filter(x => x.hit >= Math.ceil(qs.length / 2))).sort((a, b) => b.score - a.score).map(x => x.e);
  }

  /* ---------- Index ---------- */
  const words = s => nz(s).split(" ").filter(Boolean);
  const entry = (g, title, sub, extra, go, w) => ({
    id: g + "|" + title + "|" + sub,
    g,
    title,
    sub,
    t: words(title),
    k: words(sub + " " + (extra || "")),
    go,
    w
  });
  const open = (view, k, tab, mark) => () => {
    S.view = view;
    if (k) S.tab[k] = tab;
    S.menu = false;
    S.dd = null;
    S.err = "";
    render();
    window.scrollTo(0, 0);
    if (mark) flash(mark);
  };
  function flash(text) {
    const q = nz(text);
    const els = [...document.querySelectorAll(".mn h2,.mn h3,.mn label,.mn button,.mn .rw,.mn b")].filter(
      x => !x.closest(".tb") && nz(x.textContent).includes(q)
    );
    const el = els.sort((a, b) => a.textContent.length - b.textContent.length)[0];
    if (!el) return;
    const box = el.closest(".rw") || el;
    if (box.scrollIntoView) box.scrollIntoView({ block: "center" });
    box.classList.add("fv-flash");
    setTimeout(() => box.classList.remove("fv-flash"), 2600);
  }
  /* Rubriques accessibles : { tab: {view,k,label,space} } */
  function pages() {
    const out = [],
      tabsMap = {};
    for (const n of NAV()) out.push({ view: n[0], label: n[1], space: "Menu" });
    if (!S.sa && !(typeof isA == "function" && isA()) && !(typeof isS == "function" && isS()))
      for (const [k, x] of Object.entries(SP)) {
        if (!espAll().includes(x)) continue;
        for (const [tab, label] of x.subs.filter(s => can(s[0]))) {
          const p = { view: x.v, k, tab, label, space: x.n };
          out.push(p);
          if (!tabsMap[tab]) tabsMap[tab] = p;
        }
      }
    return { out, tabsMap };
  }
  /* Titres, champs et boutons présents dans un écran, pour répondre à « où est… ? » */
  let cache = { key: "", list: [] };
  function screens(list) {
    const key = S.uid + "|" + S.pr + "|" + S.cid + "|" + list.length;
    if (cache.key == key) return cache.list;
    const out = [];
    for (const p of list) {
      if (!p.tab || typeof SUB[p.tab] != "function") continue;
      const prev = S.inS;
      let html = "";
      try {
        S.inS = 1;
        html = SUB[p.tab]();
      } catch (e) {
      } finally {
        S.inS = prev;
      }
      const doc = new DOMParser().parseFromString(String(html), "text/html"),
        seen = new Set();
      doc.querySelectorAll("h2,h3,label,legend,button:not(.tb2):not(.rw)").forEach(el => {
        const t = el.textContent.replace(/\s+/g, " ").trim(),
          n = nz(t);
        if (n.length < 4 || t.length > 60 || seen.has(n) || seen.size > 40) return;
        seen.add(n);
        out.push(entry("Dans les écrans", t, p.space + " › " + p.label, "", open(p.view, p.k, p.tab, t), -2));
      });
    }
    cache = { key, list: out };
    return out;
  }
  /* [clé D(), rubriques candidates, libellé, vues des portails adjoint/secrétariat] */
  const REC = [
    ["req", ["citoyens"], "Demande", ["citoyens"]],
    ["mail", ["cin"], "Courrier", ["s_cin"]],
    ["act", ["actes"], "Acte", ["s_actes"]],
    ["proj", ["projets", "projA"], "Projet", ["a_proj"]],
    ["per", ["personnel"], "Agent", []],
    ["adj", ["adjlist"], "Adjoint", []],
    ["dl", ["deleg"], "Délégation", ["a_deleg"]],
    ["ru", ["reun", "sreun"], "Réunion", ["a_reun", "s_reun"]],
    ["rdv", ["agenda"], "Rendez-vous", []],
    ["ins", ["instr", "sinstr"], "Instruction", ["a_instr", "s_instr"]],
    ["rap", ["rapp"], "Rapport", ["a_rapp"]],
    ["ms", ["msg"], "Message", ["a_msg"]],
    ["dos", ["dossiers"], "Dossier", ["s_dos"]],
    ["dc", ["archives", "docs"], "Document", ["s_arch", "a_docs"]],
    ["sv", ["serv"], "Service", ["s_serv"]],
    ["cn", ["sconseil"], "Conseiller", ["s_cm"]],
    ["se", ["sconseil"], "Session du conseil", ["s_cm"]],
    ["del", ["conseil"], "Délibération", []],
    ["mar", ["marches"], "Marché", []],
    ["patrimoine_biens", ["patbiens", "patrimoine"], "Bien communal", []],
    ["pat", ["patrimoine"], "Patrimoine", []],
    ["posts", ["pub"], "Publication", ["comm"]],
    ["actes_ec", ["civil"], "Acte d’état civil", []],
    ["permis_construire", ["territoire"], "Permis de construire", []],
    ["signalements_citoyens", ["recl", "citoyens"], "Signalement", []]
  ];
  const SKIP = /(^|_)(id|uid|url|src|photo|photos|chemin|path|pieces|docs|hash|token|signature)$|_id$|_at$/;
  const text = r =>
    Object.entries(r)
      .filter(([k, v]) => !SKIP.test(k) && (typeof v == "string" || typeof v == "number") && String(v).length < 400)
      .map(x => x[1])
      .join(" ");
  const title = r =>
    [r.prenom, r.nom].filter(Boolean).join(" ") ||
    r.titre ||
    r.objet ||
    r.o ||
    r.t ||
    r.intitule ||
    r.libelle ||
    r.sujet ||
    r.designation ||
    r.reference ||
    r.numero ||
    "";
  function records(tabsMap) {
    const out = [],
      navs = NAV().map(n => n[0]),
      d = D();
    for (const [key, tabs, label, views] of REC) {
      const p = tabs.map(t => tabsMap[t]).find(Boolean),
        v = views.find(x => navs.includes(x));
      if (!p && !v) continue;
      for (const r of (d[key] || []).slice(0, 1000)) {
        const name = String(key == "req" ? r.o || r.t || "" : title(r)).slice(0, 80);
        if (!name) continue;
        const ref = r.n || r.numero || r.reference || r.w || "";
        let go = p ? open(p.view, p.k, p.tab, name) : open(v, null, null, name);
        if (key == "req" && typeof openD == "function") {
          const base = p ? open(p.view, p.k, p.tab) : open(v);
          go = async () => {
            base();
            S.dd = r.id;
            if (typeof markSeen == "function") markSeen(r.id);
            await openD();
            render();
          };
        }
        out.push(entry("Dossiers", name, label + (ref ? " · " + ref : ""), text(r), go, 0));
      }
    }
    return out;
  }
  function build() {
    const { out, tabsMap } = pages();
    const idx = out.map(p =>
      entry("Pages", p.label, p.space, p.tab || p.view, open(p.view, p.k, p.tab), p.tab ? 6 : 8)
    );
    const click = sel => () => {
      const b = document.querySelector(sel);
      if (b) b.click();
    };
    idx.push(entry("Actions", "Changer mon mot de passe", "Compte", "securite code", click("[data-mdp]"), 3));
    idx.push(entry("Actions", "Se déconnecter", "Compte", "quitter sortir deconnexion", click('.sb [data-a="out"]'), 0));
    idx.push(entry("Actions", "Voir les notifications", "Cloche", "alerte", click(".tb .bl"), 3));
    return idx.concat(records(tabsMap), screens(out));
  }

  /* ---------- Fenêtre ---------- */
  let box = null,
    idx = [],
    res = [],
    cur = 0;
  const UK = () => "mc_rech_" + S.uid;
  const usage = () => {
    try {
      return JSON.parse(localStorage.getItem(UK())) || {};
    } catch (e) {
      return {};
    }
  };
  const close = () => {
    if (box) box.remove();
    box = null;
  };
  const pick = e => {
    if (!e) return;
    const u = usage();
    u[e.id] = (u[e.id] || 0) + 1;
    try {
      localStorage.setItem(UK(), JSON.stringify(u));
    } catch (x) {}
    close();
    Promise.resolve(e.go()).catch(x => {
      S.err = x.message || "Ouverture impossible.";
      render();
    });
  };
  function draw() {
    const q = box.querySelector("input").value,
      u = usage(),
      list = box.querySelector(".fv-list");
    res = q.trim()
      ? search(idx, q, u)
      : idx
          .filter(e => e.g != "Dans les écrans" && e.g != "Dossiers")
          .sort((a, b) => (u[b.id] || 0) - (u[a.id] || 0));
    const count = {};
    res = res.filter(e => (count[e.g] = (count[e.g] || 0) + 1) <= 8).slice(0, 24);
    const order = [...new Set(res.map(e => e.g))];
    res.sort((a, b) => order.indexOf(a.g) - order.indexOf(b.g));
    cur = Math.max(0, Math.min(cur, res.length - 1));
    list.textContent = "";
    let g = "";
    res.forEach((e, i) => {
      if (e.g != g) {
        g = e.g;
        const h = document.createElement("div");
        h.className = "fv-g";
        h.textContent = q.trim() ? g : "Accès rapide";
        list.appendChild(h);
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fv-r" + (i == cur ? " on" : "");
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(i == cur));
      const t = document.createElement("b"),
        s = document.createElement("span");
      t.textContent = e.title;
      s.textContent = e.sub;
      b.append(t, s);
      b.onclick = () => pick(e);
      list.appendChild(b);
    });
    if (!res.length) list.textContent = "Aucun résultat. Essayez un autre mot, un nom ou un numéro de dossier.";
    const on = list.querySelector(".on");
    if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest" });
  }
  function show() {
    if (box || typeof S == "undefined" || S.role != "cab") return;
    idx = build();
    cur = 0;
    box = document.createElement("div");
    box.className = "fv-ov";
    box.innerHTML =
      '<div class="fv-pal" role="dialog" aria-modal="true" aria-label="Recherche"><div class="fv-top"><input type="search" maxlength="100" autocomplete="off" placeholder="Que cherchez-vous ? Page, nom, numéro, action…" aria-label="Rechercher"><button type="button" class="fv-x">Fermer</button></div><div class="fv-list" role="listbox"></div></div>';
    document.body.appendChild(box);
    const i = box.querySelector("input");
    i.oninput = () => {
      cur = 0;
      draw();
    };
    box.onclick = e => {
      if (e.target == box || e.target.closest(".fv-x")) close();
    };
    box.onkeydown = e => {
      if (e.key == "Escape") close();
      else if (e.key == "ArrowDown" || e.key == "ArrowUp") {
        cur = (cur + (e.key == "ArrowDown" ? 1 : -1) + res.length) % (res.length || 1);
        draw();
      } else if (e.key == "Enter" && e.target == i) pick(res[cur]);
      else return;
      e.preventDefault();
    };
    draw();
    i.focus();
  }
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "");
    if (((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() == "k") || (e.key == "/" && !typing)) {
      if (typeof S == "undefined" || S.role != "cab") return;
      e.preventDefault();
      show();
    }
  });
  const button = () => {
    const bar = document.querySelector("#app .tb .tr");
    if (!bar || bar.querySelector(".fv-btn")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "fv-btn";
    b.setAttribute("aria-label", "Rechercher (Ctrl+K)");
    b.title = "Rechercher (Ctrl+K)";
    b.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>Rechercher</span>';
    b.onclick = show;
    bar.insertBefore(b, bar.firstChild);
  };
  const app = document.getElementById("app");
  if (app) new MutationObserver(button).observe(app, { childList: true, subtree: true });
  button();
  window.MCRecherche = { search, build, show, close, entry };
})();
