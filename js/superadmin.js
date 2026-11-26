/* ===== MODULE SUPER-ADMIN : interface d'administration syst\u00e8me ===== */
Object.assign(IC, {
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2"/>',
  db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v5c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0 1.7-3.6 3-8 3S4 7.7 4 6zM4 13v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5c0 1.7-3.6 3-8 3s-8-1.3-8-3z"/>',
  sliders:
    '<path d="M4 6h9v2H4zM17 6h3v2h-3zM4 11h3v2H4zM11 11h9v2h-9zM4 16h11v2H4zM19 16h1v2h-1z"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="12" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  wrench: '<path d="M21 7a5 5 0 01-6.5 4.8L7 19.3 4.7 17l7.5-7.5A5 5 0 0117 3l-3 3 1 3 3 1 3-3z"/>',
  dl: '<path d="M11 3h2v9l3-3 1.4 1.4L12 16l-5.4-5.6L8 9l3 3zM5 19h14v2H5z"/>'
});
const SANAV = [
  ["sa_dash", "Tableau de bord", "home"],
  ["sa_users", "Gestion des utilisateurs", "users"],
  ["sa_params", "Param\u00e8tres g\u00e9n\u00e9raux", "gear"],
  ["sa_roles", "Gestion des r\u00f4les", "shield"],
  ["sa_sec", "S\u00e9curit\u00e9 & Acc\u00e8s", "lock"],
  ["sa_bak", "Sauvegardes", "db"],
  ["sa_audit", "Journal d\u2019audit", "doc"],
  ["sa_mods", "Gestion des modules", "sliders"],
  ["sa_rep", "Rapports syst\u00e8me", "chart"],
  ["sa_maint", "Maintenance", "wrench"]
];
const MODS = [
  ["cabinet", "Cabinet du Maire", "Agenda et courrier du cabinet"],
  ["adjoints", "Adjoints au Maire", "D\u00e9l\u00e9gations, instructions, rapports"],
  ["administration", "Administration", "\u00c9tat civil, personnel, param\u00e8tres"],
  ["developpement", "D\u00e9veloppement", "Projets, travaux, territoire"],
  ["conseil", "Conseil municipal", "Sessions et d\u00e9lib\u00e9rations"],
  ["citoyens", "Citoyens et communication", "Demandes, publications, m\u00e9dias"],
  ["pilotage", "Pilotage", "Rapports et statistiques"],
  ["portail_adjoint", "Portail des adjoints", "Connexion et espace des adjoints"],
  ["portail_secretariat", "Portail du secr\u00e9tariat", "Connexion et espace du secr\u00e9tariat"]
];
const SPL = {
  sdash: "Secr\u00e9tariat : tableau de bord",
  cin: "Courrier entrant",
  cout: "Courrier sortant",
  actes: "Actes administratifs",
  sconseil: "Conseil municipal (secr\u00e9tariat)",
  sinstr: "Instructions et t\u00e2ches",
  serv: "Services municipaux",
  sreun: "R\u00e9unions et agenda",
  dossiers: "Dossiers",
  archives: "Archives",
  srap: "Rapports du secr\u00e9tariat",
  snotif: "Notifications du secr\u00e9tariat",
  adjdash: "Adjoints : tableau de bord",
  adjlist: "Liste des adjoints",
  deleg: "D\u00e9l\u00e9gations",
  projA: "Projets suivis par les adjoints",
  reun: "R\u00e9unions des adjoints",
  instr: "Instructions du maire",
  rapp: "Rapports et comptes rendus",
  msg: "Messagerie",
  docs: "Documents",
  notif: "Notifications",
  cabinet: "Cabinet du Maire",
  budget: "Budget et finances",
  civil: "\u00c9tat civil",
  personnel: "Personnel",
  params: "Param\u00e8tres de la commune",
  projets: "Projets et travaux",
  territoire: "Territoire et foncier",
  conseil: "D\u00e9lib\u00e9rations du conseil",
  citoyens: "Demandes des citoyens",
  pub: "Publications",
  med: "M\u00e9diath\u00e8que",
  rapports: "Rapports et statistiques"
};
const ALB = {
  user_create: "Utilisateur cr\u00e9\u00e9",
  user_update: "Utilisateur modifi\u00e9",
  user_disable: "Compte d\u00e9sactiv\u00e9",
  user_enable: "Compte r\u00e9activ\u00e9",
  user_delete: "Compte supprim\u00e9",
  user_password: "Mot de passe r\u00e9initialis\u00e9",
  sessions_revoke: "Sessions r\u00e9voqu\u00e9es",
  param_set: "Param\u00e8tre modifi\u00e9",
  perm_set: "Permission modifi\u00e9e",
  perm_user_set: "Permission utilisateur modifi\u00e9e",
  perm_user_reset: "Permissions utilisateur r\u00e9tablies",
  perm_reset: "Permissions r\u00e9initialis\u00e9es",
  identity_update: "Identit\u00e9 modifi\u00e9e",
  image_set: "Image modifi\u00e9e",
  backup_create: "Sauvegarde cr\u00e9\u00e9e",
  backup_restore: "Sauvegarde restaur\u00e9e",
  backup_delete: "Sauvegarde supprim\u00e9e",
  incident_create: "Incident d\u00e9clar\u00e9",
  incident_update: "Incident mis \u00e0 jour",
  export: "Export de donn\u00e9es",
  cache_purge: "Cache vid\u00e9"
};
const GRV = { info: "Information", mineur: "Mineur", majeur: "Majeur", critique: "Critique" },
  GRC = { info: "bl", mineur: "or", majeur: "or", critique: "rd" },
  ISL = { ouvert: "Ouvert", en_cours: "En cours", resolu: "R\u00e9solu" };
const sd = () => S.sd || (S.sd = { st: {}, us: [], au: [], sv: [], inc: [], hc: null, miss: false });
const safdd = x => (x ? new Date(x).toLocaleDateString("fr-FR") : "\u2014"),
  fdh = x =>
    x
      ? new Date(x).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "\u2014";
