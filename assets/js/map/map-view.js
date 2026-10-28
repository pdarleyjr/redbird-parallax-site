// Interactive map controller. All map assets are same-origin (self-hosted tiles, glyphs and style).
import { loadMapLibre } from './loader.js';
import { createPins, controlRects } from './pins.js';
import { crossings, closestHeads } from '../../../shared/pin-layout.mjs';
import { chooseDefaultView } from '../../../shared/pin-view.mjs';
import { siteRoot } from '../data.js';

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const metersPerPixelAtZoom20 = lat => 0.0746 * Math.cos(lat * Math.PI / 180);

function bounds(ring, padMeters = 0) {
  const lngs = ring.map(p => p[0]), lats = ring.map(p => p[1]);
  const dLat = padMeters / 111000, dLng = padMeters / (111000 * Math.cos(25.73 * Math.PI / 180));
  return [[Math.min(...lngs) - dLng, Math.min(...lats) - dLat], [Math.max(...lngs) + dLng, Math.max(...lats) + dLat]];
}

export async function createMapView({ container, snapshot, reducedMotion, onSelect, onChoose, getInsets = () => ({ bottom: 0, right: 0 }) }) {
  const maplibre = await loadMapLibre();
  const root = siteRoot.href;
  const style = await (await fetch(new URL('assets/map/style-night.json', siteRoot))).json();
  style.sources.protomaps.tiles = [`${root}assets/map/tiles/{z}/{x}/{y}.pbf`];
  style.glyphs = `${root}assets/map/fonts/{fontstack}/{range}.pbf`;

  const ring = snapshot.boundary.coordinates[0];
  const map = new maplibre.Map({
    container, style, attributionControl: { compact: true, customAttribution: '© OpenStreetMap contributors · Protomaps' },
    maxBounds: bounds(ring, 1200), minZoom: 13, maxZoom: 19, cooperativeGestures: window.matchMedia('(min-width: 960px)').matches,
    bounds: bounds(ring), fitBoundsOptions: { padding: 24 }, canvasContextAttributes: { antialias: true }
  });
  if (location.search.includes('debug')) window.__map = map;
  map.on('error', e => console.warn('Map warning:', e.error?.message));
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('The map took too long to load.')), 30000); map.once('load', () => { clearTimeout(timer); resolve(); }); });

  // The map opens framed on the densest block, zoomed in until the pins read cleanly ("Show whole trail" still fits everything).
  {
    const located = snapshot.houses.filter(h => h.location !== 'none');
    if (located.length) {
      const view = chooseDefaultView(located, { fitZoom: map.getZoom(), width: container.clientWidth - getInsets().right, height: container.clientHeight - getInsets().bottom, avoid: controlRects(container), phone: container.clientWidth < 768 });
      map.jumpTo({ zoom: view.zoom, center: [view.center.lng, view.center.lat] });
    }
  }

  map.addSource('boundary', { type: 'geojson', data: { type: 'Feature', geometry: snapshot.boundary, properties: {} } });
  map.addLayer({ id: 'boundary-line', type: 'line', source: 'boundary', paint: { 'line-color': cssVar('--rb-neon-orange'), 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': .8 } });

  map.addSource('user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'user-accuracy', type: 'circle', source: 'user', paint: { 'circle-color': cssVar('--rb-you'), 'circle-opacity': .15, 'circle-radius': 0 } });
  map.addLayer({ id: 'user-dot', type: 'circle', source: 'user', paint: { 'circle-color': cssVar('--rb-you'), 'circle-radius': 8, 'circle-stroke-color': cssVar('--rb-cream'), 'circle-stroke-width': 3 } });

  let houses = snapshot.houses;
  let selected = null;
  const pins = createPins({ map, maplibre, houses, root, onSelect, reducedMotion, getInsets });
  if (location.search.includes('debug')) { window.__pins = pins; window.__cross = crossings; window.__close = closestHeads; }
  // camera moves keep the target clear of the dock (bottom sheet or side sheet)
  const move = (center, zoom) => { const i = getInsets(), padding = { top: 0, left: 0, bottom: i.bottom, right: i.right }; return reducedMotion ? map.jumpTo({ center, zoom, padding }) : map.flyTo({ center, zoom, padding, essential: false }); };

  const api = {
    map,
    select(id, { fly = true } = {}) {
      selected = id;
      const house = houses.find(h => h.id === id);
      pins.setSelected(house && house.location !== 'none' ? id : null);
      if (!house || house.location === 'none') return;
      if (fly) move([house.lng, house.lat], Math.max(map.getZoom(), 17));
    },
    setNearest(id) { pins.setNearest(id); },
    setVisited(set) { pins.setVisited(set); },
    setUser(position) {
      if (!position) { map.getSource('user').setData({ type: 'FeatureCollection', features: [] }); return; }
      const { lat, lng, accuracy } = position;
      map.getSource('user').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }] });
      const r20 = Math.max(accuracy || 0, 1) / metersPerPixelAtZoom20(lat);
      map.setPaintProperty('user-accuracy', 'circle-radius', ['interpolate', ['exponential', 2], ['zoom'], 0, r20 / 2 ** 20, 20, r20]);
    },
    follow(position, zoom = 17) { move([position.lng, position.lat], Math.max(map.getZoom(), zoom)); },
    fitAll() {
      // the boundary and every house (a few stops sit just outside the boundary line)
      const all = [...ring, ...houses.filter(h => h.location !== 'none').map(h => [h.lng, h.lat])];
      const i = getInsets();
      const options = { padding: { top: 56, bottom: 28 + i.bottom, left: 28, right: 28 + i.right }, ...(reducedMotion ? { duration: 0 } : {}) };
      map.fitBounds(bounds(all), options);
    },
    zoom(delta) { map.zoomTo(map.getZoom() + delta, reducedMotion ? { duration: 0 } : {}); },
    setSnapshot(next) { houses = next.houses; pins.setHouses(houses); pins.setSelected(selected); },
    pins,
    refresh() { pins.refresh(); },
    resize() { map.resize(); pins.refresh(); },
    destroy() { map.remove(); }
  };
  return api;
}
