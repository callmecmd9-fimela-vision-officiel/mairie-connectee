// Conformité données personnelles : consentement explicite avant tout dépôt (case non pré-cochée, lien confidentialité, refus = aucun envoi). node tests/citoyen-consentement.test.js
const fs = require("fs"),
  path = require("path");
let JSDOM;
try {
  ({ JSDOM } = require("jsdom"));
} catch (e) {
  console.log("SKIP: jsdom absent");
  process.exit(0);
}
let f = 0;
const ok = (n, c) => {
  console.log(c ? "OK  " : "FAIL", n);
  if (!c) f++;
};
const src = fs.readFileSync(path.join(__dirname, "..", "js", "citoyen.js"), "utf8").replace(/const SMS_ON\s*=\s*true;/, "const SMS_ON=false;");

async function boot({ user = true, consentError = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      runScripts: "outside-only",
      url: "https://m.x/",
      pretendToBeVisual: true
    }),
    w = dom.window,
    rpcs = [],
    log = [];
  w.localStorage.setItem("mc_co", "fimela");
  const from = t => {
    const b = {
      select: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () => b,
      eq: () => b,
      update: () => b,
      then: (r, j) => Promise.resolve({ data: t == "citoyens" ? { prenom: "Awa", nom: "Diop" } : [], error: null }).then(r, j)
    };
    return b;
  };
  const sb = {
    auth: {
      getSession: async () => ({ data: { session: user ? { user: { id: "u1", phone: "221771234567" } } : null } }),
      signOut: async () => log.push("out"),
      signInAnonymously: async () => {
        log.push("anon");
        return {};
      }
    },
    from,
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
    rpc: async (n, a) => {
      rpcs.push([n, a]);
      if (n == "commune_par_slug") return { data: [{ id: "cid1", slug: "fimela", nom: "Fimela" }] };
      if (n == "infos_commune") return { data: [{ nom: "Fimela" }] };
      if (n == "enregistrer_consentement") return consentError ? { error: { message: "x" } } : { data: "c1" };
      if (n == "creer_demande") return { data: "FIM-0001-NEW00000" };
      return { data: [] };
    }
  };
  w.supabase = { createClient: () => sb };
  w.scrollTo = () => {};
  w.eval(src);
  await new Promise(r => setTimeout(r, 80));
  const $ = s => w.document.querySelector(s),
    click = async s => {
      $(s).dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
      await new Promise(r => setTimeout(r, 80));
    };
  return { w, $, click, rpcs, log, txt: () => w.document.body.textContent };
}
const fill = t => {
  t.$("#fo").value = "Objet";
  t.$("#fm").value = "Bonjour";
  if (t.$("#fn")) t.$("#fn").value = "Moussa Ndiaye";
  if (t.$("#ft")) t.$("#ft").value = "77 123 45 67";
};
const deposes = t => t.rpcs.filter(x => x[0] == "creer_demande").length;

(async () => {
  // Connecté : la case est présente, NON pré-cochée, avec le lien vers la politique de confidentialité.
  let t = await boot();
  await t.click('[data-a="cat"][data-c="Sport, culture et associations"]');
  const cb = t.$("#fcons");
  ok("formulaire : case de consentement présente", !!cb && cb.type == "checkbox");
  ok("formulaire : case NON pré-cochée", cb && cb.checked === false && !cb.hasAttribute("checked"));
  const lk = t.$('a[href="/confidentialite.html"]');
  ok("formulaire : lien vers confidentialite.html (nouvel onglet, noopener)", !!lk && lk.target == "_blank" && /noopener/.test(lk.rel));

  // Refus (case décochée) : aucun dépôt, aucun consentement « accordé », message affiché, case toujours décochée.
  fill(t);
  await t.click('[data-a="send"]');
  ok("refus : aucun dépôt (creer_demande non appelée)", deposes(t) == 0);
  ok(
    "refus : aucun consentement « accordé » enregistré",
    !t.rpcs.some(x => x[0] == "enregistrer_consentement" && x[1].p_accorde === true)
  );
  ok("refus : refus tracé pour un compte connecté (accorde=false)", t.rpcs.some(x => x[0] == "enregistrer_consentement" && x[1].p_accorde === false));
  ok("refus : message explicite affiché", /vous devez accepter l’utilisation de vos données/.test(t.txt()));
  ok("refus : la case reste décochée après réaffichage", t.$("#fcons") && t.$("#fcons").checked === false);

  // Acceptation : consentement enregistré (finalité, version) AVANT le dépôt.
  t.$("#fcons").checked = true;
  fill(t);
  await t.click('[data-a="send"]');
  const names = t.rpcs.map(x => x[0]),
    ci = names.lastIndexOf("enregistrer_consentement"),
    cd = names.indexOf("creer_demande");
  ok("acceptation : consentement enregistré puis demande créée", cd > -1 && ci > -1 && ci < cd);
  const c = t.rpcs[ci][1];
  ok("acceptation : commune (slug), finalité, version, accorde=true", c.p_commune == "fimela" && c.p_finalite == "depot_demande" && /^\d{4}-\d{2}-\d{2}$/.test(c.p_version) && c.p_accorde === true);

  // Sans compte : le refus ne crée même pas de session anonyme.
  t = await boot({ user: false });
  await t.click('[data-a="cat"][data-c="Sport, culture et associations"]');
  ok("sans compte : case présente et non pré-cochée", t.$("#fcons") && t.$("#fcons").checked === false);
  fill(t);
  await t.click('[data-a="send"]');
  ok(
    "sans compte : refus = aucune session anonyme, aucun appel serveur de dépôt ni de consentement",
    deposes(t) == 0 && !t.log.includes("anon") && !t.rpcs.some(x => x[0] == "enregistrer_consentement")
  );

  // Consentement non enregistrable : pas de dépôt (échec fermé).
  t = await boot({ consentError: true });
  await t.click('[data-a="cat"][data-c="Sport, culture et associations"]');
  t.$("#fcons").checked = true;
  fill(t);
  await t.click('[data-a="send"]');
  ok("consentement non enregistré : demande non créée, message clair", deposes(t) == 0 && /consentement n’a pas pu être enregistré/.test(t.txt()));

  console.log(f ? "ECHECS: " + f : "TOUS OK");
  process.exit(f ? 1 : 0);
})();
