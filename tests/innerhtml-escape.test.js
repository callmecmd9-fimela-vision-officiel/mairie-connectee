// Garde-fou XSS (statique) : une donnée saisie par un utilisateur (nom, titre, message…) ne doit jamais être
// insérée dans un gabarit HTML sans esc(). Heuristique : dans tout gabarit `...` qui contient du HTML, une
// interpolation ${...} qui est un simple accès à un champ de texte libre (x.titre, r.nom||"", …) est refusée.
// Les ids, nombres, libellés fixes et sous-gabarits ne sont pas concernés. Lancer : node tests/innerhtml-escape.test.js
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const JS = path.join(__dirname, "..", "js");
const SKIP = new Set(["supabase.js", "leaflet.js", "qr.js", "smoke.js"]);
const FREE = ["nom", "prenom", "titre", "description", "objet", "message", "commentaire", "motif", "libelle", "contenu", "corps",
  "adresse", "email", "telephone", "tel", "observation", "observations", "note", "notes", "resume", "texte", "intitule",
  "slogan", "reference", "commune", "lieu", "organisateur", "detail", "details", "reponse", "raison", "nom_complet", "poste", "service"];
const BARE = new RegExp("^[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*|\\[[^\\]]+\\])*\\s*(?:(?:\\|\\||\\?\\?)\\s*(?:\"\"|''))?$");

function templates(s) {
  const n = s.length, out = [];
  function tpl(i) {
    let j = i + 1; const parts = [];
    while (j < n) {
      const c = s[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "`") return [j + 1, parts];
      if (c === "$" && s[j + 1] === "{") {
        let k = j + 2, d = 1; const st = k;
        while (k < n && d) {
          const c2 = s[k];
          if (c2 === "'" || c2 === '"') { const q = c2; k++; while (k < n && s[k] !== q) { if (s[k] === "\\") k++; k++; } }
          else if (c2 === "`") { k = tpl(k)[0]; continue; }
          else if (c2 === "{") d++; else if (c2 === "}") d--;
          k++;
        }
        parts.push([s.slice(st, k - 1), j]); j = k; continue;
      }
      j++;
    }
    return [n, parts];
  }
  let i = 0;
  while (i < n) {
    const c = s[i];
    if (c === "/" && s[i + 1] === "/") { i = s.indexOf("\n", i); if (i < 0) i = n; continue; }
    if (c === "/" && s[i + 1] === "*") { i = s.indexOf("*/", i) + 2; continue; }
    if (c === "'" || c === '"') { const q = c; i++; while (i < n && s[i] !== q) { if (s[i] === "\\") i++; i++; } i++; continue; }
    if (c === "`") { const [e, p] = tpl(i); out.push([i, e, p]); i = e; continue; }
    i++;
  }
  return out;
}

const bad = [];
let scanned = 0;
for (const f of fs.readdirSync(JS).sort()) {
  if (!f.endsWith(".js") || f.endsWith(".test.js") || SKIP.has(f)) continue;
  const s = fs.readFileSync(path.join(JS, f), "utf8");
  for (const [a, b, parts] of templates(s)) {
    if (!s.slice(a, b).includes("<")) continue;
    for (const [ex, pos] of parts) {
      scanned++;
      const e = ex.trim();
      if (!BARE.test(e)) continue;
      const last = e.replace(/\s*(?:\|\||\?\?).*$/, "").split(".").pop().replace(/\[.*$/, "");
      if (FREE.includes(last)) bad.push(`${f}:${s.slice(0, pos).split("\n").length}  \${${e}}`);
    }
  }
}
assert.ok(scanned > 500, "le scanner doit analyser les gabarits HTML (" + scanned + ")");
assert.deepEqual(bad, [], "champ de texte libre inséré sans esc() :\n" + bad.join("\n"));

// Contrôle négatif : le scanner doit détecter une injection simulée.
const probe = templates("const h=x=>`<b>${x.titre}</b>`;").flatMap(t => t[2]).filter(([ex]) => BARE.test(ex.trim()) && FREE.includes(ex.trim().split(".").pop()));
assert.equal(probe.length, 1, "contrôle négatif : ${x.titre} non détecté");
console.log(`OK   aucune donnée de texte libre insérée sans esc() (${scanned} interpolations HTML analysées)`);
