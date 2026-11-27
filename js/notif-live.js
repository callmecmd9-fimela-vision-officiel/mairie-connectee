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
    items = [],
    busy = false,
    again = false,
    chan = null,
    audio = null;
  const muted = () => Date.now() < (store.get("mc_nt_mute") || 0);

  function source() {
    if (typeof S == "undefined" || typeof sb == "undefined") return null;
    if (S.role == "cab" && S.uid && !S.sa) {
      const uid = S.uid;
      return {
        who: "cab:" + uid,
        app: "/mairie",
        rt: { table: "notifications", filter: "user_id=eq." + uid },
        async load() {
          const r = await sb.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(60);
          if (r.error) throw r.error;
          if (S.db && S.uid == uid) {
            S.db.nt = r.data || [];
            if (typeof majBadge == "function") majBadge();
          }
          return (r.data || []).map(n => ({ id: n.id, title: n.titre, body: n.corps || "", read: !!n.lu, link: n.lien || "" }));
        },
        open(n) {
          /* réutilise le gestionnaire « ntgo » (marque lu + navigue) ; sinon ouvre la liste */
          const before = S.view + "|" + JSON.stringify(S.tab);
          tmp({ a: "ntgo", id: n.id, l: n.link });
          setTimeout(() => {
            if (before == S.view + "|" + JSON.stringify(S.tab)) click(".tb .bl");
          }, 900);
        }
      };
    }
    if (typeof S.user == "object" && S.user && typeof loadNt == "function") {
      const uid = S.user.id;
      return {
        who: "cit:" + uid,
        app: "/" + location.search,
        rt: { table: "citoyen_notifications", filter: "user_id=eq." + uid },
        async load() {
          await loadNt();
          const b = document.querySelector(".tm");
          if (b && typeof btl == "function") b.textContent = btl();
          return (S.nt || []).map(n => ({ id: n.id, title: n.titre, body: n.corps || "", read: !!n.lu, raw: n }));
        },
        open(n) {
          const num = typeof nnum == "function" ? nnum(n.raw) : "";
          if (num) tmp({ a: "nopen", i: n.id, n: num });
          else tmp({ a: "esp" });
        }
      };
    }
    if (S.st == "app" && "me" in S) {
      return {
        who: "saas:" + S.me,
        app: "/saas",
        async load() {
          const r = await sb.from("platform_audit").select("id,action,email,created_at").order("created_at", { ascending: false }).limit(30);
          if (r.error) throw r.error;
          const read = store.get("mc_nt_read_saas:" + S.me) || 0;
          /* ses propres actions ne le notifient pas */
          return (r.data || [])
            .filter(a => a.email != S.me)
            .map(a => ({
              id: a.id,
              title: (typeof AL != "undefined" && AL[a.action]) || a.action,
              body: a.email || "",
              read: +a.id <= read
            }));
        },
        open(n) {
          store.set("mc_nt_read_saas:" + S.me, Math.max(+n.id, store.get("mc_nt_read_saas:" + S.me) || 0));
          if (!click('[data-v="audit"]')) {
            S.v = "audit";
            render();
          }
          count();
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
    const n = items.filter(x => !x.read).length;
    document.title = n ? "(" + (n > 99 ? "99+" : n) + ") " + BASE : BASE;
    try {
      if (navigator.setAppBadge) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    } catch (e) {}
  }
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
      go = () => s.open(fresh[0]);
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
    items = [];
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
      src = s;
      const list = await s.load();
      if (who != s.who) return;
      items = list;
      const known = seen || new Set(store.get("mc_nt_seen_" + who) || []),
        fresh = list.filter(x => !x.read && !known.has(String(x.id)));
      const first = !seen;
      seen = new Set([...known, ...list.map(x => String(x.id))]);
      store.set("mc_nt_seen_" + who, [...seen].slice(-300));
      count();
      announce(fresh, first);
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
  /* mise à jour du compteur après lecture dans la page */
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest('[data-a="ntall"],[data-a="ntgo"],[data-a="nrd"],[data-a="nopen"]')) setTimeout(tick, 1200);
  });
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener)
    navigator.serviceWorker.addEventListener("message", e => {
      const d = e.data || {};
      if (d.type != "mc-notif" || !src) return;
      const it = items.find(x => String(x.id) == d.n);
      if (it) src.open(it);
    });
  window.MCNotif = { tick };
})();
