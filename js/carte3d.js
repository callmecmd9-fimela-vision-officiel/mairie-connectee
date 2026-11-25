/* Cartes 3D de l'espace mairie (Mapbox GL JS) : carte de la commune (projets) et carte des signalements.
   Mapbox GL JS est chargé à la demande depuis api.mapbox.com (version épinglée ; hôtes autorisés dans la CSP de _headers).
   Jeton public (pk.…) lu dans <meta name="mc-mapbox"> de mairie.html. */
const MBX = { v: "3.10.0", style: "mapbox://styles/mapbox/streets-v12", pitch: 45, bearing: -10, cluster: 50, clusterMax: 15 };
let MBX_LIB = null;
const mbxToken = () => {
  const m = document.querySelector('meta[name="mc-mapbox"]'),
    t = ((m && m.content) || "").trim();
  return /^pk\.[\w.-]+$/.test(t) ? t : "";
};
function mbxLib() {
  if (window.mapboxgl) return Promise.resolve();
  if (MBX_LIB) return MBX_LIB;
  const base = "https://api.mapbox.com/mapbox-gl-js/v" + MBX.v + "/";
  MBX_LIB = new Promise((ok, ko) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = base + "mapbox-gl.css";
    document.head.appendChild(l);
    const s = document.createElement("script");
    s.src = base + "mapbox-gl.js";
    s.async = true;
    s.onload = () => (window.mapboxgl ? ok() : ko(new Error("lib")));
    s.onerror = () => {
      MBX_LIB = null;
      ko(new Error("lib"));
    };
    document.head.appendChild(s);
  });
  return MBX_LIB;
}
/* Bâtiments extrudés (couche « building » du style streets-v12), sous les étiquettes. */
function mbxBuildings(m) {
  try {
    const lab = m.getStyle().layers.find(l => l.type == "symbol" && l.layout && l.layout["text-field"]);
    m.addLayer(
      {
        id: "mc-3d",
        type: "fill-extrusion",
        source: "composite",
        "source-layer": "building",
        filter: ["==", ["get", "extrude"], "true"],
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "#c9d3cb",
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 14.5, ["get", "height"]],
          "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14, 0, 14.5, ["get", "min_height"]],
          "fill-extrusion-opacity": 0.85
        }
      },
      lab && lab.id
    );
  } catch (e) {}
}
/* Fenêtre d'information : texte uniquement (aucun HTML injecté). */
function mbxPopup(m, f) {
  const p = f.properties || {},
    box = document.createElement("div");
  [p.l1, p.l2, p.l3].forEach((t, i) => {
    if (!t) return;
    const n = document.createElement(i ? "div" : "b");
    n.textContent = String(t);
    box.appendChild(n);
  });
  new mapboxgl.Popup({ offset: 14, closeButton: false }).setLngLat(f.geometry.coordinates.slice()).setDOMContent(box).addTo(m);
}
/* Carte 3D dans el. o = { centre:[lng,lat], zoom, fitMax, one, pts:[{lat,lng,c,l1,l2,l3}] } (c = couleur de la pastille, l1..l3 = lignes de la fenêtre).
   Retourne tout de suite un objet { remove() } (la bibliothèque se charge à la demande) ; en cas d'échec, un message remplace la carte. */
function mapbox3d(el, o) {
  const h = {
    m: null,
    dead: false,
    remove() {
      h.dead = true;
      if (h.m)
        try {
          h.m.remove();
        } catch (e) {}
      h.m = null;
    }
  };
  const fail = t => {
    if (!h.dead) el.innerHTML = '<p class="mut" data-sty="padding:14px">' + t + "</p>";
  };
  const tok = mbxToken();
  if (!tok) {
    fail("Carte indisponible (jeton Mapbox absent).");
    return h;
  }
  const feats = (o.pts || [])
    .filter(
      p => p && p.lat != null && p.lng != null && isFinite(+p.lat) && isFinite(+p.lng) && Math.abs(+p.lat) <= 90 && Math.abs(+p.lng) <= 180
    )
    .map(p => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [+p.lng, +p.lat] },
      properties: { c: p.c || "#2563EB", l1: p.l1 || "", l2: p.l2 || "", l3: p.l3 || "" }
    }));
  mbxLib()
    .then(() => {
      if (h.dead || el.isConnected === false) return;
      mapboxgl.accessToken = tok;
      const m = (h.m = new mapboxgl.Map({
        container: el,
        style: MBX.style,
        center: o.centre,
        zoom: o.zoom || 11,
        pitch: MBX.pitch,
        bearing: MBX.bearing,
        antialias: true,
        cooperativeGestures: true,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Ctrl + molette pour zoomer la carte",
          "CooperativeGesturesHandler.MacHelpText": "⌘ + molette pour zoomer la carte",
          "CooperativeGesturesHandler.MobileHelpText": "Utilisez deux doigts pour déplacer la carte"
        }
      }));
      m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      m.on("load", () => {
        mbxBuildings(m);
        m.addSource("mc-src", {
          type: "geojson",
          data: { type: "FeatureCollection", features: feats },
          cluster: true,
          clusterRadius: MBX.cluster,
          clusterMaxZoom: MBX.clusterMax
        });
        m.addLayer({
          id: "mc-cl",
          type: "circle",
          source: "mc-src",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0B5A2E",
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-pitch-alignment": "map"
          }
        });
        m.addLayer({
          id: "mc-cl-n",
          type: "symbol",
          source: "mc-src",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
            "text-size": 13,
            "text-allow-overlap": true
          },
          paint: { "text-color": "#ffffff" }
        });
        m.addLayer({
          id: "mc-pt",
          type: "circle",
          source: "mc-src",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["get", "c"],
            "circle-radius": 9,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
            "circle-pitch-alignment": "map"
          }
        });
        if (feats.length > 1) {
          const b = new mapboxgl.LngLatBounds();
          feats.forEach(f => b.extend(f.geometry.coordinates));
          m.fitBounds(b, { padding: 50, maxZoom: o.fitMax || 13, pitch: MBX.pitch, duration: 0 });
        } else if (feats.length == 1) m.jumpTo({ center: feats[0].geometry.coordinates, zoom: o.one || 13 });
      });
      m.on("click", ev => {
        const hit = m.queryRenderedFeatures(ev.point, { layers: ["mc-cl", "mc-pt"] })[0];
        if (!hit) return;
        if (hit.layer.id == "mc-cl")
          m.getSource("mc-src").getClusterExpansionZoom(hit.properties.cluster_id, (err, z) => {
            if (!err) m.easeTo({ center: hit.geometry.coordinates, zoom: z + 0.5 });
          });
        else mbxPopup(m, hit);
      });
      ["mc-cl", "mc-pt"].forEach(id => {
        m.on("mouseenter", id, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", id, () => {
          m.getCanvas().style.cursor = "";
        });
      });
    })
    .catch(() => fail("Carte indisponible."));
  return h;
}
