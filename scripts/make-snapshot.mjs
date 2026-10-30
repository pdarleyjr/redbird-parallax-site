// Build the public snapshot from the approved roster + owner decisions + geocodes.
//   node scripts/make-snapshot.mjs            -> data/halloween-2026.public.json  (approved houses only)
//   node scripts/make-snapshot.mjs --check    -> fail if the committed snapshot is stale
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAddress } from '../shared/address.mjs';
import { assertSnapshot } from '../shared/snapshot-schema.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DECISION_FILES = ['2026-10-16.decisions.json', '2026-10-23.decisions.json', '2026-10-30.decisions.json'];
const readJSON = async rel => JSON.parse(await readFile(path.join(root, rel), 'utf8'));

/** Building-snapped positions from the flyer generator (OSM address import); owner GPS pins are marked manual-owner. */
export async function flyerPositions() {
  const list = JSON.parse(await readFile(path.join(root, 'tools/flyer-map/houses.json'), 'utf8'));
  return new Map(list.map(h => { const owner = String(h.source).startsWith('owner'); return [h.n, { lat: h.lat, lng: h.lng, source: owner ? 'manual-owner' : 'osm-building', verified: owner }]; }));
}

export function printExtentFor(ring, pad = 0.06) {
  const lngs = ring.map(p => p[0]), lats = ring.map(p => p[1]);
  const [w, e, s, n] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
  const [dx, dy] = [(e - w) * pad, (n - s) * pad];
  return [w - dx, s - dy, e + dx, n + dy].map(v => Number(v.toFixed(5)));
}

/** A geocode is trusted only if the matched street agrees with the requested address. */
export function trustedGeocode(entry, expectedKey) {
  const r = entry?.result;
  if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return null;
  return normalizeAddress(r.matched || '').key === expectedKey ? { lat: r.lat, lng: r.lng } : null;
}

export async function makeSnapshot({ cacheFile = 'data/reconcile/geocode-cache.json' } = {}) {
  const [roster, decisionFiles, event, boundaryFeature, cache] = await Promise.all([
    readJSON('data/reconcile/roster-2026-10-09.json'), Promise.all(DECISION_FILES.map(f => readJSON(`data/reconcile/${f}`))),
    readJSON('data/events/halloween-2026.json'), readJSON('data/geo/redbird-boundary.geojson'), readJSON(cacheFile)
  ]);
  // Decisions accumulate: each export adds a file; overrides and manual locations merge, new houses append, the newest publishedAt wins.
  const decisions = {
    overrides: Object.assign({}, ...decisionFiles.map(d => d.overrides)), manualLocations: Object.assign({}, ...decisionFiles.map(d => d.manualLocations)),
    approvedNew: decisionFiles.flatMap(d => d.approvedNew || []), publishedAt: decisionFiles.map(d => d.publishedAt).sort().at(-1)
  };
  const flyer = await flyerPositions();
  const houses = roster.houses.filter(h => h.status === 'approved').map(h => {
    const override = decisions.overrides?.[h.id] || {};
    const key = normalizeAddress(h.address).key;
    const manual = decisions.manualLocations?.[h.id];
    const point = manual || flyer.get(h.mapNumber) || trustedGeocode(cache[key], key);
    return {
      id: h.id, mapNumber: h.mapNumber, name: override.name || h.name, address: normalizeAddress(h.address).display,
      description: null, icon: override.icon || path.basename(h.image || 'haunted-generic', '.webp'),
      lat: point ? point.lat : null, lng: point ? point.lng : null,
      location: point ? (point.verified ? 'verified' : 'approximate') : 'none'
    };
  });
  for (const n of decisions.approvedNew || []) {
    const a = normalizeAddress(n.address);
    const point = decisions.manualLocations?.[n.id] || flyer.get(n.mapNumber) || trustedGeocode(cache[a.key], a.key);
    houses.push({ id: n.id, mapNumber: n.mapNumber, name: n.name, address: a.display, description: null, icon: n.icon, lat: point ? point.lat : null, lng: point ? point.lng : null, location: point ? (point.verified ? 'verified' : 'approximate') : 'none' });
  }
  houses.sort((a, b) => a.mapNumber - b.mapNumber);
  const ring = boundaryFeature.geometry.coordinates[0];
  const [start, end] = [event.hours.start, event.hours.end];
  return assertSnapshot({
    schema: 1, eventId: 'halloween-2026', version: 1, publishedAt: decisions.publishedAt,
    event: { name: event.name, year: event.year, date: event.date, start, end, timeZone: event.timeZone, status: 'published' },
    boundary: boundaryFeature.geometry, printExtent: printExtentFor(ring), trail: null, houses
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const snapshot = await makeSnapshot();
  const text = JSON.stringify(snapshot, null, 2) + '\n';
  const file = path.join(root, 'data/halloween-2026.public.json');
  if (process.argv.includes('--check')) {
    if (text !== await readFile(file, 'utf8')) throw new Error('data/halloween-2026.public.json is stale. Run node scripts/make-snapshot.mjs');
    console.log('Snapshot is current.');
  } else {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, text);
    const located = snapshot.houses.filter(h => h.location !== 'none').length;
    console.log(`Snapshot v${snapshot.version}: ${snapshot.houses.length} houses, ${located} located.`);
  }
}
