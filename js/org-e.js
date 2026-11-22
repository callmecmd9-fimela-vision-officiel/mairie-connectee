/* Lot E (additif, après org-d.js) : les boutons d'écriture des écrans Paie, Rémunérations, Personnel, Congés et Marchés
   suivent aussi les droits reçus par poste ou par délégation (S.orgMy). Affichage seulement : le serveur (RLS org_droit, paie_garde) reste l'autorité.
   Principe : pendant le rendu d'un de ces écrans, un utilisateur sans rôle historique habilité est traité comme le rôle qui voit les boutons correspondants.
   Aucun effet pour maire, super-admin, rôles historiques déjà habilités, ni sans poste/délégation. */
const ORGE = {
  paie: {
    leg: ["maire", "rh", "finances"],
    r: [
      ["maire", ["signer", "rejeter"]],
      ["rh", ["creer", "modifier", "valider"]]
    ]
  },
  remun: { leg: ["maire", "rh"], r: [["rh", ["creer", "modifier"]]] },
  personnel: { leg: ["maire", "rh"], r: [["rh", ["creer", "modifier"]]] },
  conges: { leg: ["maire", "rh"], r: [["rh", ["creer", "modifier", "valider", "supprimer"]]] },
  marches: { leg: ["maire", "finances"], r: [["finances", ["creer", "modifier"]]] }
};
const orgeRole = k => {
  const c = ORGE[k];
  if (!c || S.sa || !S.orgMy || c.leg.includes(S.pr)) return null;
  for (const [ro, as] of c.r) if (as.some(a => S.orgMy.has(a + "|" + k))) return ro;
  return null;
};
Object.keys(ORGE).forEach(k => {
  const f = SUB[k];
  if (typeof f != "function") return;
  SUB[k] = function () {
    const ro = orgeRole(k);
    if (!ro) return f.apply(this, arguments);
    const p = S.pr;
    S.pr = ro;
    try {
      return f.apply(this, arguments);
    } finally {
      S.pr = p;
    }
  };
});
