// Census geocoder (interpolated, no key). Usage:
//   node scripts/geocode.mjs                 -> published houses -> data/reconcile/geocode-cache.json
//   node scripts/geocode.mjs --private       -> also new (unapproved) houses from the private CSV -> private/geocode-cache.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAddress } from '../shared/address.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wantPrivate = process.argv.includes('--private');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function lookup(display) {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.search = new URLSearchParams({ address: `${display}, Miami, FL 33155`, benchmark: 'Public_AR_Current', format: 'json' });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'redbird-trails-build/1.0 (neighborhood event site)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const m = (await res.json()).result?.addressMatches?.[0];
      return m ? { lat: Number(m.coordinates.y.toFixed(6)), lng: Number(m.coordinates.x.toFixed(6)), matched: m.matchedAddress, source: 'census' } : null;
    } catch (error) { if (attempt === 2) { console.error(`geocode failed for ${display}: ${error.message}`); return null; } await sleep(1500); }
  }
}

async function run(list, file) {
  let cache = {};
  try { cache = JSON.parse(await readFile(file, 'utf8')); } catch { /* new cache */ }
  for (const address of list) {
    const { key, display } = normalizeAddress(address);
    if (!key || key in cache) continue;
    cache[key] = { address: display, result: await lookup(display) };
    await sleep(400);
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(cache, null, 2) + '\n');
  const missing = Object.values(cache).filter(v => !v.result).length;
  console.log(`${file}: ${Object.keys(cache).length} addresses, ${missing} without a match`);
}

const roster = JSON.parse(await readFile(path.join(root, 'data/houses-2026.json'), 'utf8')).houses;
await run(roster.map(h => h.address), path.join(root, 'data/reconcile/geocode-cache.json'));
if (wantPrivate) {
  const { parseCsv, toRegistrations } = await import('../shared/csv.mjs');
  const csv = process.env.RB_CSV || 'C:/Users/Peter Darley/Downloads/Red_Bird_Trick-or-Treat_Trail_2026-10-16_05_15_39.csv';
  const { registrations } = toRegistrations(parseCsv(await readFile(csv, 'utf8')));
  await run(registrations.map(r => r.address), path.join(root, 'private/geocode-cache.json'));
}
