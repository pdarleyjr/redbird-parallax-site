// Build night and print MapLibre styles from @protomaps/basemaps with the Red Bird palette.
// Style URLs are relative placeholders; assets/js/map/map-view.js rewrites them to absolute URLs at runtime.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layers, namedFlavor } from '@protomaps/basemaps';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function readTokens() {
  const css = await readFile(path.join(root, 'assets/css/tokens.css'), 'utf8');
  return Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2].toLowerCase()]));
}

/** Map-only shades (documented in 05-TECH-SPEC 5.7) that are not general UI tokens. */
export const MAP_SHADES = {
  night: { land: '#0a1a44', park: '#0f2147', minor: '#2f2c5a', major: '#4a3f7a', majorLabel: '#fbf3e3' },
  print: { land: '#f7f4ee', park: '#e4ecd8', water: '#cfe0ee', building: '#e6e0d4', minor: '#ffffff', major: '#f4e3c8', casing: '#cfc8b8', label: '#08132b', halo: '#ffffff', muted: '#4a5068' }
};

const DROP = new Set(['pois', 'roads_oneway', 'roads_shields', 'places_locality', 'address_label', 'roads_runway', 'roads_taxiway', 'landuse_runway']);

function nightFlavor(t) {
  const n = MAP_SHADES.night;
  return {
    ...namedFlavor('dark'),
    background: t['rb-sky'], earth: n.land, park_a: n.park, park_b: n.park, wood_a: n.park, wood_b: n.park, scrub_a: n.park, scrub_b: n.park,
    hospital: n.land, industrial: n.land, school: n.land, pedestrian: n.land, zoo: n.park, military: n.land, sand: n.land, beach: n.land, glacier: n.land, aerodrome: n.land, runway: n.minor, pier: n.minor,
    water: t['rb-sky-deep'], buildings: t['rb-panel'],
    minor_service: n.minor, minor_a: n.minor, minor_b: n.minor, link: n.minor, other: n.minor, major: n.major, highway: n.major,
    tunnel_other: n.minor, tunnel_minor: n.minor, tunnel_link: n.minor, tunnel_major: n.major, tunnel_highway: n.major,
    bridges_other: n.minor, bridges_minor: n.minor, bridges_link: n.minor, bridges_major: n.major, bridges_highway: n.major,
    minor_service_casing: n.land, minor_casing: n.land, link_casing: n.land, major_casing_late: n.land, highway_casing_late: n.land, major_casing_early: n.land, highway_casing_early: n.land,
    tunnel_other_casing: n.land, tunnel_minor_casing: n.land, tunnel_link_casing: n.land, tunnel_major_casing: n.land, tunnel_highway_casing: n.land,
    bridges_other_casing: n.land, bridges_minor_casing: n.land, bridges_link_casing: n.land, bridges_major_casing: n.land, bridges_highway_casing: n.land,
    railway: t['rb-line'], boundaries: t['rb-line'],
    roads_label_minor: n.majorLabel, roads_label_major: n.majorLabel, roads_label_minor_halo: t['rb-sky-deep'], roads_label_major_halo: t['rb-sky-deep'],
    ocean_label: t['rb-muted'], subplace_label: t['rb-muted'], subplace_label_halo: t.rb_sky_deep || t['rb-sky-deep'], city_label: t['rb-muted'], city_label_halo: t['rb-sky-deep'],
    state_label: t['rb-muted'], state_label_halo: t['rb-sky-deep'], country_label: t['rb-muted'], address_label: t['rb-muted'], address_label_halo: t['rb-sky-deep'],
    landcover: { grassland: n.park, barren: n.land, urban_area: n.land, farmland: n.park, glacier: n.land, scrub: n.park, forest: n.park }
  };
}

function printFlavor(t) {
  const p = MAP_SHADES.print;
  return {
    ...namedFlavor('light'),
    background: p.land, earth: p.land, park_a: p.park, park_b: p.park, wood_a: p.park, wood_b: p.park, scrub_a: p.park, scrub_b: p.park,
    hospital: p.land, industrial: p.land, school: p.land, pedestrian: p.land, zoo: p.park, military: p.land, sand: p.land, beach: p.land, glacier: p.land, aerodrome: p.land, runway: p.casing, pier: p.casing,
    water: p.water, buildings: p.building,
    minor_service: p.minor, minor_a: p.minor, minor_b: p.minor, link: p.minor, other: p.minor, major: p.major, highway: p.major,
    tunnel_other: p.minor, tunnel_minor: p.minor, tunnel_link: p.minor, tunnel_major: p.major, tunnel_highway: p.major,
    bridges_other: p.minor, bridges_minor: p.minor, bridges_link: p.minor, bridges_major: p.major, bridges_highway: p.major,
    minor_service_casing: p.casing, minor_casing: p.casing, link_casing: p.casing, major_casing_late: p.casing, highway_casing_late: p.casing, major_casing_early: p.casing, highway_casing_early: p.casing,
    tunnel_other_casing: p.casing, tunnel_minor_casing: p.casing, tunnel_link_casing: p.casing, tunnel_major_casing: p.casing, tunnel_highway_casing: p.casing,
    bridges_other_casing: p.casing, bridges_minor_casing: p.casing, bridges_link_casing: p.casing, bridges_major_casing: p.casing, bridges_highway_casing: p.casing,
    railway: p.casing, boundaries: p.casing,
    roads_label_minor: p.label, roads_label_major: p.label, roads_label_minor_halo: p.halo, roads_label_major_halo: p.halo,
    ocean_label: p.muted, subplace_label: p.muted, subplace_label_halo: p.halo, city_label: p.muted, city_label_halo: p.halo,
    state_label: p.muted, state_label_halo: p.halo, country_label: p.muted, address_label: p.muted, address_label_halo: p.halo,
    landcover: { grassland: p.park, barren: p.land, urban_area: p.land, farmland: p.park, glacier: p.land, scrub: p.park, forest: p.park }
  };
}

function build(name, flavor, bg) {
  // Minor street names normally appear at z15; this map is small and tile data stops at z15, so show them from z13.
  const kept = layers('protomaps', flavor, { lang: 'en' }).filter(l => !DROP.has(l.id)).map(l => (l.id.startsWith('roads_labels') ? { ...l, minzoom: 13 } : l));
  const style = {
    version: 8, name,
    glyphs: 'assets/map/fonts/{fontstack}/{range}.pbf',
    sources: { protomaps: { type: 'vector', tiles: ['assets/map/tiles/{z}/{x}/{y}.pbf'], minzoom: 12, maxzoom: 15, attribution: '© OpenStreetMap contributors · Protomaps' } },
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': bg } }, ...kept]
  };
  return style;
}

export async function buildStyles() {
  const t = await readTokens();
  return { night: build('Red Bird night', nightFlavor(t), t['rb-sky']), print: build('Red Bird print', printFlavor(t), MAP_SHADES.print.land) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { night, print } = await buildStyles();
  await writeFile(path.join(root, 'assets/map/style-night.json'), JSON.stringify(night));
  await writeFile(path.join(root, 'assets/map/style-print.json'), JSON.stringify(print));
  console.log(`style-night: ${night.layers.length} layers; style-print: ${print.layers.length} layers`);
}
