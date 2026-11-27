/* QR Code local (aucun service externe, aucune CDN) : mode octet UTF-8, correction d'erreur M, versions 1 à 10 (jusqu'à 213 octets), masque 0.
   window.qrSvg(texte, { size: 130, label: "…" }) → chaîne <svg> prête à insérer (images data: / CSP img-src inutiles). Lève une erreur si le texte est trop long. */
(() => {
  "use strict";
  if (window.qrSvg) return;
  const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    BLK = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const raw = v => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  };
  const mul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  };
  const rsDiv = d => {
    const r = [];
    for (let i = 0; i < d - 1; i++) r.push(0);
    r.push(1);
    let root = 1;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < r.length; j++) {
        r[j] = mul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = mul(root, 2);
    }
    return r;
  };
  const rsRem = (data, div) => {
    const r = div.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => (r[i] ^= mul(c, f)));
    }
    return r;
  };
  const utf8 = s => Array.from(unescape(encodeURIComponent(s)), c => c.charCodeAt(0));
  function matrix(text) {
    const b = utf8(String(text));
    let v = 1;
    while (v <= 10 && 4 + (v < 10 ? 8 : 16) + 8 * b.length > 8 * (Math.floor(raw(v) / 8) - ECC[v] * BLK[v])) v++;
    if (v > 10) throw new Error("QR : texte trop long.");
    const size = 4 * v + 17,
      cap = Math.floor(raw(v) / 8) - ECC[v] * BLK[v],
      bits = [],
      put = (x, n) => {
        for (let i = n - 1; i >= 0; i--) bits.push((x >>> i) & 1);
      };
    put(4, 4);
    put(b.length, v < 10 ? 8 : 16);
    b.forEach(x => put(x, 8));
    put(0, Math.min(4, cap * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let p = 0xec; data.length < cap; p ^= 0xec ^ 0x11) data.push(p);
    /* blocs + correction d'erreur + entrelacement */
    const nb = BLK[v],
      el = ECC[v],
      rc = Math.floor(raw(v) / 8),
      ns = nb - (rc % nb),
      sl = Math.floor(rc / nb),
      div = rsDiv(el),
      blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const d = data.slice(k, k + sl - el + (i < ns ? 0 : 1));
      k += d.length;
      const e = rsRem(d, div);
      if (i < ns) d.push(0);
      blocks.push(d.concat(e));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++)
      blocks.forEach((bl, j) => {
        if (i != sl - el || j >= ns) all.push(bl[i]);
      });
    /* matrice */
    const m = [],
      fn = [];
    for (let y = 0; y < size; y++) {
      m.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    const set = (x, y, c) => {
      m[y][x] = c;
      fn[y][x] = true;
    };
    for (let i = 0; i < size; i++) {
      set(6, i, i % 2 == 0);
      set(i, 6, i % 2 == 0);
    }
    [
      [3, 3],
      [size - 4, 3],
      [3, size - 4]
    ].forEach(([cx, cy]) => {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy)),
            x = cx + dx,
            y = cy + dy;
          if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d != 2 && d != 4);
        }
    });
    if (v > 1) {
      const n = Math.floor(v / 7) + 2,
        step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2,
        pos = [6];
      for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
      pos.forEach((ax, i) =>
        pos.forEach((ay, j) => {
          if ((i == 0 && j == 0) || (i == 0 && j == n - 1) || (i == n - 1 && j == 0)) return;
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
        })
      );
    }
    const fmt = mask => {
      let r = mask;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const f = ((mask << 10) | r) ^ 0x5412,
        g = i => ((f >>> i) & 1) != 0;
      for (let i = 0; i <= 5; i++) set(8, i, g(i));
      set(8, 7, g(6));
      set(8, 8, g(7));
      set(7, 8, g(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i));
      set(8, size - 8, true);
    };
    fmt(0);
    if (v >= 7) {
      let r = v;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const f = (v << 12) | r;
      for (let i = 0; i < 18; i++) {
        const c = ((f >>> i) & 1) != 0,
          a = size - 11 + (i % 3),
          bb = Math.floor(i / 3);
        set(a, bb, c);
        set(bb, a, c);
      }
    }
    for (let i = 0, right = size - 1; right >= 1; right -= 2) {
      if (right == 6) right = 5;
      for (let vert = 0; vert < size; vert++)
        for (let j = 0; j < 2; j++) {
          const x = right - j,
            y = ((right + 1) & 2) == 0 ? size - 1 - vert : vert;
          if (!fn[y][x] && i < all.length * 8) {
            m[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) != 0;
            i++;
          }
        }
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && (x + y) % 2 == 0) m[y][x] = !m[y][x];
    fmt(0);
    return m;
  }
  window.qrSvg = (text, o) => {
    o = o || {};
    const m = matrix(text),
      n = m.length + 8,
      px = +o.size || 130,
      lab = String(o.label || "QR Code").replace(/[&<>"]/g, "");
    let d = "";
    m.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c) d += "M" + (x + 4) + " " + (y + 4) + "h1v1h-1z";
      })
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="${lab}"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  };
  window.qrMatrix = matrix;
})();
