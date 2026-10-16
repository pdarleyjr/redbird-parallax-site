// House markers as GeoJSON-backed layers: numbered dots always visible, illustrated icons only when zoomed in.
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function housesToGeoJSON(houses) {
  return {
    type: 'FeatureCollection',
    features: houses.filter(h => h.location !== 'none' && Number.isFinite(h.lat)).map(h => ({
      type: 'Feature', id: h.mapNumber,
      properties: { id: h.id, n: String(h.mapNumber), name: h.name, icon: h.icon, approx: h.location === 'approximate' },
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] }
    }))
  };
}

async function loadIcon(url) {
  const blob = await (await fetch(url)).blob();
  return createImageBitmap(blob);
}

export async function ensureIcons(map, houses, root) {
  const missing = [...new Set(houses.map(h => h.icon))].filter(icon => !map.hasImage(`icon-${icon}`));
  await Promise.all(missing.map(async icon => {
    try { map.addImage(`icon-${icon}`, await loadIcon(`${root}assets/img/markers/${icon}.webp`)); } catch { /* the numbered dot still shows */ }
  }));
}

export async function addHouseLayers(map, houses, root) {
  const c = { cardinal: cssVar('--rb-cardinal'), cream: cssVar('--rb-cream'), gold: cssVar('--rb-gold'), panel: cssVar('--rb-panel-raised'), amber: cssVar('--rb-amber'), neon: cssVar('--rb-neon-orange'), ink: cssVar('--rb-ink') };
  const state = key => ['boolean', ['feature-state', key], false];
  map.addSource('houses', { type: 'geojson', data: housesToGeoJSON(houses) });
  await ensureIcons(map, houses, root);
  map.addLayer({
    id: 'house-approx', type: 'circle', source: 'houses', filter: ['==', ['get', 'approx'], true],
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 15, 18, 21], 'circle-color': 'transparent', 'circle-stroke-color': c.cream, 'circle-stroke-width': 1, 'circle-stroke-opacity': .45 }
  });
  map.addLayer({
    id: 'house-dot', type: 'circle', source: 'houses',
    layout: { 'circle-sort-key': ['to-number', ['get', 'n']] },
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 9, 18, 13],
      'circle-color': ['case', state('visited'), c.panel, c.cardinal],
      'circle-stroke-color': ['case', state('nearest'), c.gold, state('selected'), c.neon, state('visited'), c.amber, c.cream],
      'circle-stroke-width': ['case', state('nearest'), 4, state('selected'), 4, 2]
    }
  });
  const label = (id, text, color, opacity) => map.addLayer({
    id, type: 'symbol', source: 'houses',
    layout: { 'text-field': text, 'text-font': ['Noto Sans Medium'], 'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 18, 13], 'text-allow-overlap': true, 'text-ignore-placement': true },
    paint: { 'text-color': color, 'text-opacity': opacity }
  });
  label('house-number', ['get', 'n'], ['case', state('visited'), c.amber, c.cream], 1);
  map.addLayer({
    id: 'house-icon', type: 'symbol', source: 'houses', minzoom: 17.5,
    layout: { 'icon-image': ['concat', 'icon-', ['get', 'icon']], 'icon-size': .34, 'icon-anchor': 'bottom', 'icon-offset': [0, -14], 'icon-allow-overlap': false, 'symbol-sort-key': ['to-number', ['get', 'n']] }
  });
}

export function setHouseState(map, number, key, value) {
  try { map.setFeatureState({ source: 'houses', id: number }, { [key]: value }); } catch { /* feature not on the map */ }
}
