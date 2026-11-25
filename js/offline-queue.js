/* File d'attente hors ligne : conserve les écritures Supabase qui n'ont pas pu partir (coupure réseau) et les rejoue au retour de la connexion.
   Stockage : IndexedDB (base « mc-offline-queue »), repli sur localStorage si IndexedDB est indisponible (navigation privée, etc.).
   Rejeu : par le client Supabase de la page (`sb`, défini par core.js ou citoyen.js), donc avec la session et le JWT à jour, sous les règles RLS habituelles.
   Déclencheurs : événement `online`, retour au premier plan, démarrage de la page, message du service worker (Background Sync, tag « mc-offline-queue »),
   et nouvelle tentative avec délai croissant tant que le réseau ou la session ne sont pas prêts.
   Module encapsulé : seuls `queueAction` et `offlineQueue` sont exposés sur window. Aucun autre fichier n'est modifié ni requis (sb est résolu à l'appel).

   Usage :
     queueAction({ table: "signalements", op: "insert", data: {...}, autoId: true })
     queueAction({ table: "projets", op: "update", data: { statut: "termine" }, match: { id: "..." } })
     queueAction({ table: "projets", op: "delete", match: { id: "..." } })
     queueAction({ table: "x", op: "upsert", data: {...}, onConflict: "id" })
     queueAction({ rpc: "ma_fonction", args: {...} })
   `autoId: true` (insert) ajoute un `id` uuid généré côté client : si la requête avait en fait abouti avant la coupure, le rejeu tombe sur une
   clé déjà existante (23505), traitée comme un succès, donc pas de doublon. À n'activer que si la table a une colonne `id` uuid.
   `queueAction` renvoie une promesse { queued: true, qid } (ou rejette si l'action est invalide ou si le stockage est impossible). */
