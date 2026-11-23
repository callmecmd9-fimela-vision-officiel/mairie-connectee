#!/usr/bin/env node
/* Génère les feuilles du mode sombre (css/*-dark.css) à partir des feuilles claires.
   Principe : chaque couleur « claire » (fonds pâles, blanc) est convertie en un fond sombre de même teinte, chaque
   texte foncé en texte clair, de façon cohérente dans toute la feuille ; les fonds moyens/foncés (bandeaux verts,
   boutons, dégradés) ne bougent pas. Tout est préfixé par html[data-theme="dark"].
   Usage : node scripts/gen-dark-theme.js          (écrit les fichiers)
           node scripts/gen-dark-theme.js --check  (échoue si les fichiers générés ne sont pas à jour) */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const PRE = 'html[data-theme="dark"] ';

/* ---------- couleurs ---------- */
function parse(v) {
  v = v.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  if (v === "white") return { r: 255, g: 255, b: 255, a: 1 };
  return null;
}
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : mx === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}
function fromHsl({ h, s, l }, a) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = n => Math.round((n + m) * 255);
  if (a !== undefined && a < 1) return `rgba(${to(r)},${to(g)},${to(b)},${+a.toFixed(2)})`;
  return "#" + [r, g, b].map(n => to(n).toString(16).padStart(2, "0")).join("");
}
const NEUTRAL_HUE = 145; /* teinte verte discrète pour les gris/blancs */
function surface(c) { /* fond clair -> fond sombre (les voiles translucides restent inchangés) */
  const t = toHsl(c);
  if (t.l < 0.72 || c.a < 0.85) return null;
  const s = t.s < 0.12 ? 0.14 : Math.min(0.42, t.s * 0.5), h = t.s < 0.12 ? NEUTRAL_HUE : t.h;
  return fromHsl({ h, s, l: 0.1 + (1 - t.l) * 0.6 }, c.a);
}
function border(c) { /* liseré clair -> liseré sombre visible */
  const t = toHsl(c);
  if (t.l < 0.7 || c.a < 0.85) return null;
  const s = t.s < 0.12 ? 0.12 : Math.min(0.35, t.s * 0.45), h = t.s < 0.12 ? NEUTRAL_HUE : t.h;
  return fromHsl({ h, s, l: 0.1 + (1 - t.l) * 0.6 + 0.12 }, c.a);
}
function text(c) { /* texte foncé -> texte clair ; texte moyen éclairci */
  const t = toHsl(c);
  if (t.l >= 0.62) return null;
  const s = t.s < 0.12 ? 0.1 : Math.min(0.6, t.s), h = t.s < 0.12 ? NEUTRAL_HUE : t.h;
  const l = t.l < 0.4 ? 0.97 - t.l * 0.7 : Math.min(0.78, t.l + 0.24);
  return fromHsl({ h, s, l }, c.a);
}

/* variables de couleur de la feuille : jamais converties dans les fonds (valeurs redéfinies dans les variables) */
const VAR_TEXT = { "var(--g)": "var(--gtx)", "var(--gd)": "var(--gtx)", "var(--ok)": "var(--okt)", "var(--red)": "var(--redt)", "var(--amb)": "var(--ambt)", "var(--g2)": "var(--gtx)" };
const COLOR_RE = /#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)|\bwhite\b/g;

