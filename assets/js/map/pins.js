// Themed icon pins for the live map (the flyer look): a glossy disc with the house's icon, a small number tag, a needle and a ground dot.
// One DOM marker per located house. After the map settles, shared/pin-layout.mjs lifts each head above its house on a short needle;
// houses that cannot get a head within reach are grouped into one cluster badge (fanned icons and a "+N" tag) that zooms in when tapped.
// While the map moves the markers simply move with it.
import { planPins, planFlat } from '../../../shared/pin-view.mjs';
import { iconURL } from '../../../shared/icon-url.mjs';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };

const wide = () => window.matchMedia('(min-width: 768px)').matches;

/** Map controls overlay the canvas; keep pin heads out from under them. */
export function controlRects(el) {
  const box = el.getBoundingClientRect();
  return [...el.parentElement.querySelectorAll('.map-controls button, .maplibregl-ctrl')].map(c => c.getBoundingClientRect())
    .filter(r => r.width && r.height).map(r => ({ x: r.x - box.x, y: r.y - box.y, width: r.width, height: r.height }));
}

export function createPins({ map, maplibre, houses, root, onSelect, reducedMotion = false }) {
  let pins = new Map();           // id -> { house, wrapper, button, tag, line, marker }
  let clusters = new Map();       // key -> { ids, wrapper, button, line, marker }
  let selected = null, nearest = null, visited = new Set();
  let frame = 0, plan = null;
  ensureKeepout();

  const iconUrl = house => iconURL(house.icon, root);

  /** wrapper (0x0, on the house) > needle svg + head button; the layout offsets the head with --dx / --dy */
  function shell(className) {
    const wrapper = document.createElement('div');
    wrapper.className = className;
    const needle = svgEl('svg', { class: 'pin-needle', width: 1, height: 1, 'aria-hidden': 'true', focusable: 'false' });
    const line = svgEl('line', { x1: 0, y1: -30, x2: 0, y2: 0, class: 'pin-line' });
    needle.append(svgEl('ellipse', { cx: 2.4, cy: 1, rx: 5, ry: 1.9, class: 'pin-shadow' }), line, svgEl('circle', { cx: 0, cy: 0, r: 2.4, class: 'pin-dot' }));
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'pin-head';
    const disc = document.createElement('span'); disc.className = 'pin-disc';
    const tag = document.createElement('span'); tag.className = 'pin-num';
    button.append(disc, tag);
    wrapper.append(needle, button);
    return { wrapper, button, disc, tag, line };
  }
  const icon = house => { const img = document.createElement('img'); img.alt = ''; img.width = 64; img.height = 64; img.decoding = 'async'; img.src = iconUrl(house); return img; };

  const build = house => {
    const { wrapper, button, disc, tag, line } = shell('pin');
    button.setAttribute('aria-label', `Stop ${house.mapNumber}, ${house.name}, ${house.address}`);
    disc.append(icon(house));
    tag.textContent = String(house.mapNumber);
    button.addEventListener('click', () => onSelect(house.id));
    const marker = new maplibre.Marker({ element: wrapper, anchor: 'center' }).setLngLat([house.lng, house.lat]).addTo(map);
    return { house, wrapper, button, tag, line, marker };
  };

  const classes = p => {
    const { house, wrapper, tag } = p;
    const isVisited = visited.has(house.id);
    wrapper.classList.toggle('is-selected', selected === house.id);
    wrapper.classList.toggle('is-nearest', nearest === house.id);
    wrapper.classList.toggle('is-visited', isVisited);
    tag.textContent = isVisited ? '✓' : String(house.mapNumber);
    p.button.setAttribute('aria-label', `Stop ${house.mapNumber}, ${house.name}, ${house.address}${isVisited ? ', visited' : ''}`);
  };
  const clusterClasses = c => {
    c.wrapper.classList.toggle('is-nearest', c.ids.includes(nearest));
    c.wrapper.classList.toggle('is-selected', c.ids.includes(selected));
    c.wrapper.classList.toggle('is-visited', c.ids.every(id => visited.has(id)));
  };

  function zoomToCluster(c) {
    const b = new maplibre.LngLatBounds();
    c.ids.map(id => pins.get(id)?.house).filter(Boolean).forEach(h => b.extend([h.lng, h.lat]));
    const cam = map.cameraForBounds(b, { padding: { top: 90, bottom: 70, left: 50, right: 50 }, maxZoom: 19 });
    const zoom = Math.min(19, Math.max(cam?.zoom ?? 0, map.getZoom() + 1));
    const center = cam?.center ?? b.getCenter();
    if (reducedMotion) map.jumpTo({ center, zoom }); else map.easeTo({ center, zoom });
  }

  function buildCluster(unit) {
    const { wrapper, button, disc, tag, line } = shell('pin is-cluster');
    const members = unit.ids.map(id => pins.get(id).house).sort((a, b) => a.mapNumber - b.mapNumber);
    disc.classList.add('pin-fan');
    members.slice(0, 3).forEach(h => { const i = icon(h); i.decoding = 'sync'; disc.append(i); });
    tag.textContent = `+${members.length}`;
    button.setAttribute('aria-label', `${members.length} houses close together, stops ${members.map(h => h.mapNumber).join(', ')}. Zoom in to see each house.`);
    const marker = new maplibre.Marker({ element: wrapper, anchor: 'center' }).setLngLat([0, 0]).addTo(map);
    const c = { ids: unit.ids, wrapper, button, line, marker };
    button.addEventListener('click', () => zoomToCluster(c));
    return c;
  }

  /** Basemap labels yield to the pins: an invisible symbol layer under the label layers reserves the space each badge covers. */
  function ensureKeepout() {
    if (map.getSource('pin-keepout')) return;
    map.addImage('pin-keepout', { width: 64, height: 64, data: new Uint8Array(64 * 64 * 4) });
    map.addSource('pin-keepout', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const firstLabel = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
    map.addLayer({ id: 'pin-keepout', type: 'symbol', source: 'pin-keepout', layout: { 'icon-image': 'pin-keepout', 'icon-size': ['get', 'size'], 'icon-allow-overlap': true, 'icon-ignore-placement': false }, paint: { 'icon-opacity': 0 } }, firstLabel);
  }

  /** Re-run the layout for the current view. */
  function layout() {
    frame = 0;
    if (!pins.size) return;
    const el = map.getContainer();
    const w = el.clientWidth, h = el.clientHeight;
    // Houses outside the view (or too close to the top edge for a head to sit above them) are left out; they come back when the map moves.
    // Flat badges sit on the house itself, so they only need the house to be on screen.
    const anchors = [], onScreen = [];
    for (const p of pins.values()) {
      const pt = map.project([p.house.lng, p.house.lat]);
      p.wrapper.hidden = true;
      if (pt.x > 10 && pt.x < w - 10 && pt.y > 10 && pt.y < h - 8) onScreen.push({ id: p.house.id, x: pt.x, y: pt.y });
      if (pt.x > 8 && pt.x < w - 8 && pt.y > 44 && pt.y < h - 8) anchors.push({ id: p.house.id, x: pt.x, y: pt.y });
    }
    plan = planPins(anchors, { phone: !wide(), width: w, height: h, avoid: controlRects(el) });
    if (plan.mode === 'flat') plan = planFlat(onScreen, { phone: !wide() });
    const shown = new Set(plan.units.flatMap(u => u.ids));
    for (const id of shown) pins.get(id).wrapper.hidden = false;
    const { units, radius: R, mode } = plan;
    el.classList.toggle('pins-flat', mode === 'flat');
    el.style.setProperty('--pin-d', `${2 * R}px`);
    const keep = new Set(), spots = [];
    for (const u of units) {
      const dx = u.hx - u.ax, dy = u.hy - u.ay, z = String(Math.round(u.ay) + (u.ids.includes(selected) ? 1000 : 0));
      let target;
      if (u.ids.length === 1) {
        target = pins.get(u.ids[0]);
        target.wrapper.hidden = false;
      } else {
        keep.add(u.key);
        target = clusters.get(u.key) ?? buildCluster(u);
        clusters.set(u.key, target);
        const at = map.unproject([u.ax, u.ay]);
        target.marker.setLngLat([at.lng, at.lat]);
        clusterClasses(target);
      }
      target.wrapper.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      target.wrapper.style.setProperty('--dy', `${dy.toFixed(1)}px`);
      target.wrapper.style.zIndex = z;
      target.line.setAttribute('x1', dx.toFixed(1)); target.line.setAttribute('y1', dy.toFixed(1));
      const head = map.unproject([u.hx, u.hy]);
      spots.push({ type: 'Feature', properties: { size: (2 * R + 10) / 64 }, geometry: { type: 'Point', coordinates: [head.lng, head.lat] } });
    }
    const grouped = new Set(units.filter(u => u.ids.length > 1).flatMap(u => u.ids));
    for (const id of grouped) pins.get(id).wrapper.hidden = true;
    for (const [key, c] of clusters) if (!keep.has(key)) { c.marker.remove(); clusters.delete(key); }
    map.getSource('pin-keepout')?.setData({ type: 'FeatureCollection', features: spots });
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(layout); };
  map.on('moveend', schedule); map.on('zoomend', schedule); map.on('resize', schedule);
  matchMedia('(min-width: 768px)').addEventListener('change', schedule);

  function clearClusters() { for (const c of clusters.values()) c.marker.remove(); clusters = new Map(); }

  function set(list) {
    for (const p of pins.values()) p.marker.remove();
    clearClusters();
    pins = new Map();
    for (const house of [...list].filter(h => h.location !== 'none' && Number.isFinite(h.lat)).sort((a, b) => a.mapNumber - b.mapNumber)) {
      const p = build(house);
      pins.set(house.id, p); classes(p);
    }
    schedule();
  }
  set(houses);

  const restyle = () => { for (const p of pins.values()) classes(p); for (const c of clusters.values()) clusterClasses(c); };
  return {
    count: () => pins.size,
    /** What is on screen right now: mode, badge radius, units (heads and anchors in px) and density stats. */
    metrics: () => plan && ({ mode: plan.mode, radius: plan.radius, stats: plan.stats, units: plan.units.map(u => ({ ...u })) }),
    clusterCount: () => clusters.size,
    setHouses: set,
    setSelected(id) { selected = id; restyle(); schedule(); },
    setNearest(id) { nearest = id; restyle(); },
    setVisited(set) { visited = new Set(set); restyle(); },
    refresh: schedule,
    destroy() { for (const p of pins.values()) p.marker.remove(); clearClusters(); pins = new Map(); }
  };
}