(() => {
  "use strict";
  if (window.queueAction) return;
  const DB = "mc-offline-queue",
    ST = "actions",
    LS = "mc_offline_queue_v1",
    TAG = "mc-offline-queue",
    MAX = 500,
    OPS = ["insert", "update", "upsert", "delete"],
    offline = () => navigator.onLine === false,
    client = () => (typeof sb !== "undefined" && sb && sb.from ? sb : null);

  /* ---------- Stockage : IndexedDB, sinon localStorage ---------- */
  let dbp = null,
    mode = null; /* "idb" | "ls" */
  const openDb = () =>
    dbp ||
    (dbp = new Promise((ok, ko) => {
      if (!window.indexedDB) return ko(new Error("indexedDB absent"));
      let r;
      try {
        r = indexedDB.open(DB, 1);
      } catch (e) {
        return ko(e);
      }
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(ST)) r.result.createObjectStore(ST, { keyPath: "qid", autoIncrement: true });
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error || new Error("ouverture IndexedDB refusée"));
      r.onblocked = () => ko(new Error("IndexedDB bloquée"));
    }));
  const idb = (rw, fn) =>
    openDb().then(
      db =>
        new Promise((ok, ko) => {
          const t = db.transaction(ST, rw),
            q = fn(t.objectStore(ST));
          let out;
          if (q) q.onsuccess = () => (out = q.result);
          t.oncomplete = () => ok(out);
          t.onerror = t.onabort = () => ko(t.error || new Error("transaction IndexedDB échouée"));
        })
    );
  const lsRead = () => {
    try {
      const o = JSON.parse(localStorage.getItem(LS) || "null");
      return o && Array.isArray(o.items) ? o : { seq: 0, items: [] };
    } catch (e) {
      return { seq: 0, items: [] };
    }
  };
  const lsWrite = o => localStorage.setItem(LS, JSON.stringify(o)); /* peut lever (quota) : l'appelant rejette */
  const store = {
    async init() {
      if (mode) return;
      try {
        await openDb();
        mode = "idb";
      } catch (e) {
        mode = "ls";
      }
    },
    async all() {
      await this.init();
      if (mode == "idb") return (await idb("readonly", s => s.getAll())) || [];
      return lsRead().items;
    },
    async add(rec) {
      await this.init();
      if (mode == "idb") return idb("readwrite", s => s.add(rec));
      const o = lsRead();
      rec.qid = ++o.seq;
      o.items.push(rec);
      lsWrite(o);
      return rec.qid;
    },
    async put(rec) {
      await this.init();
      if (mode == "idb") return idb("readwrite", s => s.put(rec));
      const o = lsRead();
      o.items = o.items.map(x => (x.qid == rec.qid ? rec : x));
      lsWrite(o);
    },
    async del(qid) {
      await this.init();
      if (mode == "idb") return idb("readwrite", s => s.delete(qid));
      const o = lsRead();
      o.items = o.items.filter(x => x.qid != qid);
      lsWrite(o);
    }
  };

  /* ---------- Utilitaires ---------- */
  const uuid = () =>
    typeof crypto != "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          return (c == "x" ? r : (r & 3) | 8).toString(16);
        });
  const isObj = x => x && typeof x == "object" && !Array.isArray(x);
  const curUid = async c => {
    try {
      const r = await c.auth.getSession();
      return (r && r.data && r.data.session && r.data.session.user && r.data.session.user.id) || null;
    } catch (e) {
      return null;
    }
  };
  const info = async () => {
    const a = await store.all();
    return { pending: a.filter(x => !x.failed).length, failed: a.filter(x => x.failed).length };
  };
  const notify = async () => {
    try {
      window.dispatchEvent(new CustomEvent("offline-queue", { detail: await info() }));
    } catch (e) {}
  };
  const syncReg = () => {
    try {
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.ready.then(r => r.sync && r.sync.register(TAG)).catch(() => {});
    } catch (e) {}
  };

  /* ---------- Ajout à la file ---------- */
  function valider(a) {
    if (!isObj(a)) throw new Error("queueAction : objet attendu.");
    if (a.rpc !== undefined) {
      if (typeof a.rpc != "string" || !/^[a-z_][a-z0-9_]*$/i.test(a.rpc)) throw new Error("queueAction : nom de fonction (rpc) invalide.");
      if (a.args !== undefined && !isObj(a.args)) throw new Error("queueAction : args doit être un objet.");
      return { rpc: a.rpc, args: a.args || {} };
    }
    if (typeof a.table != "string" || !/^[a-z_][a-z0-9_]*$/i.test(a.table)) throw new Error("queueAction : table invalide.");
    if (!OPS.includes(a.op)) throw new Error("queueAction : op doit être " + OPS.join(", ") + ".");
    const o = { table: a.table, op: a.op };
    if (a.op != "delete") {
      if (!(isObj(a.data) || (Array.isArray(a.data) && a.data.length && a.data.every(isObj)))) throw new Error("queueAction : data (objet ou tableau d’objets) requis.");
      o.data = JSON.parse(JSON.stringify(a.data));
    }
    if (a.op == "update" || a.op == "delete") {
      if (!isObj(a.match) || !Object.keys(a.match).length) throw new Error("queueAction : match (filtre égalité) obligatoire pour update/delete.");
      o.match = JSON.parse(JSON.stringify(a.match));
    }
    if (a.op == "upsert" && a.onConflict) o.onConflict = String(a.onConflict);
    if (a.autoId === true) {
      if (a.op != "insert") throw new Error("queueAction : autoId ne s’applique qu’à insert.");
      (Array.isArray(o.data) ? o.data : [o.data]).forEach(d => {
        if (d.id === undefined) d.id = uuid();
      });
      o.autoId = true;
    }
    return o;
  }

  async function queueAction(actionData) {
    const o = valider(actionData);
    if ((await info()).pending >= MAX) throw new Error("File hors ligne pleine (" + MAX + " actions) : reconnectez-vous pour la vider.");
    const c = client(),
      uid = c
        ? await Promise.race([curUid(c), new Promise(r => setTimeout(() => r(null), 3000))])
        : null; /* compte propriétaire : le rejeu n'a lieu que sous la même session */
    o.uid = uid;
    o.at = new Date().toISOString();
    const qid = await store.add(o);
    notify();
    syncReg();
    if (!offline()) setTimeout(flush, 0); /* navigator.onLine peut mentir : on tente tout de suite, le délai croissant prend le relais */
    return { queued: true, qid };
  }

  /* ---------- Rejeu ---------- */
  const run = (c, a) => {
    if (a.rpc) return c.rpc(a.rpc, a.args || {});
    let q = c.from(a.table);
    if (a.op == "insert") q = q.insert(a.data);
    else if (a.op == "upsert") q = q.upsert(a.data, a.onConflict ? { onConflict: a.onConflict } : undefined);
    else if (a.op == "update") q = q.update(a.data);
    else q = q.delete();
    if (a.op == "update" || a.op == "delete") for (const k in a.match) q = q.eq(k, a.match[k]);
    return q;
  };
  /* ok : appliquée · auth : JWT à renouveler · retry : réseau/serveur, on garde · fail : refus définitif (RLS, contrainte…), mise à part */
  const classer = (r, a) => {
    const e = r && r.error;
    if (!e) return "ok";
    const s = (r.status | 0) || 0,
      code = String(e.code || "");
    if (a.autoId && code == "23505") return "ok";
    if (s == 401 || code == "PGRST301" || /jwt/i.test(e.message || "")) return "auth";
    if (s == 0 || s == 408 || s == 429 || s >= 500) return "retry";
    return "fail";
  };

  let cur = null,
    timer = null,
    tries = 0;
  const planifier = () => {
    clearTimeout(timer);
    if (tries >= 8) return; /* ensuite : online, retour au premier plan ou prochaine ouverture */
    timer = setTimeout(flush, Math.min(60000, 2000 * 2 ** tries++));
  };

  async function vider() {
    if (offline()) return false;
    const c = client();
    if (!c) return false;
    const items = (await store.all()).filter(x => !x.failed).sort((a, b) => a.qid - b.qid);
    if (!items.length) return true;
    const uid = await curUid(c);
    if (!uid) {
      planifier();
      return false; /* pas de session : toute requête échouerait en RLS, on attend la connexion */
    }
    let refreshed = false,
      stop = false;
    for (const it of items) {
      if (it.uid && it.uid !== uid) continue; /* action d'un autre compte : jamais rejouée sous cette session */
      for (let essai = 0; essai < 2; essai++) {
        let r;
        try {
          r = await run(c, it);
        } catch (e) {
          r = { error: { message: String((e && e.message) || e) }, status: 0 };
        }
        const k = classer(r, it);
        if (k == "ok") {
          await store.del(it.qid);
          tries = 0;
          break;
        }
        if (k == "auth" && !refreshed) {
          refreshed = true;
          const rr = await c.auth.refreshSession().catch(() => ({ error: 1 }));
          if (!rr || !rr.error) continue; /* un seul nouvel essai avec le JWT renouvelé */
        }
        if (k == "fail") {
          it.failed = true;
          it.err = String((r.error && (r.error.message || r.error.code)) || "refusée").slice(0, 300);
          await store.put(it);
        } else stop = true; /* réseau, serveur ou session : on garde cette action et les suivantes (ordre conservé) */
        break;
      }
      if (stop) break;
    }
    await notify();
    if (stop) {
      planifier();
      return false;
    }
    return (await info()).pending == 0;
  }

  const flush = () => {
    if (cur) return cur;
    const go = () =>
      vider()
        .catch(() => {
          planifier();
          return false;
        })
        .finally(() => {
          cur = null;
        });
    /* un seul onglet vide la file à la fois ; l'id client (autoId) protège des doublons si le verrou n'existe pas */
    cur = navigator.locks
      ? navigator.locks.request("mc-offline-queue-flush", { ifAvailable: true }, l => (l ? go() : false)).finally(() => {
          cur = null;
        })
      : go();
    return cur;
  };

  /* ---------- Déclencheurs ---------- */
  window.addEventListener("online", () => {
    tries = 0;
    flush();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) flush();
  });
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.addEventListener("message", e => {
      if (!e.data || e.data.type != "mc-flush-queue") return;
      tries = 0;
      flush().then(done => e.ports && e.ports[0] && e.ports[0].postMessage({ done: !!done }));
    });
  setTimeout(flush, 3000); /* démarrage : laisse à core.js / citoyen.js le temps de créer sb et de restaurer la session */

  window.queueAction = queueAction;
  window.offlineQueue = {
    flush,
    info,
    list: () => store.all(),
    /* actions refusées définitivement : les relancer (retryFailed) ou les abandonner (discard) */
    retryFailed: async () => {
      for (const x of await store.all()) if (x.failed) await store.put(Object.assign(x, { failed: false, err: "" }));
      tries = 0;
      return flush();
    },
    discard: async qid => {
      await store.del(qid);
      notify();
    }
  };
})();
