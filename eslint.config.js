// Lint de non-régression : détecte les vraies erreurs (variables non définies,
// code mort évident, doublons) sans imposer de style. Fichiers tiers exclus.
const globals = require("globals");
const js = require("@eslint/js");
module.exports = [
  { ignores: ["js/leaflet.js", "js/supabase.js", "js/qr.js", "tests/**", "eslint.config.js", "supabase/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["js/**/*.js", "sw.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.browser, ...globals.serviceworker, L: "readonly", supabase: "readonly", QRCode: "readonly", module: "readonly" } },
    rules: { "no-empty": ["error", { allowEmptyCatch: true }], "no-unused-vars": "off", "no-undef": "off", "no-useless-escape": "off" },
  },
];
