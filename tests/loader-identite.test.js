/* Régressions 2026-11-22 : le loader doit se masquer (#dlg s'intercale entre #app et #ld) ; blason/bannière lus par liens signés (bucket privé). */
const assert = require("assert"), fs = require("fs");
const css = fs.readFileSync(__dirname + "/../css/citoyen.css", "utf8"), js = fs.readFileSync(__dirname + "/../js/citoyen.js", "utf8");
assert.match(css, /#app:not\(:empty\)~#ld\{display:none\}/);
assert.ok(!/#app:not\(:empty\)\+#ld/.test(css));
assert.match(js, /createSignedUrls\(/);
assert.match(js, /await signIdt\(\)/);
console.log("PASS loader-identite");
