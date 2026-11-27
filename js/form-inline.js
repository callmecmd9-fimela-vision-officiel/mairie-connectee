/* Formulaires et détails ouverts à l'endroit cliqué (mairie et SaaS).
   Après un clic, le bloc nouveau ou pré-rempli que l'application affiche ailleurs est déplacé sous la ligne cliquée, et y reste
   à chaque rendu tant qu'il existe. Seul le DOM est déplacé : identifiants et gestionnaires (délégués) sont inchangés. */
(function () {
  const app = document.getElementById("app");
  if (!app) return;
  const ROW = ".rw,tr,li,article";
  const NAV = '.nvb,.tb2,.ec,.tb,[data-a="go"],[data-a="tab"],[data-m="go"],[data-a="out"],[data-v^="sa_"],nav,summary';
  const blocks = () => [...app.querySelectorAll(".pn,.fr,details.sx-nw")];
  const fields = b => [...b.querySelectorAll("input:not([type=hidden]),select,textarea")];
  const title = b => ((b.querySelector("h2,h3,summary") || {}).textContent || "").trim();
  const key = b => b.tagName + "|" + b.classList[0] + "|" + (fields(b).map(f => f.id || f.name).join(",") || title(b));
  const value = f =>
    f.tagName == "SELECT" ? (f.querySelector("option[selected]") || {}).value || "" : f.tagName == "TEXTAREA" ? f.defaultValue : f.getAttribute("value") || "";
  /* un bloc sans champ (détail) ne compte que s'il apparaît ; un formulaire compte aussi si son contenu change */
  const sign = b => key(b) + (fields(b).length ? "|" + title(b) + "|" + fields(b).map(value).join("\u0001") : "");
  /* retrouve l'élément cliqué après un nouveau rendu */
  const locate = el => {
    const sel =
      el.tagName.toLowerCase() +
      [...el.attributes]
        .filter(a => a.name.startsWith("data-") && a.name != "data-sty")
        .map(a => "[" + a.name + '="' + CSS.escape(a.value) + '"]')
        .join("");
    const text = el.textContent.trim();
    const list = () => [...app.querySelectorAll(sel)].filter(x => x.textContent.trim() == text);
    const i = list().indexOf(el);
    return () => list()[i];
  };
  const spot = el => {
    let node = el.closest(ROW) || el.parentElement;
    if (node.tagName == "TR") node = node.closest("table");
    /* jamais comme case d'une grille ou d'une rangée de boutons */
    while (node.parentElement && node.parentElement != app) {
      const s = getComputedStyle(node.parentElement);
      if (s.display.includes("grid") || (s.display.includes("flex") && !s.flexDirection.startsWith("column"))) node = node.parentElement;
      else break;
    }
    return node;
  };
  let pending = null,
    held = null;
  const move = (block, el, scroll) => {
    const at = spot(el);
    if (block == at || block.contains(at) || at.contains(block)) return false;
    block.classList.add("fv-here");
    at.after(block);
    if (scroll && block.scrollIntoView) block.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
  };
  function apply() {
    if (pending) {
      const el = pending.find();
      if (!el || Date.now() > pending.until) {
        if (Date.now() > pending.until) pending = null;
      } else {
        const row = spot(el);
        let found = blocks().filter(b => {
          if (b.contains(row) || row.contains(b)) return false;
          return !pending.before.has(fields(b).length ? sign(b) : key(b));
        });
        found = found.filter(b => !found.some(o => o != b && o.contains(b)));
        /* plus de 3 blocs différents : c'est un changement d'écran, pas un formulaire */
        if (found.length && found.length <= 3) {
          const block = found.find(b => fields(b).length) || found[0];
          if (move(block, el, true)) {
            held = { key: key(block), title: title(block), find: pending.find };
            pending = null;
            return;
          }
        }
      }
    }
    if (held) {
      const el = held.find(),
        block = blocks().find(b => key(b) == held.key);
      /* titre changé (annulé, enregistré) : le formulaire reprend sa place normale */
      if (!block || title(block) != held.title) held = null;
      else if (el && !block.classList.contains("fv-here")) move(block, el, false);
    }
  }
  document.addEventListener(
    "click",
    e => {
      const el = e.target.closest && e.target.closest("button,[data-a],[data-m]");
      if (!el || !app.contains(el)) return;
      if (el.closest(NAV)) {
        pending = held = null;
        return;
      }
      /* bouton du formulaire ouvert (Enregistrer, Annuler…) : l'emplacement reste le même */
      if (el.closest(".fv-here")) return;
      const moved = app.querySelector(".fv-here");
      pending = {
        find: locate(el),
        before: new Set(
          blocks()
            .filter(b => !moved || !moved.contains(b))
            .map(b => (fields(b).length ? sign(b) : key(b)))
        ),
        until: Date.now() + 5000
      };
    },
    true
  );
  const watch = new MutationObserver(() => {
    watch.disconnect();
    try {
      apply();
    } finally {
      watch.observe(app, { childList: true, subtree: true });
    }
  });
  watch.observe(app, { childList: true, subtree: true });
})();
