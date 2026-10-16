// Interactive map controller. All map assets are same-origin (self-hosted tiles, glyphs and style).
import { loadMapLibre } from './loader.js';
import { createPins } from './pins.js';
import { siteRoot } from '../data.js';

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const metersPerPixelAtZoom20 = lat => 0.0746 * Math.cos(lat * Math.PI / 180);

function bounds(ring, padMeters = 0) {
  const lngs = ring.map(p => p[0]), lats = ring.map(p => p[1]);
  const dLat = padMeters / 111000, dLng = padMeters / (111000 * Math.cos(25.73 * Math.PI / 180));
  return [[Math.min(...lngs) - dLng, Math.min(...lats) - dLat], [Math.max(...lngs) + dLng, Math.max(...lats) + dLat]];
}

export async function createMapView({ container, snapshot, reducedMotion, onSelect, onChoose }) {
  const maplibre = await loadMapLibre();
  const root = siteRoot.href;
  const style = await (await fetch(new URL('assets/map/style-night.json', siteRoot))).json();
  style.sources.protomaps.tiles = [`${root}assets/map/tiles/{z}/{x}/{y}.pbf`];
  style.glyphs = `${root}assets/map/fonts/{fontstack}/{range}.pbf`;

  const ring = snapshot.boundary.coordinates[0];
  const map = new maplibre.Map({
    container, style, attributionControl: { compact: true, customAttribution: '© OpenStreetMap contributors · Protomaps' },
    maxBounds: bounds(ring, 800), minZoom: 14, maxZoom: 19, cooperativeGestures: window.matchMedia('(min-width: 960px)').matches,
    bounds: bounds(ring), fitBoundsOptions: { padding: 24 }, canvasContextAttributes: { antialias: true }
  });
  if (location.search.includes('debug')) window.__map = map;
  map.on('error', e => console.warn('Map warning:', e.error?.message));
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('The map took too long to load.')), 30000); map.once('load', () => { clearTimeout(timer); resolve(); }); });

  // On a phone the whole trail at once is too crowded for 36 px pins: open about one zoom level in, centered on the houses.
  // "Show whole trail" still fits everything.
  if (container.clientWidth < 768) {
    const located = snapshot.houses.filter(h => h.location !== 'none');
    if (located.length) map.jumpTo({ zoom: map.getZoom() + 1.1, center: [located.reduce((s, h) => s + h.lng, 0) / located.length, located.reduce((s, h) => s + h.lat, 0) / located.length] });
  }

  map.addSource('boundary', { type: 'geojson', data: { type: 'Feature', geometry: snapshot.boundary, properties: {} } });
  map.addLayer({ id: 'boundary-line', type: 'line', source: 'boundary', paint: { 'line-color': cssVar('--rb-neon-orange'), 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': .8 } });

  map.addSource('user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'user-accuracy', type: 'circle', source: 'user', paint: { 'circle-color': cssVar('--rb-you'), 'circle-opacity': .15, 'circle-radius': 0 } });
  map.addLayer({ id: 'user-dot', type: 'circle', source: 'user', paint: { 'circle-color': cssVar('--rb-you'), 'circle-radius': 8, 'circle-stroke-color': cssVar('--rb-cream'), 'circle-stroke-width': 3 } });

  let houses = snapshot.houses;
  let selected = null;
  const pins = createPins({ map, maplibre, houses, root, onSelect });
  const move = (center, zoom) => reducedMotion ? map.jumpTo({ center, zoom }) : map.flyTo({ center, zoom, essential: false });

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
    fitAll() { reducedMotion ? map.fitBounds(bounds(ring), { padding: 24, duration: 0 }) : map.fitBounds(bounds(ring), { padding: 24 }); },
    zoom(delta) { map.zoomTo(map.getZoom() + delta, reducedMotion ? { duration: 0 } : {}); },
    setSnapshot(next) { houses = next.houses; pins.setHouses(houses); pins.setSelected(selected); },
    pins,
    destroy() { map.remove(); }
  };
  return api;
}
