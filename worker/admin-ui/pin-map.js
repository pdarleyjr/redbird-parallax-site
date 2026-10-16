// Draggable pin map used by the house editor (self-hosted MapLibre and tiles; same-origin only).
const base = new URL('./', location.href);
let lib = null;

async function load() {
  if (lib) return lib;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('assets/vendor/maplibre-gl-6.14.0/maplibre-gl.css', base).href; document.head.append(css);
  const mod = await import(new URL('assets/vendor/maplibre-gl-6.14.0/maplibre-gl.mjs', base).href);
  lib = mod.Map ? mod : mod.default;
  return lib;
}

export async function createPinMap(container, { boundary, point, onMove }) {
  const ml = await load();
  const style = await (await fetch(new URL('assets/map/style-night.json', base))).json();
  style.sources.protomaps.tiles = [`${base.href}assets/map/tiles/{z}/{x}/{y}.pbf`];
  style.glyphs = `${base.href}assets/map/fonts/{fontstack}/{range}.pbf`;
  const ring = boundary.coordinates[0];
  const lngs = ring.map(p => p[0]), lats = ring.map(p => p[1]);
  const map = new ml.Map({ container, style, bounds: [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], minZoom: 13, maxZoom: 19, attributionControl: { compact: true } });
  const pin = document.createElement('button');
  pin.type = 'button'; pin.className = 'pin'; pin.setAttribute('aria-label', 'House pin. Drag it or use the arrow keys to move it.');
  let marker = null;
  const place = (lat, lng) => {
    if (!marker) {
      marker = new ml.Marker({ element: pin, draggable: true }).setLngLat([lng, lat]).addTo(map);
      marker.on('dragend', () => { const p = marker.getLngLat(); onMove({ lat: p.lat, lng: p.lng }); });
    } else marker.setLngLat([lng, lat]);
  };
  pin.addEventListener('keydown', event => {
    const step = event.shiftKey ? 0.00005 : 0.00001;
    const delta = { ArrowUp: [step, 0], ArrowDown: [-step, 0], ArrowLeft: [0, -step], ArrowRight: [0, step] }[event.key];
    if (!delta || !marker) return;
    event.preventDefault();
    const p = marker.getLngLat(); place(p.lat + delta[0], p.lng + delta[1]); onMove({ lat: p.lat + delta[0], lng: p.lng + delta[1] });
  });
  map.on('click', event => { place(event.lngLat.lat, event.lngLat.lng); onMove({ lat: event.lngLat.lat, lng: event.lngLat.lng }); });
  if (point) { place(point.lat, point.lng); map.jumpTo({ center: [point.lng, point.lat], zoom: 18 }); }
  return { place(lat, lng) { place(lat, lng); map.flyTo({ center: [lng, lat], zoom: 18 }); }, destroy() { map.remove(); } };
}