const sz = n => (n > 1e9 ? (n / 1e9).toFixed(1).replace(".", ",") + " Go" : kb(+n || 0));
const stg = (t, c) => `<span class="tg ${c || ""}" data-sty="cursor:default">${esc(t)}</span>`;
const satg = (t, a, i, c = "", x = "") => `<button class="tg ${c}" data-sa="${a}" data-i="${i}" ${x}>${esc(t)}</button>`;
const sbt = (t, a, c = "bt", x = "") => `<button class="${c}" data-sa="${a}" ${x}>${esc(t)}</button>`;
const acts2 = h => `<div class="sa-ac">${h}</div>`;
const cb = x => (x && !/^[0-9a-f-]{36}$/i.test(x) ? x : "");
const eff = (r, k) => (S.pm && r + "." + k in S.pm ? S.pm[r + "." + k] : (RP[k] || []).includes(r));
const modOn = k => (S.mod || {})[k] !== false;
const PK = () => Object.keys(RP).filter(k => k != "adm");
const sys = (k, v) => (S.sys && S.sys[k] !== undefined && S.sys[k] !== null ? S.sys[k] : v);
/* ---- donn\u00e9es ---- */
async function loadSys(cid) {
  S.sys = {};
  S.pm = {};
  S.pu = {};
  S.mod = {};
  try {
    const c = String(cid),
      [a, b, pu] = await Promise.all([
        sb.from("parametres_systeme").select("cle,valeur").eq("commune_id", c),
        sb.from("permissions_roles").select("role,cle,autorise").eq("commune_id", c),
        sb.from("permissions_utilisateurs").select("cle,autorise").eq("commune_id", c).eq("user_id", S.uid)
      ]);
    (a.data || []).forEach(x => {
      S.sys[x.cle] = x.valeur;
    });
    (b.data || []).forEach(x => {
      S.pm[x.role + "." + x.cle] = x.autorise;
    });
    (pu.data || []).forEach(x => {
      S.pu[x.cle] = x.autorise;
    });
    S.mod = S.sys.modules || {};
  } catch (e) {}
}
async function saLoad() {
  const c = String(S.cid),
    r = async p => {
      try {
        return await p;
      } catch (e) {
        return { error: e };
      }
    };
  const [st, us, au, sv, inc, pux] = await Promise.all([
    r(sb.rpc("sa_stats", { p_commune: c })),
    r(sb.rpc("sa_utilisateurs", { p_commune: c })),
    r(sb.from("journal_audit").select("*").eq("commune_id", c).order("created_at", { ascending: false }).limit(300)),
    r(
      sb
        .from("sauvegardes")
        .select("id,nom,type,taille,statut,created_at,created_by_email,tables")
        .eq("commune_id", c)
        .order("created_at", { ascending: false })
        .limit(50)
    ),
    r(sb.from("incidents").select("*").eq("commune_id", c).order("created_at", { ascending: false }).limit(100)),
    r(sb.from("permissions_utilisateurs").select("user_id,cle,autorise").eq("commune_id", c))
  ]);
  try {
    const ph = await sb.rpc("sa_profils_photos", { p_commune: c });
    const m = {};
    (ph.data || []).forEach(x => (m[x.id] = x.photo));
    S.uph = m;
    const sg = Object.keys(m).length ? await sign("medias", Object.values(m)) : {};
    S.uphu = Object.fromEntries(Object.entries(m).map(([id, p]) => [id, sg[p] || ""]));
  } catch (e) {
    S.uph = {};
    S.uphu = {};
  }
  const o = sd(),
    er = st.error || us.error;
  Object.assign(o, {
    st: st.data || {},
    us: us.data || [],
    au: au.data || [],
    sv: sv.data || [],
    inc: inc.data || [],
    pu: pux.data || [],
    miss: !!er
  });
  try {
    await amLoad();
  } catch (e) {
    S.am = S.am || [];
  }
  await loadSys(S.cid);
  if (er) S.err = "Base non pr\u00eate : " + (er.message || "erreur") + ". Appliquez la migration SQL du super-administrateur.";
}
const rpc = async (f, a) => {
  const r = await sb.rpc(f, a);
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
const edge = async b => {
  const r = await sb.functions.invoke("sa-admin", { body: b });
  if (r.error) {
    let m = "Action impossible.";
    try {
      m = (await r.error.context.json()).error || m;
    } catch (e) {}
    throw new Error(m);
  }
  return r.data;
};
const cs = () => String(S.cid);
function saTurnstile() {
  const box = $("#ts");
  if (!box || !window.turnstile || typeof TS_KEY === "undefined" || !TS_KEY) return;
  if (box.dataset.widget) return;
  try {
    box.dataset.widget = window.turnstile.render(box, {
      sitekey: TS_KEY,
      language: "fr",
      callback: t => {
        S.tok = t;
      },
      "expired-callback": () => {
        S.tok = "";
      },
      "error-callback": () => {
        S.tok = "";
      }
    });
  } catch (e) {
    S.tok = "";
  }
}
const _saTsReady = window.tsReady;
window.tsReady = () => {
  if (typeof _saTsReady === "function") _saTsReady();
  saTurnstile();
};
const csv = (nom, rows) => {
  const q = v => {
      v = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
      return '"' + v.replace(/"/g, '""') + '"';
    },
    b = new Blob(["\ufeff" + rows.map(r => r.map(q).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = nom + "-" + T + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  sb.rpc("sa_audit", { p_commune: cs(), p_action: "export", p_cible: nom, p_detail: null });
};
const saveFile = (nom, txt, type) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type }));
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
async function saHealth() {
  const t = async (n, f) => {
    const s = performance.now();
    try {
      await f();
      return { n, ok: true, ms: Math.round(performance.now() - s) };
    } catch (e) {
      return { n, ok: false, ms: Math.round(performance.now() - s), e: (e && e.message) || String(e) };
    }
  };
  return Promise.all([
    t("Base de donn\u00e9es", async () => {
      const r = await sb.rpc("sa_stats", { p_commune: cs() });
      if (r.error) throw r.error;
    }),
    t("Authentification", async () => {
      const r = await sb.auth.getUser();
      if (r.error || !r.data.user) throw r.error || new Error("Session absente");
    }),
    t("Stockage (medias)", async () => {
      const r = await sb.storage.from("medias").list(cs(), { limit: 1 });
      if (r.error) throw r.error;
    }),
    t("Fonction sa-admin", async () => {
      await edge({ action: "ping" });
    })
  ]);
}
/* ---- composants ---- */
const hero = () => {
  const bg = url("bandeau")
      ? `data-sty="background-image:linear-gradient(rgba(255,255,255,.1),rgba(243,246,241,.9)),url('${esc(url("bandeau"))}')"`
      : "",
    ph = mph(false)
      ? `<img class="mp" src="${esc(mph(false))}" alt="">`
      : `<div class="mp" aria-hidden="true">${esc((S.co || "A")[0])}</div>`;
  return `<div class="hero" ${bg}>${url("bandeau") ? "" : palms}${tb("")}<div class="gr">${ph}<div><h1>Administration Syst\u00e8me</h1><i>Gestion des utilisateurs et param\u00e8tres de l\u2019application</i></div></div></div>`;
};
const urow = (u, i) => {
  const sa = u.role == "super_admin",
    off = u.actif === false;
  return rw(
    `<b>${esc(u.nom || u.email)}</b><div class="mut">${esc(u.email)}${u.service ? " \u00b7 " + esc(u.service) : ""}</div><div class="mut">Derni\u00e8re connexion : ${u.last_sign_in_at ? fdh(u.last_sign_in_at) : "jamais"}</div>`,
    `${stg(RL[u.role] || u.role, sa ? "or" : "bl")} ${stg(off ? "D\u00e9sactiv\u00e9" : "Actif", off ? "rd" : "ok")}${acts2(satg("D\u00e9tails", "u_view", i) + satg("Photo", "u_photo", i) + (sa ? "" : satg("Modifier", "u_edit", i) + satg(off ? "R\u00e9activer" : "D\u00e9sactiver", "u_toggle", i, off ? "ok" : "or") + satg("Mot de passe", "u_pw", i)))}`
  );
};
const ufilt = () => {
  const f = S.sf || {},
    q = (f.q || "").toLowerCase();
  return sd()
    .us.map((u, i) => [u, i])
    .filter(
      ([u]) =>
        (!q || ((u.nom || "") + " " + u.email + " " + (u.service || "")).toLowerCase().includes(q)) &&
        (!f.r || u.role == f.r) &&
        (!f.s || (f.s == "actif") == (u.actif !== false))
    );
};
const AMS = {
  en_attente: ["En attente d\u2019affectation", "or"],
  affecte: ["Affect\u00e9 \u00e0 une commune", ""],
  actif: ["Actif", "ok"],
  suspendu: ["Suspendu", "rd"]
};
const amLoad = async () => {
  const r = await sb.rpc("saas_admins_mairie");
  if (r.error) throw new Error(r.error.message);
  S.am = r.data || [];
};
const amPanel = () => {
  const l = S.am || [],
    cm = [["", "Aucune (en attente d\u2019affectation)"]].concat((S.cs || []).map(c => [c.slug, c.nom]));
  return pn(
    "Administrateurs municipaux",
    "shield",
    (l
      .map((a, i) => {
        const st = AMS[a.statut] || [a.statut || "\u2014", ""];
        return rw(
          `<b>${esc(a.nom || a.email)}</b><div class="mut">${esc(a.email)} \u00b7 ${esc(a.commune_nom || "aucune commune")}</div>`,
          stg(st[0], st[1]) +
            (a.statut == "actif"
              ? satg("Suspendre", "am_toggle", i, "rd")
              : a.statut == "affecte" || a.statut == "suspendu"
                ? satg("Activer", "am_toggle", i, "ok")
                : "")
        );
      })
      .join("") || emp("Aucun administrateur municipal pr\u00e9par\u00e9.")) +
      frm(
        inp("an", "Nom") +
          inp("ae", "E-mail du compte existant", "email", "", "", 'autocomplete="off"') +
          sel("ac", "Commune", cm, "") +
          sbt("Cr\u00e9er ou rattacher", "am_create") +
          sbt("Actualiser", "am_load", "bo")
      ) +
      `<p class="mut" data-sty="margin-top:8px">Le compte Auth existant est r\u00e9utilis\u00e9 (aucun doublon, aucun mot de passe modifi\u00e9). Il reste sans droit tant qu\u2019il n\u2019est pas affect\u00e9 puis activ\u00e9 ici.</p>`
  );
};
const uforms = () => {
  const d = sd(),
    e = d.us[S.se],
    v = d.us[S.sv],
    w = d.us[S.spw];
  let h = "";
  if (v)
    h += pn(
      "D\u00e9tails du compte",
      "user",
      `<p><b>${esc(v.nom || "\u2014")}</b><br>${esc(v.email)}</p><p class="mut">R\u00f4le : ${esc(RL[v.role] || v.role)} \u00b7 Service : ${esc(v.service || "\u2014")}<br>Commune : ${esc(v.commune || "\u2014")}<br>Cr\u00e9\u00e9 le ${safdd(v.created_at)} \u00b7 Derni\u00e8re connexion : ${v.last_sign_in_at ? fdh(v.last_sign_in_at) : "jamais"}<br>Sessions actives : ${+v.sessions || 0}</p>` +
        acts2((v.role == "super_admin" ? "" : satg("R\u00e9voquer les sessions", "u_revoke", S.sv, "or")) + sbt("Fermer", "u_cancel", "bo"))
    );
  const ph = d.us[S.sp];
  if (ph)
    h += pn(
      "Photo de " + esc(ph.nom || ph.email),
      "user",
      `<p>${(S.uphu || {})[ph.id] ? `<img class="th" src="${esc(S.uphu[ph.id])}" alt="Photo">` : '<span class="mut">Aucune photo</span>'}</p><input type="file" id="sa_uph" accept="image/*" aria-label="Photo de l\u2019utilisateur">` +
        acts2(
          sbt("Enregistrer la photo", "u_photosave", "bt", `data-i="${S.sp}"`) +
            ((S.uph || {})[ph.id] ? sbt("Retirer", "u_photodel", "bo", `data-i="${S.sp}"`) : "") +
            sbt("Fermer", "u_cancel", "bo")
        )
    );
  if (e)
    h += pn(
      "Modifier le compte",
      "user",
      `<p class="mut">${esc(e.email)}</p>` +
        frm(
          inp("en", "Nom", "text", e.nom || "") +
            inp("es", "Service", "text", e.service || "") +
            sel(
              "er",
              "R\u00f4le",
              AL.map(r => [r, RL[r]]),
              e.role
            )
        ) +
        acts2(sbt("Enregistrer", "u_save", "bt", `data-i="${S.se}"`) + sbt("Annuler", "u_cancel", "bo"))
    );
  if (w)
    h += pn(
      "Réinitialiser l’accès",
      "lock",
      `<p class="mut">${esc(w.email)}. Un lien sécurisé sera envoyé à son adresse e-mail. Ses sessions existantes seront révoquées.</p><div id="ts"></div>` +
        acts2(sbt("Envoyer le lien de réinitialisation", "u_pwsave", "bt", `data-i="${S.spw}"`) + sbt("Annuler", "u_cancel", "bo"))
    );
  return h;
};
const uperm = () => {
  const d = sd(),
    U = d.us.filter(x => !["super_admin", "adjoint", "secretariat"].includes(x.role)),
    u = U.find(x => x.id == S.su),
    pu = {};
  (d.pu || []).forEach(x => {
    pu[x.user_id + "." + x.cle] = x.autorise;
  });
  return pn(
    "Permissions par utilisateur",
    "user",
    U.length
      ? `<div class="sa-ac">${U.map(x => satg(x.nom || x.email, "ru_pick", x.id, x.id == S.su ? "ok" : "")).join("")}</div>` +
          (u
            ? `<p class="mut" data-sty="margin-top:10px">${esc(u.email)} \u00b7 r\u00f4le ${esc(RL[u.role] || u.role)}. Une permission personnalis\u00e9e remplace celle du r\u00f4le pour ce compte. Elle affiche ou masque un \u00e9cran de l\u2019espace mairie ; l\u2019acc\u00e8s aux donn\u00e9es reste contr\u00f4l\u00e9 par le serveur.</p>` +
              PK()
                .map((k, i) => {
                  const o = u.id + "." + k in pu,
                    on = o ? pu[u.id + "." + k] : eff(u.role, k);
                  return rw(
                    `<b>${esc(SPL[k] || k)}</b>${o ? '<div class="mut">Personnalis\u00e9</div>' : ""}`,
                    satg(on ? "Autoris\u00e9" : "Refus\u00e9", "ru_toggle", i, on ? "ok" : "rd")
                  );
                })
                .join("") +
              acts2(satg("R\u00e9tablir les permissions du r\u00f4le", "ru_reset", 0, "or"))
            : emp("Choisissez un compte.")) +
          emp("Les comptes adjoint et secr\u00e9tariat ont leur propre interface et ne sont pas concern\u00e9s.")
      : emp("Aucun compte concern\u00e9.")
  );
};
const dlrow = (t, k, s) =>
  rw(`<b>${t}</b><div class="mut">${s}</div>`, satg("T\u00e9l\u00e9charger (CSV)", "rep", "0", "", `data-k="${k}"`));
/* ---- vues ---- */
Object.assign(V, {
  sa_dash: () => {
    const d = sd(),
      s = d.st || {},
      al = [],
      on = MODS.filter(m => modOn(m[0])).length,
      mt = sys("maintenance", {}),
      ls = s.derniere_sauvegarde;
    if (d.miss) al.push("Base non pr\u00eate : migration SQL \u00e0 appliquer");
    if (mt.actif) al.push("Mode maintenance actif : seuls les super-administrateurs peuvent se connecter");
    if (!d.miss && (!ls || Date.now() - new Date(ls) > 7 * 864e5)) al.push("Aucune sauvegarde depuis plus de 7 jours");
    if (+s.incidents_ouverts) al.push(s.incidents_ouverts + " incident(s) ouvert(s)");
    const cards = [
      ["sa_params", "Param\u00e8tres g\u00e9n\u00e9raux", "gear", "k2", "Identit\u00e9, logo, coordonn\u00e9es"],
      ["sa_sec", "S\u00e9curit\u00e9 et acc\u00e8s", "lock", "k3", "Sessions, acc\u00e8s, audit"],
      ["sa_bak", "Sauvegardes et restauration", "db", "k5", "Sauvegarder et restaurer"],
      ["sa_mods", "Configuration des modules", "sliders", "k4", "Fonctionnalit\u00e9s disponibles"]
    ];
    return `${hero()}<div class="ct">${S.err ? `<div class="al" role="alert">${esc(S.err)}</div>` : ""}${al.length ? `<div class="as" role="region" aria-label="Alertes">${al.map(a => `<div class="ai">${ic("alert", 24)}<b>${esc(a)}</b></div>`).join("")}</div>` : ""}
<div class="kp">${kp("k1", "users", "Utilisateurs actifs", fmt(s.users_actifs), +s.users_30j ? `\u25b2 +${s.users_30j} (30 j)` : "")}${kp("k4", "shield", "R\u00f4les d\u00e9finis", AL.length + 1)}${kp("k3", "gear", "Modules actifs", on + " / " + MODS.length)}${kp("k5", "db", "Base de donn\u00e9es", s.taille_db ? sz(s.taille_db) : "\u2014")}${kp("k2", "cal", "Derni\u00e8re sauvegarde", ls ? safdd(ls) : "Aucune")}</div>
<div class="g3">${pn(
      "Gestion des utilisateurs",
      "users",
      d.us
        .slice(0, 5)
        .map((u, i) =>
          rw(
            `<b>${esc(u.nom || u.email)}</b><div class="mut">${esc(RL[u.role] || u.role)}${u.service ? " \u00b7 " + esc(u.service) : ""}</div>`,
            stg(u.actif === false ? "D\u00e9sactiv\u00e9" : "Actif", u.actif === false ? "rd" : "ok")
          )
        )
        .join("") || emp("Aucun utilisateur."),
      `<button class="tg" data-a="go" data-v="sa_users">Voir tous</button>`
    )}${pn(
      "Activit\u00e9s r\u00e9centes",
      "tools",
      d.au
        .slice(0, 6)
        .map(a =>
          rw(
            `<b>${esc(ALB[a.action] || a.action)}</b><div class="mut">${esc(a.email || "syst\u00e8me")}${cb(a.cible) ? " \u00b7 " + esc(cb(a.cible)) : ""}</div>`,
            `<span class="mut" data-sty="font-size:12px;white-space:nowrap">${fdt(a.created_at)}</span>`
          )
        )
        .join("") || emp("Aucune activit\u00e9 enregistr\u00e9e."),
      `<button class="tg" data-a="go" data-v="sa_audit">Voir tout</button>`
    )}</div>
<div class="g3">${pn("Param\u00e8tres et configuration", "gear", `<div class="ecg">${cards.map(x => `<button class="ec ${x[3]}" data-a="go" data-v="${x[0]}">${ic(x[2], 28)}<b>${x[1]}</b><span>${x[4]}</span></button>`).join("")}</div>`)}${pn("Rapports syst\u00e8me", "chart", dlrow("Rapport d\u2019activit\u00e9", "activite", "Journal d\u2019audit") + dlrow("Rapport de s\u00e9curit\u00e9", "securite", "Comptes, r\u00f4les, sessions") + dlrow("Rapport des sauvegardes", "sauvegardes", "Historique des sauvegardes") + dlrow("Rapport de performance", "performance", "Volumes et \u00e9tat des services"), `<button class="tg" data-a="go" data-v="sa_rep">Voir plus</button>`)}</div></div>`;
  },
  sa_users: () => {
    const f = S.sf || {},
      l = ufilt();
    return page(
      "Gestion des utilisateurs",
      pn(
        "Comptes",
        "users",
        frm(
          inp("fq", "Rechercher", "search", f.q || "", "Nom, e-mail ou service") +
            sel("fr", "R\u00f4le", [["", "Tous les r\u00f4les"]].concat(AL.concat("super_admin").map(r => [r, RL[r]])), f.r || "") +
            sel(
              "fs",
              "Statut",
              [
                ["", "Tous les statuts"],
                ["actif", "Actifs"],
                ["off", "D\u00e9sactiv\u00e9s"]
              ],
              f.s || ""
            ) +
            sbt("Filtrer", "u_filter")
        ) + (l.map(([u, i]) => urow(u, i)).join("") || emp("Aucun compte ne correspond."))
      ) +
        uforms() +
        amPanel() +
        pn(
          "Cr\u00e9er un compte",
          "user",
          frm(
            inp("nn", "Nom") +
              inp("ne", "E-mail", "email", "", "", 'autocomplete="off"') +
              sel(
                "nr",
                "R\u00f4le",
                ["admin_mairie"].concat(AL).map(r => [r, RL[r]])
              ) +
              inp("nsv", "Service") +
              sel(
                "nc",
                "Commune",
                S.cs.map(c => [c.slug, c.nom]),
                slug()
              )
          ) + acts2(sbt("Inviter l’utilisateur", "u_create"))
        )
    );
  },
  sa_roles: () => {
    const r = S.sr || "maire",
      d = sd(),
      n = d.st.par_role || {};
    return page(
      "Gestion des r\u00f4les et permissions",
      pn(
        "R\u00f4les",
        "shield",
        AL.concat("super_admin")
          .map(x =>
            rw(
              `<b>${esc(RL[x])}</b><div class="mut">${esc(RLH[x] || "")}</div>`,
              stg((+n[x] || 0) + " compte(s)", x == "super_admin" ? "or" : "")
            )
          )
          .join("")
      ) +
        pn(
          "Permissions du r\u00f4le",
          "lock",
          `<div class="sa-ac">${AL.map(x => satg(RL[x], "r_pick", x, x == r ? "ok" : "")).join("")}</div><p class="mut" data-sty="margin-top:10px">Chaque permission autorise ou masque un \u00e9cran de l\u2019espace mairie pour ce r\u00f4le. Les acc\u00e8s aux donn\u00e9es restent contr\u00f4l\u00e9s c\u00f4t\u00e9 serveur.</p>` +
            PK()
              .map((k, i) => {
                const on = eff(r, k),
                  cu = S.pm && r + "." + k in S.pm;
                return rw(
                  `<b>${esc(SPL[k] || k)}</b>${cu ? '<div class="mut">Personnalis\u00e9</div>' : ""}`,
                  satg(on ? "Autoris\u00e9" : "Refus\u00e9", "r_toggle", i, on ? "ok" : "rd")
                );
              })
              .join("") +
            acts2(satg("R\u00e9tablir les valeurs par d\u00e9faut", "r_reset", 0, "or"))
        ) +
        uperm()
    );
  },
  sa_params: () => {
    const I = S.ind || {},
      up = (k, l, f) =>
        rw(
          `<b>${l}</b><div>${url(k) ? `<img class="th" src="${esc(url(k))}" alt="${l}">` : '<span class="mut">Aucune image</span>'}</div>`,
          `<div data-sty="display:grid;gap:6px"><input type="file" id="${f}" accept="image/*" aria-label="${l}">${sbt("Enregistrer", "p_img", "bo", `data-k="${k}" data-f="${f}"`)}</div>`
        );
    return page(
      "Param\u00e8tres g\u00e9n\u00e9raux",
      pn(
        "Identit\u00e9 de la mairie",
        "brief",
        frm(
          inp("sa_nom", "Nom de la commune", "text", S.co || "") +
            inp("sa_sl", "Slogan", "text", I.slogan || "") +
            inp("sa_dv", "Devise", "text", I.devise || "")
        ) + ""
      ) +
        pn(
          "Coordonn\u00e9es",
          "mail",
          frm(
            inp("sa_ad", "Adresse", "text", I.contact_adresse || "") +
              inp("sa_tl", "T\u00e9l\u00e9phone", "tel", I.contact_tel || "") +
              inp("sa_em", "E-mail de contact", "email", I.contact_email || "") +
              inp("sa_sw", "Site web", "url", I.site_web || "", "https://") +
              inp("sa_ho", "Horaires d\u2019ouverture", "text", I.horaires || "")
          ) + acts2(sbt("Enregistrer l\u2019identit\u00e9 et les coordonn\u00e9es", "p_save"))
        ) +
        pn(
          "Logo et images",
          "user",
          up("blason", "Blason / logo", "sa_f1") +
            up("photo_maire", "Photo du responsable", "sa_f2") +
            up("bandeau", "Bandeau d\u2019accueil", "sa_f3")
        )
    );
  },
  sa_sec: () => {
    const d = sd();
    return page(
      "S\u00e9curit\u00e9 et acc\u00e8s",
      pn(
        "Authentification et sessions",
        "lock",
        rw('<b>Connexion</b><div class="mut">E-mail et mot de passe</div>', stg("Actif", "ok")) +
          rw(
            '<b>V\u00e9rification anti-robot</b><div class="mut">Cloudflare Turnstile</div>',
            stg(TS_KEY ? "Actif" : "Inactif", TS_KEY ? "ok" : "rd")
          ) +
          frm(
            inp("si", "D\u00e9connexion apr\u00e8s inactivit\u00e9 (minutes)", "number", +sys("idle_min", 60), "", 'min="5" max="480"') +
              inp("sm", "Longueur minimale des mots de passe", "number", +sys("mdp_min", 12), "", 'min="8" max="64"')
          ) +
          acts2(sbt("Enregistrer", "sec_save"))
      ) +
        pn(
          "Contr\u00f4le des acc\u00e8s",
          "user",
          d.us
            .map((u, i) =>
              rw(
                `<b>${esc(u.nom || u.email)}</b><div class="mut">${esc(RL[u.role] || u.role)} \u00b7 ${+u.sessions || 0} session(s) \u00b7 ${u.last_sign_in_at ? fdh(u.last_sign_in_at) : "jamais connect\u00e9"}</div>`,
                u.role == "super_admin"
                  ? stg("Prot\u00e9g\u00e9", "or")
                  : satg("R\u00e9voquer les sessions", "u_revoke", i, "or", +u.sessions ? "" : "disabled")
              )
            )
            .join("") || emp("Aucun compte.")
        ) +
        acts2(satg("R\u00e9voquer toutes les sessions (sauf la mienne)", "rev_all", 0, "rd"))
    );
  },
  sa_audit: () => {
    const f = S.af || {},
      q = (f.q || "").toLowerCase(),
      l = sd().au.filter(
        a =>
          (!f.a || a.action == f.a) &&
          (!q || ((a.email || "") + " " + (a.cible || "") + " " + (ALB[a.action] || a.action)).toLowerCase().includes(q))
      );
    return page(
      "Journal d\u2019audit",
      pn(
        "\u00c9v\u00e9nements",
        "doc",
        frm(
          inp("aq", "Rechercher", "search", f.q || "", "Utilisateur ou cible") +
            sel("aa", "Type", [["", "Toutes les actions"]].concat(Object.keys(ALB).map(k => [k, ALB[k]])), f.a || "") +
            sbt("Filtrer", "a_filter")
        ) +
          acts2(satg("Exporter (CSV)", "rep", "0", "", 'data-k="activite"')) +
          `<p class="mut">${l.length} \u00e9v\u00e9nement(s) affich\u00e9(s), 300 plus r\u00e9cents.</p>` +
          (l
            .map(a =>
              rw(
                `<b>${esc(ALB[a.action] || a.action)}</b><div class="mut">${esc(a.email || "syst\u00e8me")}${cb(a.cible) ? " \u00b7 " + esc(cb(a.cible)) : ""}</div>`,
                `<span class="mut" data-sty="font-size:12px;white-space:nowrap">${fdh(a.created_at)}</span>`
              )
            )
            .join("") || emp("Aucun \u00e9v\u00e9nement."))
      )
    );
  },
  sa_bak: () => {
    const d = sd();
    return page(
      "Sauvegardes et restauration",
      pn(
        "Nouvelle sauvegarde",
        "db",
        frm(inp("bn", "Nom (facultatif)", "text", "", "Ex. : avant mise \u00e0 jour")) +
          acts2(sbt("Sauvegarder maintenant", "bak_new")) +
          '<p class="mut" data-sty="margin-top:8px">La sauvegarde couvre les donn\u00e9es de la commune. La restauration ne remplace que la configuration (identit\u00e9, param\u00e8tres, permissions) : les actes, d\u00e9lib\u00e9rations et d\u00e9cisions ne sont jamais modifi\u00e9s. Une sauvegarde automatique est cr\u00e9\u00e9e avant chaque restauration.</p>'
      ) +
        pn(
          "Sauvegardes disponibles",
          "db",
          d.sv
            .map((s, i) =>
              rw(
                `<b>${esc(s.nom)}</b><div class="mut">${fdh(s.created_at)} \u00b7 ${sz(s.taille)} \u00b7 ${esc(s.type)}${s.created_by_email ? " \u00b7 " + esc(s.created_by_email) : ""}</div>`,
                acts2(
                  satg("T\u00e9l\u00e9charger", "bak_dl", i) +
                    satg("Restaurer", "bak_restore", i, "or") +
                    satg("Supprimer", "bak_del", i, "rd")
                )
              )
            )
            .join("") || emp("Aucune sauvegarde.")
        )
    );
  },
  sa_mods: () =>
    page(
      "Gestion des modules",
      pn(
        "Fonctionnalit\u00e9s disponibles",
        "sliders",
        MODS.map((m, i) =>
          rw(
            `<b>${m[1]}</b><div class="mut">${m[2]}</div>`,
            satg(modOn(m[0]) ? "Activ\u00e9" : "D\u00e9sactiv\u00e9", "mod_toggle", i, modOn(m[0]) ? "ok" : "rd")
          )
        ).join("") +
          '<p class="mut" data-sty="margin-top:10px">Un module d\u00e9sactiv\u00e9 dispara\u00eet de l\u2019espace mairie pour tous les r\u00f4les et ne peut plus \u00eatre ouvert.</p>'
      )
    ),
  sa_rep: () => {
    S.tab.sa = S.tab.sa || "act";
    const d = sd(),
      t = S.tab.sa;
    let b = "";
    if (t == "act") {
      const days = [...Array(14)].map((_, k) => {
          const x = new Date(Date.now() - (13 - k) * 864e5),
            key = x.toISOString().slice(0, 10);
          return [x, key, d.au.filter(a => (a.created_at || "").slice(0, 10) == key).length];
        }),
        mx = Math.max(1, ...days.map(x => x[2])),
        ty = {};
      d.au.forEach(a => {
        ty[a.action] = (ty[a.action] || 0) + 1;
      });
      b =
        pn(
          "Activit\u00e9 des 14 derniers jours",
          "chart",
          days
            .map(
              x =>
                `<div class="sa-bar"><span class="mut">${x[0].toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span><div><i data-sty="width:${Math.round((x[2] / mx) * 100)}%"></i></div><b>${x[2]}</b></div>`
            )
            .join("") + acts2(satg("Exporter (CSV)", "rep", "0", "", 'data-k="activite"'))
        ) +
        pn(
          "R\u00e9partition par type",
          "doc",
          Object.keys(ty)
            .sort((a, b2) => ty[b2] - ty[a])
            .map(k => rw(esc(ALB[k] || k), `<b>${ty[k]}</b>`))
            .join("") || emp("Aucune donn\u00e9e.")
        );
    } else if (t == "perf") {
      const h = d.hc,
        v = d.st.volumes || {};
      b =
        pn(
          "\u00c9tat des services",
          "gear",
          (h
            ? h
                .map(x =>
                  rw(
                    `<b>${x.n}</b>${x.ok ? "" : `<div class="mut">${esc(x.e || "")}</div>`}`,
                    `${stg(x.ok ? "OK" : "Erreur", x.ok ? "ok" : "rd")} <span class="mut">${x.ms} ms</span>`
                  )
                )
                .join("")
            : emp("Aucune mesure. Lancez un diagnostic.")) +
            acts2(sbt("Mesurer maintenant", "hc_run", "bt") + satg("Exporter (CSV)", "rep", "0", "", 'data-k="performance"'))
        ) +
        pn(
          "Volumes de donn\u00e9es",
          "db",
          rw("<b>Taille de la base</b>", d.st.taille_db ? sz(d.st.taille_db) : "\u2014") +
            Object.keys(v)
              .map(k => rw(esc(k), `<b>${fmt(v[k])}</b>`))
              .join("")
        );
    } else
      b =
        pn(
          "D\u00e9clarer un incident",
          "alert",
          frm(
            inp("it", "Titre") +
              sel(
                "ig",
                "Gravit\u00e9",
                Object.keys(GRV).map(k => [k, GRV[k]]),
                "mineur"
              ) +
              inp("id2", "Description")
          ) + acts2(sbt("Enregistrer l\u2019incident", "inc_new"))
        ) +
        pn(
          "Incidents",
          "alert",
          d.inc
            .map((x, i) =>
              rw(
                `<b>${esc(x.titre)}</b><div class="mut">${fdh(x.created_at)}${x.created_by_email ? " \u00b7 " + esc(x.created_by_email) : ""}${x.source != "manuel" ? " \u00b7 " + esc(x.source) : ""}</div>${x.description ? `<div class="mut">${esc(x.description)}</div>` : ""}`,
                `${stg(GRV[x.gravite] || x.gravite, GRC[x.gravite])} ${stg(ISL[x.statut] || x.statut, x.statut == "resolu" ? "ok" : "or")}${acts2((x.statut == "ouvert" ? satg("Prendre en charge", "inc_set", i, "", 'data-s="en_cours"') : "") + (x.statut != "resolu" ? satg("R\u00e9soudre", "inc_set", i, "ok", 'data-s="resolu"') : satg("Rouvrir", "inc_set", i, "", 'data-s="ouvert"')))}`
              )
            )
            .join("") || emp("Aucun incident.")
        );
    return page(
      "Rapports syst\u00e8me",
      tabs("sa", [
        ["act", "Activit\u00e9"],
        ["perf", "Performances"],
        ["inc", "Incidents"]
      ]) +
        b +
        `<p class="noprint"><button class="bo" data-a="print">Imprimer / PDF</button></p>`
    );
  },
  sa_maint: () => {
    const d = sd(),
      h = d.hc,
      mt = sys("maintenance", {}),
      sw = "serviceWorker" in navigator && navigator.serviceWorker.controller;
    return page(
      "Maintenance et surveillance",
      pn(
        "Diagnostic",
        "wrench",
        (h
          ? h
              .map((x, i) =>
                rw(
                  `<b>${x.n}</b>${x.ok ? "" : `<div class="mut">${esc(x.e || "")}</div>`}`,
                  `${stg(x.ok ? "OK" : "Erreur", x.ok ? "ok" : "rd")} <span class="mut">${x.ms} ms</span>${x.ok ? "" : " " + satg("Signaler", "hc_inc", i, "or")}`
                )
              )
              .join("")
          : emp("Aucun diagnostic lanc\u00e9.")) + acts2(sbt("Lancer le diagnostic", "hc_run"))
      ) +
        pn(
          "Mode maintenance",
          "alert",
          `<p>${mt.actif ? "<b>Actif</b> : seuls les super-administrateurs peuvent se connecter." : "Inactif : l\u2019application est accessible \u00e0 tous."}</p>` +
            frm(
              inp(
                "mm",
                "Message affich\u00e9 aux utilisateurs",
                "text",
                mt.message || "",
                "L\u2019application est en maintenance. Merci de r\u00e9essayer plus tard."
              )
            ) +
            acts2(
              sbt(
                mt.actif ? "D\u00e9sactiver la maintenance" : "Activer la maintenance",
                "maint",
                mt.actif ? "bt" : "bg",
                `data-s="${mt.actif ? 0 : 1}"`
              )
            )
        ) +
        pn(
          "Environnement de cet appareil",
          "tools",
          rw("Connexion r\u00e9seau", stg(navigator.onLine ? "En ligne" : "Hors ligne", navigator.onLine ? "ok" : "rd")) +
            rw("Service worker", stg(sw ? "Actif" : "Inactif", sw ? "ok" : "or")) +
            rw(
              "Mode d\u2019affichage",
              stg(window.matchMedia && matchMedia("(display-mode: standalone)").matches ? "Application install\u00e9e" : "Navigateur", "bl")
            ) +
            acts2(sbt("Vider le cache de l\u2019application", "cache", "bo"))
        ) +
        pn(
          "Volumes de donn\u00e9es",
          "db",
          rw("<b>Taille de la base</b>", d.st.taille_db ? sz(d.st.taille_db) : "\u2014") +
            Object.entries(d.st.volumes || {})
              .map(([k, v]) => rw(esc(k), `<b>${fmt(v)}</b>`))
              .join("")
        )
    );
  }
});
/* ---- actions ---- */
const SAC = {
  async u_filter(t, g) {
    S.sf = { q: g("fq"), r: g("fr"), s: g("fs") };
  },
  async a_filter(t, g) {
    S.af = { q: g("aq"), a: g("aa") };
  },
  async am_load() {
    await amLoad();
  },
  async am_create(t, g) {
    if (!g("ae")) throw new Error("E-mail requis.");
    const r = await edge({ action: "affecter_admin_mairie", email: g("ae"), nom: g("an"), commune: g("ac") });
    await amLoad();
    S.err =
      r.status == "affecte"
        ? "Compte affect\u00e9, encore inactif : activez-le ensuite."
        : "Compte pr\u00e9par\u00e9 : en attente d\u2019affectation, sans aucun droit.";
  },
  async am_toggle(t) {
    const a = (S.am || [])[+t.dataset.i];
    if (!a) throw new Error("Compte introuvable.");
    const on = a.statut != "actif";
    await edge({ action: "activer", id: a.user_id, actif: on });
    await amLoad();
    S.err = on ? "Administrateur activ\u00e9." : "Administrateur suspendu.";
  },
  async u_view(t) {
    S.sv = +t.dataset.i;
    S.sp = S.se = S.spw = null;
  },
  async u_edit(t) {
    S.se = +t.dataset.i;
    S.sp = S.sv = S.spw = null;
  },
  async u_pw(t) {
    S.spw = +t.dataset.i;
    S.sp = S.sv = S.se = null;
    S.tok = "";
  },
  async u_photo(t) {
    S.sp = +t.dataset.i;
    S.sv = S.se = S.spw = null;
  },
  async u_photosave(t) {
    const u = sd().us[+t.dataset.i],
      e = $("#sa_uph"),
      f = e && e.files && e.files[0];
    if (!u) throw new Error("Compte introuvable.");
    if (!f) throw new Error("Choisissez d\u2019abord une image.");
    const bl = await comp(f, 600, 150000),
      pa = cs() + "/profils/" + u.id + "-" + crypto.randomUUID() + "." + (bl.type == "image/webp" ? "webp" : "jpg"),
      up = await sb.storage.from("medias").upload(pa, bl, { contentType: bl.type });
    if (up.error) throw new Error("Envoi impossible : " + up.error.message);
    const old = await rpc("sa_set_profil_photo", { p_commune: cs(), p_user: u.id, p_chemin: pa });
    if (old) await sb.storage.from("medias").remove([old]);
    S.err = "Photo enregistr\u00e9e.";
    S.reload = true;
  },
  async u_photodel(t) {
    const u = sd().us[+t.dataset.i];
    if (!u) throw new Error("Compte introuvable.");
    const old = await rpc("sa_set_profil_photo", { p_commune: cs(), p_user: u.id, p_chemin: null });
    if (old) await sb.storage.from("medias").remove([old]);
    S.err = "Photo retir\u00e9e.";
    S.reload = true;
  },
  async u_cancel() {
    S.sp = null;
    S.sv = S.se = S.spw = null;
    S.tok = "";
  },
  async u_create(t, g) {
    if (!g("nn") || !g("ne")) throw new Error("Nom et e-mail requis.");
    await edge({ action: "inviter", nom: g("nn"), email: g("ne"), role: g("nr"), service: g("nsv"), commune: g("nc") });
    S.err = "Invitation envoyée. Le compte reste inactif jusqu’à acceptation et confirmation de l’adresse e-mail.";
  },
  async u_save(t, g) {
    const u = sd().us[+t.dataset.i];
    await edge({ action: "modifier", id: u.id, nom: g("en"), service: g("es"), role: g("er") });
    S.se = null;
    S.err = "Compte modifi\u00e9.";
  },
  async u_toggle(t) {
    const u = sd().us[+t.dataset.i],
      off = u.actif === false;
    if (!off && !confirm("D\u00e9sactiver le compte " + u.email + " ? Il ne pourra plus se connecter.")) return;
    await edge({ action: "activer", id: u.id, actif: off });
    S.err = off ? "Compte r\u00e9activ\u00e9." : "Compte d\u00e9sactiv\u00e9.";
  },
  async u_pwsave(t) {
    const u = sd().us[+t.dataset.i],
      captchaToken = S.tok;
    if (!captchaToken) throw new Error("Validez la vérification anti-robot avant l’envoi.");
    try {
      await edge({ action: "reinit_mdp", id: u.id, captchaToken });
    } finally {
      S.tok = "";
    }
    S.spw = null;
    S.err = "Lien de réinitialisation envoyé. Les sessions existantes ont été révoquées.";
  },
  async u_revoke(t) {
    const u = sd().us[+t.dataset.i];
    if (!confirm("Fermer toutes les sessions de " + u.email + " ?")) return;
    await rpc("sa_revoquer_sessions", { p_commune: cs(), p_user: u.id });
    S.err = "Sessions r\u00e9voqu\u00e9es.";
  },
  async rev_all() {
    if (!confirm("Fermer les sessions de tous les autres utilisateurs ?")) return;
    await rpc("sa_revoquer_sessions", { p_commune: cs(), p_user: null });
    S.err = "Sessions r\u00e9voqu\u00e9es.";
  },
  async r_pick(t) {
    S.sr = t.dataset.i;
  },
  async r_toggle(t) {
    const r = S.sr || "maire",
      k = PK()[+t.dataset.i];
    await rpc("sa_set_permission", { p_commune: cs(), p_role: r, p_cle: k, p_autorise: !eff(r, k) });
    S.err = "Permission enregistr\u00e9e.";
  },
  async ru_pick(t) {
    S.su = t.dataset.i;
  },
  async ru_toggle(t) {
    const d = sd(),
      u = d.us.find(x => x.id == S.su),
      k = PK()[+t.dataset.i];
    if (!u) throw new Error("Choisissez un compte.");
    const o = (d.pu || []).find(x => x.user_id == u.id && x.cle == k),
      on = o ? o.autorise : eff(u.role, k);
    await rpc("sa_set_permission_user", { p_commune: cs(), p_user: u.id, p_cle: k, p_autorise: !on });
    S.err = "Permission enregistr\u00e9e.";
  },
  async ru_reset() {
    const u = sd().us.find(x => x.id == S.su);
    if (!u) throw new Error("Choisissez un compte.");
    if (!confirm("R\u00e9tablir les permissions du r\u00f4le pour " + u.email + " ?")) return;
    await rpc("sa_reset_permissions_user", { p_commune: cs(), p_user: u.id });
    S.err = "Permissions du r\u00f4le r\u00e9tablies.";
  },
  async r_reset() {
    const r = S.sr || "maire";
    if (!confirm("R\u00e9tablir les permissions par d\u00e9faut du r\u00f4le \u00ab " + RL[r] + " \u00bb ?")) return;
    await rpc("sa_reset_permissions", { p_commune: cs(), p_role: r });
    S.err = "Permissions r\u00e9tablies.";
  },
  async p_save(t, g) {
    await rpc("sa_enregistrer_identite", {
      p_commune: cs(),
      p_data: {
        nom: g("sa_nom"),
        slogan: g("sa_sl"),
        devise: g("sa_dv"),
        contact_adresse: g("sa_ad"),
        contact_tel: g("sa_tl"),
        contact_email: g("sa_em"),
        site_web: g("sa_sw"),
        horaires: g("sa_ho")
      }
    });
    await lcm();
    const c = S.cs.find(x => x.id == S.cid);
    if (c) S.co = c.nom;
    S.err = "Identit\u00e9 et coordonn\u00e9es enregistr\u00e9es.";
    S.reload = true;
  },
  async p_img(t) {
    const k = t.dataset.k,
      e = $("#" + t.dataset.f),
      f = e && e.files && e.files[0];
    if (!f) throw new Error("Choisissez d\u2019abord une image.");
    const bl = await comp(f, k == "blason" ? 600 : 1600, k == "blason" ? 150000 : 400000),
      pa = cs() + "/" + k + "-" + crypto.randomUUID() + "." + (bl.type == "image/webp" ? "webp" : "jpg"),
      up = await sb.storage.from("medias").upload(pa, bl, { contentType: bl.type });
    if (up.error) throw new Error("Envoi impossible : " + up.error.message);
    const old = await rpc("sa_set_image", { p_commune: cs(), p_cle: k, p_chemin: pa });
    if (old) await sb.storage.from("medias").remove([old]);
    S.err = "Image enregistr\u00e9e (" + kb(bl.size) + ").";
    S.reload = true;
  },
  async sec_save(t, g) {
    await rpc("sa_set_param", { p_commune: cs(), p_cle: "idle_min", p_valeur: +g("si") });
    await rpc("sa_set_param", { p_commune: cs(), p_cle: "mdp_min", p_valeur: +g("sm") });
    S.err = "Param\u00e8tres de s\u00e9curit\u00e9 enregistr\u00e9s.";
  },
  async bak_new(t, g) {
    await rpc("sa_creer_sauvegarde", { p_commune: cs(), p_nom: g("bn"), p_type: "manuelle" });
    S.err = "Sauvegarde cr\u00e9\u00e9e.";
  },
  async bak_dl(t) {
    const s = sd().sv[+t.dataset.i],
      r = await sb.from("sauvegardes").select("nom,contenu,created_at").eq("id", s.id).single();
    if (r.error) throw new Error(r.error.message);
    saveFile(
      "sauvegarde-" + (S.co || "mairie").toLowerCase().replace(/\W+/g, "-") + "-" + String(r.data.created_at).slice(0, 10) + ".json",
      JSON.stringify(r.data.contenu),
      "application/json"
    );
    sb.rpc("sa_audit", { p_commune: cs(), p_action: "export", p_cible: "sauvegarde", p_detail: null });
  },
  async bak_restore(t) {
    const s = sd().sv[+t.dataset.i];
    if (
      !confirm(
        "Restaurer la configuration de \u00ab " +
          s.nom +
          " \u00bb ? Identit\u00e9, param\u00e8tres et permissions seront remplac\u00e9s. Une sauvegarde automatique est cr\u00e9\u00e9e avant."
      )
    )
      return;
    const r = await rpc("sa_restaurer", { p_commune: cs(), p_id: s.id });
    S.err = "Configuration restaur\u00e9e (" + ((r && r.restaurees) || []).join(", ") + ").";
    S.reload = true;
  },
  async bak_del(t) {
    const s = sd().sv[+t.dataset.i];
    if (!confirm("Supprimer la sauvegarde \u00ab " + s.nom + " \u00bb ?")) return;
    await rpc("sa_supprimer_sauvegarde", { p_commune: cs(), p_id: s.id });
    S.err = "Sauvegarde supprim\u00e9e.";
  },
  async mod_toggle(t) {
    const m = MODS[+t.dataset.i],
      o = Object.assign({}, S.mod || {});
    o[m[0]] = !modOn(m[0]);
    await rpc("sa_set_param", { p_commune: cs(), p_cle: "modules", p_valeur: o });
    S.err = "Module " + (o[m[0]] ? "activ\u00e9" : "d\u00e9sactiv\u00e9") + ".";
  },
  async hc_run() {
    sd().hc = await saHealth();
  },
  async hc_inc(t) {
    const x = sd().hc[+t.dataset.i];
    await rpc("sa_incident_creer", {
      p_commune: cs(),
      p_titre: "Service en erreur : " + x.n,
      p_gravite: "majeur",
      p_description: x.e || "",
      p_source: "diagnostic"
    });
    S.err = "Incident d\u00e9clar\u00e9.";
  },
  async maint(t, g) {
    const on = t.dataset.s == "1";
    if (on && !confirm("Activer la maintenance ? Les utilisateurs non super-administrateurs ne pourront plus se connecter.")) return;
    await rpc("sa_set_param", { p_commune: cs(), p_cle: "maintenance", p_valeur: { actif: on, message: g("mm") } });
    S.err = on ? "Mode maintenance activ\u00e9." : "Mode maintenance d\u00e9sactiv\u00e9.";
  },
  async cache() {
    const k = await caches.keys();
    await Promise.all(k.map(x => caches.delete(x)));
    sb.rpc("sa_audit", { p_commune: cs(), p_action: "cache_purge", p_cible: null, p_detail: { caches: k.length } });
    S.err = "Cache vid\u00e9 (" + k.length + "). Rechargement\u2026";
    S.keep = true;
    setTimeout(() => location.reload(), 900);
  },
  async inc_new(t, g) {
    await rpc("sa_incident_creer", { p_commune: cs(), p_titre: g("it"), p_gravite: g("ig"), p_description: g("id2"), p_source: "manuel" });
    S.err = "Incident enregistr\u00e9.";
  },
  async inc_set(t) {
    const x = sd().inc[+t.dataset.i];
    await rpc("sa_incident_maj", { p_commune: cs(), p_id: x.id, p_statut: t.dataset.s });
    S.err = "Incident mis \u00e0 jour.";
  },
  async rep(t) {
    const k = t.dataset.k,
      d = sd();
    if (k == "activite")
      csv(
        "rapport-activite",
        [["Date", "Utilisateur", "Action", "Cible", "D\u00e9tail"]].concat(
          d.au.map(a => [
            fdh(a.created_at),
            a.email || "syst\u00e8me",
            ALB[a.action] || a.action,
            a.cible || "",
            a.detail ? JSON.stringify(a.detail) : ""
          ])
        )
      );
    else if (k == "securite")
      csv(
        "rapport-securite",
        [["E-mail", "Nom", "R\u00f4le", "Statut", "Derni\u00e8re connexion", "Sessions actives"]].concat(
          d.us.map(u => [
            u.email,
            u.nom || "",
            RL[u.role] || u.role,
            u.actif === false ? "D\u00e9sactiv\u00e9" : "Actif",
            u.last_sign_in_at ? fdh(u.last_sign_in_at) : "jamais",
            u.sessions || 0
          ])
        )
      );
    else if (k == "sauvegardes")
      csv(
        "rapport-sauvegardes",
        [["Nom", "Type", "Date", "Taille (octets)", "Cr\u00e9\u00e9e par"]].concat(
          d.sv.map(s => [s.nom, s.type, fdh(s.created_at), s.taille, s.created_by_email || ""])
        )
      );
    else {
      if (!d.hc) d.hc = await saHealth();
      csv(
        "rapport-performance",
        [["\u00c9l\u00e9ment", "Valeur", "D\u00e9tail"]].concat(
          d.hc.map(x => [x.n, x.ok ? "OK" : "Erreur", x.ms + " ms" + (x.e ? " - " + x.e : "")]),
          [["Taille de la base", d.st.taille_db || "", ""]],
          Object.entries(d.st.volumes || {}).map(([a, b]) => ["Lignes : " + a, b, ""])
        )
      );
    }
    S.keep = true;
  }
};
const NR = new Set();
const SAR = new Set([
  "ru_toggle",
  "ru_reset",
  "u_create",
  "u_save",
  "u_toggle",
  "u_pwsave",
  "u_revoke",
  "rev_all",
  "r_toggle",
  "r_reset",
  "p_save",
  "p_img",
  "sec_save",
  "bak_new",
  "bak_restore",
  "bak_del",
  "mod_toggle",
  "hc_inc",
  "maint",
  "inc_new",
  "inc_set"
]);
async function saDo(a, t, g) {
  S.err = "";
  S.keep = false;
  const f = SAC[a];
  if (!f) throw new Error("Action inconnue : " + a);
  await f(t, g);
  if (SAR.has(a)) {
    await (S.reload ? load() : saLoad());
    S.reload = false;
  }
}
document.addEventListener("click", async e => {
  const t = e.target.closest("[data-sa]");
  if (!t || !S.sa) return;
  const g = id => (($("#" + id) || {}).value || "").trim();
  try {
    await saDo(t.dataset.sa, t, g);
  } catch (x) {
    S.err = (x && x.message) || "Action impossible.";
  }
  if (NR.has(t.dataset.sa) && !S.err) return;
  render();
  saTurnstile();
  if (!S.keep && !["r_pick", "ru_pick", "ru_toggle"].includes(t.dataset.sa)) window.scrollTo(0, 0);
});
let IDLE_AT = Date.now();
["click", "keydown", "touchstart", "scroll"].forEach(v =>
  addEventListener(
    v,
    () => {
      IDLE_AT = Date.now();
    },
    { passive: true }
  )
);
setInterval(async () => {
  if (S.role != "cab") return;
  const m = +sys("idle_min", 60);
  if (m && Date.now() - IDLE_AT > m * 6e4) {
    S.role = null;
    S.cid = null;
    S.uid = null;
    S.sa = false;
    S.db = E0;
    S.ind = {};
    S.err = "Session ferm\u00e9e apr\u00e8s " + m + " minutes d\u2019inactivit\u00e9.";
    try {
      await sb.auth.signOut();
    } catch (e) {}
    render();
  }
}, 30000);
