// Interactive map controller. All map assets are same-origin (self-hosted tiles, glyphs and style).
import { loadMapLibre } from './loader.js';
import { addHouseLayers, housesToGeoJSON, setHouseState } from './markers.js';
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
  await new Promise((resolve, reject) => { map.once('load', resolve); map.once('error', e => reject(e.error || e)); });

  map.addSource('boundary', { type: 'geojson', data: { type: 'Feature', geometry: snapshot.boundary, properties: {} } });
  map.addLayer({ id: 'boundary-line', type: 'line', source: 'boundary', paint: { 'line-color': cssVar('--rb-neon-orange'), 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': .8 } });
  await addHouseLayers(map, snapshot.houses, root);

  map.addSource('user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'user-accuracy', type: 'circle', source: 'user', paint: { 'circle-color': cssVar('--rb-you'), 'circle-opacity': .15, 'circle-radius': 0 } });
  map.addLayer({ id: 'user-dot', type: 'circle', source: 'user', paint: { 'circle-color': cssVar('--rb-you'), 'circle-radius': 8, 'circle-stroke-color': cssVar('--rb-cream'), 'circle-stroke-width': 3 } });

  let houses = snapshot.houses;
  let selected = null, nearestId = null, markerEl = null;
  const byNumber = id => houses.find(h => h.id === id)?.mapNumber;
  const move = (center, zoom) => reducedMotion ? map.jumpTo({ center, zoom }) : map.flyTo({ center, zoom, essential: false });

  map.on('click', event => {
    const r = 22;
    const found = map.queryRenderedFeatures([[event.point.x - r, event.point.y - r], [event.point.x + r, event.point.y + r]], { layers: ['house-dot'] });
    const ids = [...new Set(found.map(f => f.properties.id))];
    if (ids.length === 1) onSelect(ids[0]); else if (ids.length > 1) onChoose(ids);
  });
  map.on('mousemove', 'house-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'house-dot', () => { map.getCanvas().style.cursor = ''; });

  const api = {
    map,
    select(id, { fly = true } = {}) {
      if (selected) setHouseState(map, byNumber(selected), 'selected', false);
      selected = id;
      const house = houses.find(h => h.id === id);
      markerEl?.remove?.(); markerEl = null;
      if (!house || house.location === 'none') return;
      setHouseState(map, house.mapNumber, 'selected', true);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'marker-focus';
      button.setAttribute('aria-label', `Stop ${house.mapNumber}: ${house.name}, ${house.address}`);
      markerEl = new maplibre.Marker({ element: button }).setLngLat([house.lng, house.lat]).addTo(map);
      if (fly) move([house.lng, house.lat], Math.max(map.getZoom(), 17));
    },
    setNearest(id) {
      if (nearestId) setHouseState(map, byNumber(nearestId), 'nearest', false);
      nearestId = id;
      if (id) setHouseState(map, byNumber(id), 'nearest', true);
    },
    setVisited(set) { for (const h of houses) setHouseState(map, h.mapNumber, 'visited', set.has(h.id)); },
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
    setSnapshot(next) { houses = next.houses; map.getSource('houses').setData(housesToGeoJSON(houses)); },
    destroy() { map.remove(); }
  };
  return api;
}
