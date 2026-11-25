/* Composants d'interface (constructeurs HTML) extraits de core.js : aucun changement de comportement.
   Chargé juste après core.js ; dépend de S, ic et esc (core.js), résolus à l'appel. */
const pn = (t, i, b, r = "") =>
  `<section class="pn"><header class="ph">${ic(i, 22)}<h2>${t}</h2>${r}</header><div class="pb">${b}</div></section>`;
const emp = m => `<p class="mut">${m}</p>`;
const tag = (t, a, i, c = "") => `<button class="tg ${c}" data-a="${a}" data-i="${i}">${esc(t)}</button>`;
const fl = (id, l, x) => `<div><label for="${id}">${l}</label>${x}</div>`;
const inp = (id, l, ty = "text", v = "", ph = "", ex = "") =>
  fl(id, l, `<input id="${id}" type="${ty}" value="${esc(v)}" placeholder="${esc(ph)}" ${ex}>`);
const sel = (id, l, o, v) =>
  fl(
    id,
    l,
    `<select id="${id}">${o
      .map(x => {
        const a = Array.isArray(x) ? x : [x, x];
        return `<option value="${esc(a[0])}"${a[0] == v ? " selected" : ""}>${esc(a[1])}</option>`;
      })
      .join("")}</select>`
  );
const frm = b => `<div class="fr">${b}</div>`;
const rw = (a, b) => `<div class="rw"><div class="rl">${a}</div><div>${b}</div></div>`;
const tabs = (g, l) =>
  `<div class="tabs">${l.map(x => `<button class="tb2${S.tab[g] == x[0] ? " on" : ""}" data-a="tab" data-g="${g}" data-v="${x[0]}">${x[1]}</button>`).join("")}</div>`;
const kp = (c, i, l, v, s) =>
  `<div class="kc ${c}"><div class="ki">${ic(i, 34)}</div><div class="kl">${l}</div><div class="kv">${v}</div>${s ? `<div class="ks">${s}</div>` : ""}</div>`;
