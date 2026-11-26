/* communes-geo.js — LOT A : socle géographique des communes (Leaflet / carte 3D).
 * Global : window.COMMUNES_GEO, indexé par slug. maxBounds au format Leaflet [[sud, ouest], [nord, est]].
 * Les coordonnées des localités sont APPROXIMATIVES (approx:true) : à affiner sur le terrain. Aucun contour officiel. */
(function (root) {
  "use strict";
  var COMMUNES_GEO = {
    fimela: {
      nom: "Fimela",
      aliases: [],
      center: [14.133, -16.659],
      zoom: 11,
      bbox: { south: 14.033, west: -16.759, north: 14.233, east: -16.559 },
      maxBounds: [
        [13.983, -16.809],
        [14.283, -16.509]
      ],
      localites: [
        { nom: "Samba Dia", type: "village", lat: 14.08, lng: -16.7, approx: true },
        { nom: "Ndangane", type: "village", lat: 14.1, lng: -16.68, approx: true },
        { nom: "Mar Lodj", type: "village", lat: 14.15, lng: -16.63, approx: true },
        { nom: "Djilor", type: "village", lat: 14.07, lng: -16.62, approx: true },
        { nom: "Mbissel", type: "village", lat: 14.19, lng: -16.7, approx: true },
        { nom: "Ndiédieng", type: "village", lat: 14.12, lng: -16.59, approx: true }
      ]
    },
    diofior: {
      nom: "Diofior",
      aliases: ["commune-de-diofior"],
      center: [14.189, -16.661],
      zoom: 13,
      bbox: { south: 14.139, west: -16.711, north: 14.239, east: -16.611 },
      maxBounds: [
        [14.089, -16.761],
        [14.289, -16.561]
      ],
      localites: [
        { nom: "Darou", type: "quartier", lat: 14.195, lng: -16.668, approx: true },
        { nom: "Médina", type: "quartier", lat: 14.186, lng: -16.655, approx: true },
        { nom: "Marché central", type: "quartier", lat: 14.189, lng: -16.661, approx: true }
      ]
    },
    djilass: {
      nom: "Djilass",
      aliases: [],
      center: [14.25, -16.633],
      zoom: 12,
      bbox: { south: 14.19, west: -16.693, north: 14.31, east: -16.573 },
      maxBounds: [
        [14.14, -16.743],
        [14.36, -16.523]
      ],
      localites: [
        { nom: "Boyard Tock", type: "village", lat: 14.27, lng: -16.61, approx: true },
        { nom: "Loul Sessène", type: "village", lat: 14.23, lng: -16.655, approx: true }
      ]
    },
    fatick: {
      nom: "Fatick",
      aliases: [],
      center: [14.316, -16.416],
      zoom: 12,
      bbox: { south: 14.236, west: -16.496, north: 14.396, east: -16.336 },
      maxBounds: [
        [14.186, -16.546],
        [14.446, -16.286]
      ],
      localites: [
        { nom: "Escale", type: "quartier", lat: 14.335, lng: -16.4, approx: true },
        { nom: "Ndiaye-Ndiaye", type: "quartier", lat: 14.32, lng: -16.43, approx: true },
        { nom: "Peulga", type: "quartier", lat: 14.3, lng: -16.405, approx: true },
        { nom: "Logandème", type: "quartier", lat: 14.305, lng: -16.44, approx: true },
        { nom: "Pont sur le Sine", type: "quartier", lat: 14.34, lng: -16.385, approx: true }
      ]
    },
    djirnda: {
      nom: "Djirnda",
      aliases: [],
      center: [13.981, -16.608],
      zoom: 12,
      bbox: { south: 13.911, west: -16.678, north: 14.051, east: -16.538 },
      maxBounds: [
        [13.861, -16.728],
        [14.101, -16.488]
      ],
      localites: [
        { nom: "Bassoul", type: "île", lat: 13.93, lng: -16.64, approx: true },
        { nom: "Moundé", type: "île", lat: 13.96, lng: -16.59, approx: true },
        { nom: "Baout", type: "île", lat: 13.995, lng: -16.575, approx: true },
        { nom: "Falia", type: "île", lat: 14.01, lng: -16.62, approx: true },
        { nom: "Ngadior", type: "île", lat: 13.975, lng: -16.625, approx: true }
      ]
    }
  };

  // Résolution tolérante : slug exact ou alias (ex. « commune-de-diofior » → « diofior »).
  function get(slug) {
    var s = String(slug || "")
      .toLowerCase()
      .trim();
    if (COMMUNES_GEO[s]) return COMMUNES_GEO[s];
    for (var k in COMMUNES_GEO) if (COMMUNES_GEO[k].aliases.indexOf(s) !== -1) return COMMUNES_GEO[k];
    return null;
  }
  COMMUNES_GEO.get = get;
  Object.defineProperty(COMMUNES_GEO, "get", { enumerable: false });
  root.COMMUNES_GEO = COMMUNES_GEO;
})(typeof window !== "undefined" ? window : globalThis);
