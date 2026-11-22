// Aide de test : ramène un source JS (formaté ou compact) à une forme compacte stable, pour que les tests qui lisent le code
// par expressions régulières ne dépendent pas de la mise en forme (Prettier). Chaînes, gabarits (texte) et expressions
// régulières sont conservés tels quels ; commentaires supprimés ; espaces hors littéraux supprimés autour de la ponctuation ;
// point-virgule avant « } » et virgule finale supprimés.
const fs = require("node:fs"), path = require("node:path");
const PUNCT = new Set("{}()[];,:=<>+-*/%?!&|^~.".split(""));
const isWord = c => /[\w$]/.test(c || "");
function compact(src) {
  const n = src.length; let i = 0, out = "";
  const push = s => { out += s; };
  function lastSig() { for (let k = out.length - 1; k >= 0; k--) if (!/\s/.test(out[k])) return out[k]; return ""; }
  function ws() { // espace(s) : conserver un seul espace seulement entre deux mots
    let j = i; while (j < n && /\s/.test(src[j])) j++;
    const a = out[out.length - 1], b = src[j];
    i = j; if (a !== undefined && b !== undefined && isWord(a) && isWord(b)) push(" ");
    else if (a !== undefined && b !== undefined && !PUNCT.has(a) && !PUNCT.has(b) && !isWord(a) && !isWord(b) && a !== " ") push(" ");
  }
  function str(q) { let j = i + 1; while (j < n && src[j] !== q) { if (src[j] === "\\") j++; j++; } push(src.slice(i, j + 1)); i = j + 1; }
  function skipStr(j) { const q = src[j]; j++; while (j < n && src[j] !== q) { if (src[j] === "\\") j++; j++; } return j + 1; }
  function skipTpl(j) { // j sur la backtick ouvrante ; renvoie l'index après la backtick fermante
    j++;
    while (j < n && src[j] !== "`") {
      if (src[j] === "\\") { j += 2; continue; }
      if (src[j] === "$" && src[j + 1] === "{") { j = skipExpr(j + 2) + 1; continue; }
      j++;
    }
    return j + 1;
  }
  function skipExpr(j) { // j après « ${ » ; renvoie l'index de la « } » fermante
    let d = 1;
    while (j < n) {
      const c = src[j];
      if (c === '"' || c === "'") { j = skipStr(j); continue; }
      if (c === "`") { j = skipTpl(j); continue; }
      if (c === "/" && src[j + 1] === "/") { const e = src.indexOf("\n", j); j = e < 0 ? n : e; continue; }
      if (c === "/" && src[j + 1] === "*") { const e = src.indexOf("*/", j + 2); j = e < 0 ? n : e + 2; continue; }
      if (c === "{") d++; else if (c === "}") { d--; if (!d) return j; }
      j++;
    }
    return n;
  }
  function tpl() {
    push("`"); i++;
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") { push(src.slice(i, i + 2)); i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") {
        const e = skipExpr(i + 2);
        push("${" + compact(src.slice(i + 2, e)) + "}"); i = e + 1; continue;
      }
      push(src[i]); i++;
    }
    push("`"); i++;
  }
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { ws(); continue; }
    if (c === "/" && src[i + 1] === "/") { const e = src.indexOf("\n", i); i = e < 0 ? n : e; continue; }
    if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") { str(c); continue; }
    if (c === "`") { tpl(); continue; }
    if (c === "/") { const p = lastSig(); if (p === "" || "(,=:[!&|?{};".includes(p) || /return$|typeof$/.test(out.slice(-6))) { let j = i + 1, cls = false; while (j < n) { if (src[j] === "\\") j++; else if (src[j] === "[") cls = true; else if (src[j] === "]") cls = false; else if (src[j] === "/" && !cls) break; j++; } j++; while (/[a-z]/i.test(src[j] || "")) j++; push(src.slice(i, j)); i = j; continue; } }
    push(c); i++;
  }
  return out.replace(/;}/g, "}").replace(/,([}\])])/g, "$1");
}
const readCompact = f => compact(fs.readFileSync(f, "utf8"));
module.exports = { compact, readCompact };
