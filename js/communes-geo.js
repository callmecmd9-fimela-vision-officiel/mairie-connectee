/* communes-geo.js — LOT A : socle géographique des communes (Leaflet / carte 3D).
 * Global : window.COMMUNES_GEO, indexé par slug. maxBounds au format Leaflet [[sud, ouest], [nord, est]].
 * Les coordonnées des localités sont APPROXIMATIVES (approx:true) : à affiner sur le terrain. Aucun contour officiel. */
(function (root) {
  'use strict';
  var COMMUNES_GEO = {
    "fimela": {
      nom: "Fimela",
      aliases: [],
      center: [14.133, -16.659],
      zoom: 11,
      bbox: { south: 14.033, west: -16.759, north: 14.233, east: -16.559 },
      maxBounds: [[13.983, -16.809], [14.283, -16.509]],
      localites: [
        { nom: "Fimela", type: "village" },
        { nom: "Baboucar Toumbou", type: "village" },
        { nom: "Djilor", type: "village" },
        { nom: "Kobongoye", type: "village" },
        { nom: "Kobongoye 2", type: "village" },
        { nom: "Mar Fafaco", type: "village" },
        { nom: "Mar Lothie", type: "village" },
        { nom: "Mar Soulou", type: "village" },
        { nom: "Mbissel", type: "village" },
        { nom: "Ndangane village", type: "village" },
        { nom: "Ndangane campement", type: "village" },
        { nom: "Ndiédieng", type: "village" },
        { nom: "Samba Dia", type: "village" },
        { nom: "Samba Diallo", type: "village" },
        { nom: "Simal", type: "village" },
        { nom: "Yayème", type: "village" },
      ]
    },
    "joal": {
      nom: "Joal-Fadiouth",
      aliases: ["joal-fadiouth", "commune-de-joal-fadiouth"],
      center: [14.166, -16.836],
      zoom: 13,
      maxBounds: [[14.05, -16.95], [14.25, -16.72]],
      bbox: { south: 14.07, west: -16.93, north: 14.23, east: -16.74 },
      localites: [
        { nom: "Caritas", type: "quartier" },
        { nom: "Santhie I", type: "quartier" },
        { nom: "Santhie II", type: "quartier" },
        { nom: "Santhie III", type: "quartier" },
        { nom: "Santhie Château d'Eau", type: "quartier" },
        { nom: "Santhie II Ibou Faye", type: "quartier" },
        { nom: "Ndoubab", type: "quartier" },
        { nom: "Mansour Diokh-Santhie", type: "quartier" },
        { nom: "Afdaye Diamaguène", type: "quartier" },
        { nom: "Ndionguème", type: "quartier Fadiouth I" },
        { nom: "Fassar", type: "quartier Fadiouth I" },
        { nom: "Ndoffène", type: "quartier Fadiouth I" },
        { nom: "Ndioum", type: "quartier Fadiouth II" },
        { nom: "Ndiandiaye", type: "quartier Fadiouth II" },
        { nom: "Ngor Ndeb", type: "quartier Fadiouth II" },
        { nom: "Ngazobil", type: "village" },
      ]
    },
    "diofior": {
      nom: "Diofior",
      aliases: ["commune-de-diofior"],
      center: [14.189, -16.661],
      zoom: 13,
      bbox: { south: 14.139, west: -16.711, north: 14.239, east: -16.611 },
      maxBounds: [[14.089, -16.761], [14.289, -16.561]],
      localites: [
        { nom: "Diongfa", type: "grand quartier" },
        { nom: "Sindianeka", type: "grand quartier" },
        { nom: "Centre", type: "quartier" },
        { nom: "Ndouck", type: "quartier" },
        { nom: "Garage", type: "quartier" },
        { nom: "Forage", type: "quartier" },
        { nom: "Diamaguène", type: "quartier" },
        { nom: "Nimzat", type: "quartier" },
        { nom: "HLM", type: "quartier" },
        { nom: "Almadle", type: "quartier" },
        { nom: "Médina", type: "quartier" },
        { nom: "Darou", type: "quartier" },
        { nom: "Sicap", type: "quartier" },
        { nom: "Cité", type: "quartier" },
      ]
    },
    "djilass": {
      nom: "Djilass",
      aliases: [],
      center: [14.25, -16.633],
      zoom: 12,
      bbox: { south: 14.19, west: -16.693, north: 14.31, east: -16.573 },
      maxBounds: [[14.14, -16.743], [14.36, -16.523]],
      localites: [
        { nom: "Djilasse", type: "chef-lieu" },
        { nom: "Faoye", type: "village" },
        { nom: "Ndimbinding", type: "village" },
        { nom: "Keur Ngor Sarr", type: "hameau" },
        { nom: "Ngarigne", type: "village" },
        { nom: "Roh", type: "village" },
        { nom: "Sorobougou", type: "village" },
        { nom: "Ngarigne Peulh", type: "hameau" },
        { nom: "Ngarigne Nandokh", type: "hameau" },
        { nom: "Soudiane Balla", type: "village" },
        { nom: "Soudiane Thiélème", type: "village" },
        { nom: "Vélingara", type: "hameau" },
        { nom: "Soudiane Loul", type: "hameau" },
        { nom: "Soudiane Santhie", type: "hameau" },
        { nom: "Soudiane Sangkaye", type: "hameau" },
        { nom: "Soudiane Dimélé", type: "hameau" },
      ]
    },
    "fatick": {
      nom: "Fatick",
      aliases: [],
      center: [14.316, -16.416],
      zoom: 12,
      bbox: { south: 14.236, west: -16.496, north: 14.396, east: -16.336 },
      maxBounds: [[14.186, -16.546], [14.446, -16.286]],
      localites: [
        { nom: "Croisement TP", type: "quartier" },
        { nom: "Daral", type: "quartier" },
        { nom: "Darou Salam", type: "quartier" },
        { nom: "Escale", type: "quartier" },
        { nom: "Logandème", type: "quartier" },
        { nom: "Mboubane", type: "quartier" },
        { nom: "Ndiandiaye I", type: "quartier" },
        { nom: "Ndiandiaye II", type: "quartier" },
        { nom: "Ndouck", type: "quartier" },
        { nom: "Peulga", type: "quartier" },
        { nom: "Poukham", type: "quartier" },
      ]
    },
    "djirnda": {
      nom: "Djirnda",
      aliases: [],
      center: [13.981, -16.608],
      zoom: 12,
      bbox: { south: 13.911, west: -16.678, north: 14.051, east: -16.538 },
      maxBounds: [[13.861, -16.728], [14.101, -16.488]],
      localites: [
        { nom: "Djirnda", type: "chef-lieu" },
        { nom: "Fambine", type: "village" },
        { nom: "Baouth", type: "village" },
        { nom: "Rofangué", type: "village" },
        { nom: "Vélingara", type: "village" },
        { nom: "Diamniadio", type: "village" },
        { nom: "Maya", type: "village" },
      ]
    }
  };

  // Résolution tolérante : slug exact ou alias (ex. « commune-de-diofior » → « diofior »).
  function get(slug) {
    var s = String(slug || '').toLowerCase().trim();
    if (COMMUNES_GEO[s]) return COMMUNES_GEO[s];
    for (var k in COMMUNES_GEO) if (COMMUNES_GEO[k].aliases.indexOf(s) !== -1) return COMMUNES_GEO[k];
    return null;
  }
  COMMUNES_GEO.get = get;
  Object.defineProperty(COMMUNES_GEO, 'get', { enumerable: false });
  root.COMMUNES_GEO = COMMUNES_GEO;
})(typeof window !== 'undefined' ? window : globalThis);
