/* Notifications « façon messagerie » pour mairie, citoyen et SaaS : arrivée en direct (Realtime + relève toutes les 30 s),
   bulle dans la page ou alerte système si l'onglet est masqué, regroupement, compteur (titre + icône), son, silence 1 h.
   Chaque source ne lit que ce que la RLS autorise au compte connecté. */
(function () {
  const BASE = document.title;
  const store = {
    get: k => {
      try {
        return JSON.parse(localStorage.getItem(k));
      } catch (e) {
        return null;
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    }
  };
  let src = null,
    who = "",
    seen = null,
    busy = false,
    again = false,
    chan = null,
    audio = null;
  const muted = () => Date.now() < (store.get("mc_nt_mute") || 0);

  const vuKey = () => "mc_nt_vu_" + (typeof S != "undefined" ? S.uid : "");
  const vus = () => new Set(store.get(vuKey()) || []);
  const addVu = ids => store.set(vuKey(), [...new Set([...vus(), ...ids])].slice(-1000));
  const isCab = () => typeof S != "undefined" && S.role == "cab" && !!S.uid && !S.sa && typeof D == "function";

  /* ---------- Mairie : navigation vers l'élément concerné ---------- */
  const redraw = () => {
    S.menu = false;
    S.dd = null;
    render();
    window.scrollTo(0, 0);
  };
  /* destination autorisée pour ce rôle, sinon null */
  function target(tab) {
    const navs = NAV().map(n => n[0]);
    const direct = { citoyens: ["citoyens"], cout: ["s_cout"], pub: ["comm"], reun: ["a_reun", "s_reun"], instr: ["a_instr", "s_instr"], projets: ["a_proj"] }[tab];
    const v = (direct || []).find(x => navs.includes(x));
    if (v) return { v };
    if ((typeof isA == "function" && isA()) || (typeof isS == "function" && isS())) return null;
    const alt = { reun: ["reun", "sreun"], instr: ["instr", "sinstr"], projets: ["projets", "projA"] }[tab] || [tab];
    for (const [k, x] of Object.entries(SP)) {
      const y = espAll().includes(x) && x.subs.find(z => alt.includes(z[0]) && can(z[0]));
      if (y) return { v: x.v, k, t: y[0] };
    }
    return null;
  }
  function goTab(tab) {
    const g = target(tab);
    if (!g) return false;
    S.view = g.v;
    if (g.k) S.tab[g.k] = g.t;
    redraw();
    return true;
  }
  async function goDemande(id) {
    goTab("citoyens");
    S.dd = id;
    if (typeof markSeen == "function") markSeen(id);
    if (typeof openD == "function") await openD();
    render();
  }
  function goView(v) {
    if (typeof isS == "function" && isS()) S.view = v;
    else {
      S.view = "s_sec";
      S.tab.secretariat = SMAP[v] || "sdash";
    }
    redraw();
  }
  /* Source unique : la pastille, la fenêtre et les pages « Notifications » affichent exactement ces éléments */
  function cabItems() {
    if (!isCab()) return [];
    const d = D(),
      vu = vus(),
      out = [],
      keys = new Set();
    const add = (id, title, body, go, read, at) => {
      if (keys.has(id)) return;
      keys.add(id);
      out.push({ id, title, body: body || "", go, read: read == null ? vu.has(id) : read, at: at || "" });
    };
    const safe = f => {
      try {
        f();
      } catch (e) {}
    };
    safe(() =>
      d.nt.forEach(n =>
        add("n:" + n.id, n.titre, n.corps, () => tmp({ a: "ntgo", id: n.id, l: n.lien || "" }), !!n.lu, n.created_at)
      )
    );
    safe(() =>
      (target("citoyens") ? unseenNew() : []).forEach(r =>
        add("d:" + r.id, "Nouvelle demande citoyenne", [r.n, r.o || r.t, r.w].filter(Boolean).join(" · "), () => goDemande(r.id), null, r.c)
      )
    );
    if (S.pr == "maire")
      safe(() =>
        todo().forEach(x =>
          add("t:" + x.t, "À traiter", x.t, () => (x.dd ? goDemande(x.dd) : tmp({ m: "go", sp: x.sp, t: x.tb })))
        )
      );
    else
      safe(() => d.mail.filter(m => m.st == "À signer" && target("cout")).forEach(m => add("m:" + m.id, "Courrier à signer", m.o, () => goTab("cout"))));
    if (typeof isS == "function" && isS()) safe(() => urg().forEach(x => add("u:" + x.t, "À traiter", x.t, () => goView(x.v))));
    safe(() => d.posts.filter(p => p.st == "valider" && target("pub")).forEach(p => add("p:" + p.id, "Publication à valider", String(p.t || "").slice(0, 90), () => goTab("pub"))));
    safe(() => {
      const dp = d.fin.reduce((a, r) => a + +r.depenses, 0);
      if (target("budget") && S.ind.budget_annuel && dp > S.ind.budget_annuel) add("b:" + dp, "Alerte budget", "Les dépenses dépassent le budget annuel", () => goTab("budget"));
    });
    safe(() =>
      rem().forEach(x => {
        const tab = /^Réunion/.test(x.t) ? "reun" : /^Projet/.test(x.t) ? "projets" : "instr";
        if (target(tab)) add("r:" + x.t, "Rappel", x.t, () => goTab(tab));
      })
    );
    return out.sort((a, b) => a.read - b.read || String(b.at).localeCompare(String(a.at)));
  }
  window.ntItems = cabItems;

  function source() {
    if (typeof S == "undefined" || typeof sb == "undefined") return null;
    if (isCab()) {
      const uid = S.uid;
      let k = 0;
      return {
        who: "cab:" + uid,
        app: "/mairie",
        rt: { table: "notifications", filter: "user_id=eq." + uid },
        async refresh() {
          /* données métier toutes les 2 min, notifications à chaque relève */
          if (++k % 4 == 0 && typeof load == "function") await load(["demandes", "dvues", "courrier", "actes", "instructions", "publications", "reunions"]);
          const r = await sb.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(60);
          if (r.error) throw r.error;
          if (S.db && S.uid == uid) S.db.nt = r.data || [];
        },
        items: cabItems,
        async open(n) {
          addVu([n.id]);
          if (n.id.startsWith("n:")) {
            const row = D().nt.find(x => "n:" + x.id == n.id);
            if (row) row.lu = true;
          }
          const before = S.view + "|" + JSON.stringify(S.tab);
          await n.go();
          /* notification sans destination : on affiche son contenu */
          if (n.id.startsWith("n:")) setTimeout(() => before == S.view + "|" + JSON.stringify(S.tab) && toast(n.title, n.body, () => {}), 900);
        },
        async readAll() {
          addVu(cabItems().map(x => x.id));
          if (typeof markSeen == "function") unseenNew().forEach(r => markSeen(r.id));
          D().nt.forEach(x => (x.lu = true));
          const r = await sb.from("notifications").update({ lu: true }).eq("user_id", uid).eq("lu", false);
          if (r.error) throw r.error;
        }
      };
    }
    if (typeof S.user == "object" && S.user && typeof loadNt == "function") {
      const uid = S.user.id;
      const items = () => (S.nt || []).map(n => ({ id: String(n.id), title: n.titre, body: n.corps || "", read: !!n.lu, at: n.created_at, raw: n }));
      return {
        who: "cit:" + uid,
        app: "/" + location.search,
        rt: { table: "citoyen_notifications", filter: "user_id=eq." + uid },
        bell: true,
        async refresh() {
          await loadNt();
          const b = document.querySelector(".tm");
          if (b && typeof btl == "function") b.textContent = btl();
        },
        items,
        async open(n) {
          n.raw.lu = true;
          const num = typeof nnum == "function" ? nnum(n.raw) : "";
          if (num) tmp({ a: "nopen", i: n.id, n: num });
          else {
            await sb.from("citoyen_notifications").update({ lu: true }).eq("id", n.id);
            tmp({ a: "esp" });
          }
        },
        async readAll() {
          (S.nt || []).forEach(x => (x.lu = true));
          const r = await sb.from("citoyen_notifications").update({ lu: true }).eq("lu", false);
          if (r.error) throw r.error;
          render();
        }
      };
    }
    if (S.st == "app" && "me" in S) {
      const key = "mc_nt_lus_saas:" + S.me,
        me = S.me;
      let rows = [];
      const lus = () => new Set(store.get(key) || []);
      const mark = ids => store.set(key, [...new Set([...lus(), ...ids])].slice(-300));
      return {
        who: "saas:" + me,
        app: "/saas",
        bell: true,
        async refresh() {
          const r = await sb.from("platform_audit").select("id,action,email,created_at").order("created_at", { ascending: false }).limit(30);
          if (r.error) throw r.error;
          /* ses propres actions ne le notifient pas */
          rows = (r.data || []).filter(a => a.email != me);
        },
        items() {
          const l = lus();
          return rows.map(a => ({
            id: String(a.id),
            title: (typeof AL != "undefined" && AL[a.action]) || a.action,
            body: a.email || "",
            read: l.has(String(a.id)),
            at: a.created_at
          }));
        },
        async open(n) {
          mark([n.id]);
          if (!click('[data-v="audit"]')) {
            S.v = "audit";
            render();
          }
        },
        async readAll() {
          mark(rows.map(a => String(a.id)));
        }
      };
    }
    return null;
  }
  const click = s => {
    const b = document.querySelector(s);
    if (b) b.click();
    return !!b;
  };
  function tmp(data) {
    const b = document.createElement("button");
    b.hidden = true;
    Object.assign(b.dataset, data);
    document.body.appendChild(b);
    b.click();
    setTimeout(() => b.remove(), 0);
  }

  function count() {
    const n = src ? src.items().filter(x => !x.read).length : 0;
    document.title = n ? "(" + (n > 99 ? "99+" : n) + ") " + BASE : BASE;
    try {
      if (navigator.setAppBadge) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    } catch (e) {}
    if (isCab() && typeof majBadge == "function") majBadge();
    bell(n);
  }
  /* cloche flottante pour les interfaces sans cloche (citoyen, SaaS) */
  function bell(n) {
    let b = document.getElementById("fv-bell");
    if (!src || !src.bell) {
      if (b) b.remove();
      return;
    }
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.id = "fv-bell";
      b.onclick = panel;
      document.body.appendChild(b);
    }
    b.textContent = "🔔" + (n ? " " + (n > 99 ? "99+" : n) : "");
    b.setAttribute("aria-label", "Notifications" + (n ? " : " + n + " non lues" : ""));
  }
  /* ---------- Liste (fenêtre et pages) ---------- */
  const when = x => {
    const d = new Date(x);
    return x && !isNaN(d) ? d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
  };
  const h = x => String(x == null ? "" : x).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
  const listHtml = list =>
    (list.some(x => !x.read) ? '<button type="button" class="fv-all" data-fvall="1">Tout marquer comme lu</button>' : "") +
    (list
      .map(
        x =>
          `<button type="button" class="fv-r${x.read ? "" : " new"}" data-fvn="${h(x.id)}"><b>${x.read ? "" : "● "}${h(x.title)}</b><span>${h(x.body)}${when(x.at) ? " · " + when(x.at) : ""}</span></button>`
      )
      .join("") || '<p class="fv-empty">Aucune notification.</p>');
  let pane = null;
  const closePane = () => {
    if (pane) pane.remove();
    pane = null;
  };
  function panel() {
    if (!src) src = source();
    if (!src) return;
    closePane();
    pane = document.createElement("div");
    pane.className = "fv-ov";
    pane.innerHTML = `<div class="fv-pal" role="dialog" aria-modal="true" aria-label="Notifications"><div class="fv-top"><strong>Notifications</strong><button type="button" class="fv-x">Fermer</button></div><div class="fv-list">${listHtml(src.items())}</div></div>`;
    pane.onclick = e => {
      if (e.target == pane || e.target.closest(".fv-x")) closePane();
    };
    pane.onkeydown = e => e.key == "Escape" && closePane();
    document.body.appendChild(pane);
    pane.querySelector(".fv-x").focus();
  }
  const onPage = () =>
    isCab() && (S.view == "a_notif" || S.view == "s_notif" || (S.view == "s_maire" && S.tab.maire == "notif") || (S.view == "s_sec" && S.tab.secretariat == "snotif"));
  const refreshViews = () => {
    count();
    if (pane) pane.querySelector(".fv-list").innerHTML = listHtml(src.items());
    if (onPage() && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) render();
  };
  /* pages « Notifications » du maire, du secrétariat et des adjoints : même liste que la pastille */
  if (typeof SUB != "undefined" && typeof V != "undefined" && typeof pn == "function") {
    const view = () => pn("Notifications", "bell", listHtml(cabItems()));
    const prevN = SUB.notif,
      prevS = SUB.snotif;
    SUB.notif = () => (S.sa ? prevN() : view());
    SUB.snotif = () => (S.sa ? prevS() : view());
    V.a_notif = () => page("Notifications", SUB.notif());
    V.s_notif = () => page("Notifications", SUB.snotif());
  }
  /* la cloche de la mairie ouvre la liste, pour tous les rôles */
  document.addEventListener(
    "click",
    e => {
      if (!isCab() || !e.target.closest || !e.target.closest(".tb .bl")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      panel();
    },
    true
  );
  document.addEventListener("click", async e => {
    const t = e.target.closest && e.target.closest("[data-fvn],[data-fvall]");
    if (!t || !src) return;
    try {
      if (t.dataset.fvall) await src.readAll();
      else {
        const it = src.items().find(x => x.id == t.dataset.fvn);
        closePane();
        if (it) await src.open(it);
      }
    } catch (x) {
      toast("Action impossible", x.message || "Vérifiez la connexion.", () => {});
    }
    refreshViews();
  });

  function beep() {
    try {
      if (!audio) return;
      const o = audio.createOscillator(),
        g = audio.createGain(),
        t = audio.currentTime;
      o.frequency.setValueAtTime(880, t);
      o.frequency.setValueAtTime(1175, t + 0.09);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.26);
    } catch (e) {}
  }
  /* le navigateur n'autorise le son qu'après un geste */
  document.addEventListener(
    "pointerdown",
    () => {
      try {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!audio && A) audio = new A();
      } catch (e) {}
    },
    { once: true }
  );
  function toast(title, body, onOpen) {
    let host = document.getElementById("fv-toasts");
    if (!host) {
      host = document.createElement("div");
      host.id = "fv-toasts";
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    while (host.children.length > 2) host.firstChild.remove();
    const el = document.createElement("div");
    el.className = "fv-t";
    const main = document.createElement("button"),
      t = document.createElement("b"),
      p = document.createElement("span");
    main.type = "button";
    main.className = "fv-tm";
    t.textContent = title;
    p.textContent = String(body || "").slice(0, 140);
    main.append(t, p);
    main.onclick = () => {
      el.remove();
      onOpen();
    };
    const bar = document.createElement("div"),
      act = (label, fn) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.onclick = fn;
        bar.appendChild(b);
      };
    if ("Notification" in window && Notification.permission == "default")
      act("Activer les alertes", () => {
        el.remove();
        Promise.resolve(Notification.requestPermission()).catch(() => {});
      });
    act("Silence 1 h", () => {
      store.set("mc_nt_mute", Date.now() + 3600000);
      host.textContent = "";
    });
    act("Fermer", () => el.remove());
    el.append(main, bar);
    host.appendChild(el);
    setTimeout(() => el.remove(), 9000);
  }
  async function system(title, body, id) {
    try {
      if (!("Notification" in window) || Notification.permission != "granted" || !navigator.serviceWorker) return;
      const reg = await navigator.serviceWorker.ready;
      /* même tag : l'alerte précédente est remplacée (pas d'empilement) */
      await reg.showNotification(String(title).slice(0, 80), {
        body: String(body || "").slice(0, 120),
        icon: "/icon-defaut-192.png",
        badge: "/icon-defaut-192.png",
        tag: "mc-live",
        renotify: true,
        data: { n: String(id || ""), app: src.app }
      });
    } catch (e) {}
  }
  function announce(fresh, first) {
    if (!fresh.length || muted()) return;
    const one = fresh.length == 1 ? fresh[0] : null,
      title = one ? one.title : fresh.length + (first ? " notifications non lues" : " nouvelles notifications"),
      body = one
        ? one.body
        : fresh
            .slice(0, 3)
            .map(x => x.title)
            .join(" · "),
      s = src,
      go = () => (one ? Promise.resolve(s.open(one)).then(refreshViews) : panel());
    /* citoyen abonné au push : l'alerte système vient déjà du serveur */
    if (document.hidden) {
      if (!(s.who.startsWith("cit:") && S.psh == "on")) system(title, body, fresh[0].id);
    }
    else toast(title, body, go);
    if (!first) {
      beep();
      try {
        if (navigator.vibrate) navigator.vibrate(120);
      } catch (e) {}
    }
  }
  function reset() {
    if (chan)
      try {
        sb.removeChannel(chan);
      } catch (e) {}
    chan = null;
    src = null;
    closePane();
    seen = null;
    who = "";
    const h = document.getElementById("fv-toasts");
    if (h) h.textContent = "";
    count();
  }
  async function tick() {
    if (busy) {
      again = true;
      return;
    }
    const s = source();
    if (!s) {
      if (who) reset();
      return;
    }
    busy = true;
    try {
      if (s.who != who) {
        reset();
        who = s.who;
        if (s.rt && sb.channel)
          chan = sb
            .channel("mc_nt_" + s.who)
            .on("postgres_changes", Object.assign({ event: "INSERT", schema: "public" }, s.rt), () => tick())
            .subscribe();
      }
      /* même compte : on garde la même source (compteur de relèves, lignes en mémoire) */
      if (!src) src = s;
      const cur = src;
      await cur.refresh();
      if (who != s.who) return;
      const list = cur.items();
      const known = seen || new Set(store.get("mc_nt_seen_" + who) || []),
        fresh = list.filter(x => !x.read && !known.has(String(x.id)));
      const first = !seen;
      seen = new Set([...known, ...list.map(x => String(x.id))]);
      store.set("mc_nt_seen_" + who, [...seen].slice(-1000));
      count();
      announce(fresh, first);
      if (fresh.length) refreshViews();
    } catch (e) {
    } finally {
      busy = false;
      if (again) {
        again = false;
        tick();
      }
    }
  }
  /* détecte connexion / déconnexion ; relève toutes les 30 s */
  let n = 0;
  setInterval(() => {
    const s = source();
    n++;
    if ((s ? s.who : "") != who || (s && n % 15 == 0)) tick();
  }, 2000);
  addEventListener("online", tick);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick();
  });
  /* après lecture par les boutons historiques */
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest('[data-a="ntall"],[data-a="nrd"],[data-a="nopen"],[data-a="opend"]')) setTimeout(() => src && count(), 1200);
  });
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener)
    navigator.serviceWorker.addEventListener("message", e => {
      const d = e.data || {};
      if (d.type != "mc-notif" || !src) return;
      const it = src.items().find(x => String(x.id) == d.n);
      if (it) Promise.resolve(src.open(it)).then(refreshViews);
    });
  window.MCNotif = { tick, panel };
})();
