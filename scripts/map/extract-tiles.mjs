// Extract z12–15 vector tiles for the trail bbox from a Protomaps daily build into static z/x/y.pbf files.
// Usage: node scripts/map/extract-tiles.mjs [https://build.protomaps.com/YYYYMMDD.pmtiles]
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PMTiles } from 'pmtiles';

export const BBOX = [-80.3120, 25.7250, -80.2740, 25.7470]; // west, south, east, north
export const ZOOMS = [12, 13, 14, 15];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'assets/map/tiles');

const lng2x = (lng, z) => Math.floor((lng + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);

async function pickBuild() {
  for (let back = 1; back < 10; back++) {
    const d = new Date(Date.now() - back * 864e5).toISOString().slice(0, 10).replaceAll('-', '');
    const url = `https://build.protomaps.com/${d}.pmtiles`;
    if ((await fetch(url, { method: 'HEAD' })).ok) return url;
  }
  throw new Error('No recent Protomaps build found');
}

const url = process.argv[2] || await pickBuild();
const archive = new PMTiles(url);
const header = await archive.getHeader();
await rm(out, { recursive: true, force: true });
let count = 0, bytes = 0;
for (const z of ZOOMS) {
  const [x0, x1] = [lng2x(BBOX[0], z), lng2x(BBOX[2], z)];
  const [y0, y1] = [lat2y(BBOX[3], z), lat2y(BBOX[1], z)];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const tile = await archive.getZxy(z, x, y);
    if (!tile) continue;
    let data = Buffer.from(tile.data);
    if (data[0] === 0x1f && data[1] === 0x8b) data = gunzipSync(data);
    const file = path.join(out, String(z), String(x), `${y}.pbf`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    count++; bytes += data.length;
  }
}
await writeFile(path.join(root, 'assets/map/tiles.json'), JSON.stringify({ source: url, bbox: BBOX, minzoom: 12, maxzoom: 15, tiles: count, tileType: header.tileType }, null, 2) + '\n');
console.log(`Wrote ${count} tiles (${(bytes / 1024).toFixed(0)} KiB raw) from ${url}`);