function mapValue(prop, value) {
  let kind = null;
  if (/^background(-color)?$/.test(prop)) kind = surface;
  else if (prop === "color") kind = text;
  else if (/^(border|outline)(-(top|right|bottom|left))?(-color)?$/.test(prop)) kind = border;
  else return null;
  let out = value;
  if (prop === "color" && VAR_TEXT[value.trim()]) return VAR_TEXT[value.trim()];
  if (kind === border) for (const k of Object.keys(VAR_TEXT)) out = out.split(k).join("var(--gtx)");
  /* les couleurs à l'intérieur de color-mix(...) servent à calculer une teinte : on n'y touche pas */
  out = out
    .split(/(color-mix\((?:[^()]|\([^()]*\))*\))/)
    .map(part =>
      /^color-mix\(/.test(part)
        ? part
        : part.replace(COLOR_RE, m => {
            const c = parse(m);
            if (!c) return m;
            return kind(c) || m;
          })
    )
    .join("");
  return out === value ? null : out;
}

/* ---------- découpage CSS (sans dépendance) ---------- */
function strip(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ""); }
function blocks(css) { /* [{sel, body}] au premier niveau */
  const out = [];
  let i = 0;
  while (i < css.length) {
    const o = css.indexOf("{", i);
    if (o < 0) break;
    let d = 1, j = o + 1;
    while (j < css.length && d) { if (css[j] === "{") d++; else if (css[j] === "}") d--; j++; }
    out.push({ sel: css.slice(i, o).trim(), body: css.slice(o + 1, j - 1) });
    i = j;
  }
  return out;
}
function decls(body) { /* [[prop, value, important]] en respectant les parenthèses */
  const out = [];
  let cur = "", d = 0;
  for (const ch of body) {
    if (ch === "(") d++;
    if (ch === ")") d--;
    if (ch === ";" && !d) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map(x => { const k = x.indexOf(":"); return k < 0 ? null : [x.slice(0, k).trim().toLowerCase(), x.slice(k + 1).trim()]; }).filter(Boolean);
}
function ruleOut(sel, body) {
  if (/^@/.test(sel)) return "";
  const sels = sel.split(",").map(x => x.trim()).filter(x => x && x !== ":root" && x !== "html");
  const ds = [], list = decls(body);
  /* un texte posé sur un fond qui reste clair/vif (ex. bouton doré) garde sa couleur d'origine */
  const bgKept = list.some(([p, v]) => /^background(-color)?$/.test(p) && !/^(none|transparent|inherit|var\(--bg\))/.test(v.trim()) && !mapValue(p, v.replace(/\s*!important\s*$/i, "")) && /#[0-9a-fA-F]{3,6}\b|rgba?\(/.test(v.replace(/color-mix\((?:[^()]|\([^()]*\))*\)/g, "")));
  for (const [prop, raw] of list) {
    const imp = /!important\s*$/i.test(raw), val = raw.replace(/\s*!important\s*$/i, "");
    if (prop === "color" && bgKept && !/^#(fff|ffffff)$/i.test(val.trim())) continue;
    const nv = mapValue(prop, val);
    if (nv) ds.push(`${prop}:${nv}${imp ? "!important" : ""}`);
  }
  if (!ds.length || !sels.length) return "";
  return sels.map(s => PRE + s).join(",") + "{" + ds.join(";") + "}\n";
}
function convert(css) {
  let out = "";
  for (const b of blocks(strip(css))) {
    if (/^@media/.test(b.sel)) {
      if (/print/.test(b.sel)) continue;
      const inner = blocks(b.body).map(r => ruleOut(r.sel, r.body)).join("");
      if (inner) out += b.sel + "{\n" + inner + "}\n";
    } else if (!/^@/.test(b.sel)) out += ruleOut(b.sel, b.body);
  }
  return out;
}

/* ---------- variables et correctifs propres à chaque espace ---------- */
const VARS_BASE = `${PRE.trim()}{color-scheme:dark;--bg:#0c1310;--tx:#e7f0e9;--mut:#a9bab0;--ln:#2a3b31;--gtx:color-mix(in srgb,var(--g) 38%,#ffffff);--okt:#7fdba5;--redt:#ff9b91;--ambt:#f2c566;--sur:#16211b;--sur2:#1d2b23}`;
const VARS_SAAS = `${PRE}body.sa{--bg:#0c1310;--tx:#e7f0e9;--mut:#a9bab0;--ln:#2a3b31;--ln2:#3a4f43;--gb:#3a301a;--rb:#3d1f1c;--okb:#1a3326;--gtx:#7fd6a0;--sh:0 1px 2px rgba(0,0,0,.4),0 8px 22px -10px rgba(0,0,0,.5)}\n`;
const COMMUN = `
${PRE}input,${PRE}select,${PRE}textarea{background:var(--sur);color:var(--tx);border-color:#3a4f43}
${PRE}input::placeholder,${PRE}textarea::placeholder{color:#8da095}
${PRE}input:-webkit-autofill{-webkit-text-fill-color:var(--tx);box-shadow:0 0 0 40px var(--sur) inset}
${PRE}.bg,${PRE}.a3.y{color:#14231a}
${PRE}:focus-visible{outline-color:#7cb7ff}
${PRE}.mc-skip{background:var(--sur);color:var(--tx)}
${PRE}hr{border-top-color:rgba(255,255,255,.2)}
`;
const EXTRA = {
  citoyen: `
${PRE}.tp,${PRE}.mnv{background:var(--sur)}
${PRE}.nl{color:var(--tx)}
${PRE}.tn{color:var(--gtx)}
${PRE}.tn small{color:var(--tx)}
${PRE}.cd,${PRE}.tt,${PRE}.dlb{background:var(--sur)}
${PRE}.sr2{background:var(--sur2);color:var(--mut)}
${PRE}.ar{background:var(--sur2);color:var(--gtx)}
${PRE}.a3.y .ar{color:#14231a;background:#fff}
${PRE}.a3.y .ai{color:#073a1e}
${PRE}.dlx{background:var(--sur2);color:var(--gtx)}
`,
  mairie: `
${PRE}.pn,${PRE}.tbw,${PRE}.lc,${PRE}.ac{background:var(--sur)}
${PRE}.lh{background:var(--sur2)}
${PRE}.dc,${PRE}.bl,${PRE}.mb{background:var(--sur2);color:var(--tx)}
${PRE}.bl{color:var(--gtx)}
${PRE}.mb{color:var(--gtx)}
${PRE}.ap{background:var(--sur2)}
${PRE}.kb,${PRE}.kbv{color:var(--tx)}
${PRE}.mp,${PRE}.av{border-color:var(--sur)}
`,
  saas: `
${PRE}.sx-top{background:rgba(12,19,16,.88)}
${PRE}body.sa .lc,${PRE}body.sa .lh,${PRE}body.sa .pn,${PRE}.sx-nw,${PRE}.sx-tile,${PRE}.sx-bar{background:var(--sur)}
${PRE}.sx-mb,${PRE}.sx-rf{background:var(--sur2);color:var(--gtx)}
${PRE}body.sa .tb2.on{background:var(--sur2)}
${PRE}body.sa .tabs{background:#101a15}
${PRE}.sx-dot{background:var(--sur)}
${PRE}body.sa .sx-sw input::after{background:#fff}
${PRE}.sx-toast.ok{background:#0e3a22}
`
};

const APPS = [
  ["citoyen", "css/citoyen.css", VARS_BASE],
  ["mairie", "css/mairie.css", VARS_BASE],
  ["saas", "css/saas.css", VARS_BASE + "\n" + VARS_SAAS.trim()]
];
function build() {
  const files = {};
  for (const [name, src, vars] of APPS) {
    const css = fs.readFileSync(path.join(ROOT, src), "utf8");
    files[`css/${name}-dark.css`] =
      `/* GÉNÉRÉ par scripts/gen-dark-theme.js à partir de ${src} : ne pas modifier à la main. */\n${vars}\n` +
      convert(css) +
      COMMUN +
      EXTRA[name];
  }
  return files;
}
const files = build();
if (process.argv.includes("--check")) {
  let bad = 0;
  for (const [f, c] of Object.entries(files)) {
    let cur = "";
    try { cur = fs.readFileSync(path.join(ROOT, f), "utf8"); } catch (e) {}
    if (cur !== c) { console.error("obsolète : " + f); bad++; }
  }
  process.exit(bad ? 1 : 0);
}
for (const [f, c] of Object.entries(files)) {
  fs.writeFileSync(path.join(ROOT, f), c);
  console.log("écrit " + f + " (" + c.length + " octets)");
}
