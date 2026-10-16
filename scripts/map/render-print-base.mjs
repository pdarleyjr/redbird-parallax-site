// Render the printable base maps and the screen poster from the self-hosted tiles/styles.
// Run when the print extent or style changes: node scripts/map/render-print-base.mjs
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createPreviewServer } from '../serve.mjs';
import { extentHash } from '../../shared/geo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
const extent = snapshot.printExtent;
const ring = snapshot.boundary.coordinates[0];
const boundaryBox = [Math.min(...ring.map(p => p[0])), Math.min(...ring.map(p => p[1])), Math.max(...ring.map(p => p[0])), Math.max(...ring.map(p => p[1]))];

// CSS px sizes; deviceScaleFactor makes them 300 dpi (96 css px per inch).
const JOBS = [
  { name: 'print-base-letter-portrait', style: 'style-print', cssW: 720, cssH: 595, scale: 3.125, bounds: extent, key: 'letter-portrait', webp: 82 },
  { name: 'print-base-letter-landscape', style: 'style-print', cssW: 979, cssH: 538, scale: 3.125, bounds: extent, key: 'letter-landscape', webp: 82 },
  { name: 'poster', style: 'style-night', cssW: 600, cssH: 600, scale: 2, bounds: boundaryBox, key: 'poster', webp: 70 }
];

const server = createPreviewServer();
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = `${origin}/redbird-parallax-site/`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const hash = createHash('sha256');
const meta = { extentHash: extentHash(extent), extent, maps: {} };

for (const job of JOBS) {
  const context = await browser.newContext({ viewport: { width: job.cssW + 40, height: job.cssH + 40 }, deviceScaleFactor: job.scale });
  const page = await context.newPage();
  await page.route('**/__render.html', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${base}assets/vendor/maplibre-gl-6.14.0/maplibre-gl.css"><style>html,body{margin:0;background:#fff}#map{width:${job.cssW}px;height:${job.cssH}px}.maplibregl-ctrl{display:none}</style><div id="map"></div>` }));
  await page.goto(`${base}__render.html`);
  const result = await page.evaluate(async ({ base, style, bounds, fonts }) => {
    const maplibre = await import(`${base}assets/vendor/maplibre-gl-6.14.0/maplibre-gl.mjs`);
    const lib = maplibre.Map ? maplibre : maplibre.default;
    const styleJSON = await (await fetch(`${base}assets/map/${style}.json`)).json();
    styleJSON.sources.protomaps.tiles = [`${base}assets/map/tiles/{z}/{x}/{y}.pbf`];
    styleJSON.glyphs = `${base}assets/map/fonts/{fontstack}/{range}.pbf`;
    const map = new lib.Map({ container: 'map', style: styleJSON, attributionControl: false, interactive: false, fadeDuration: 0, bounds: [[bounds[0], bounds[1]], [bounds[2], bounds[3]]], fitBoundsOptions: { padding: 0 } });
    await new Promise((resolve, reject) => { map.once('idle', resolve); map.once('error', e => reject(e.error || e)); });
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 800));
    const b = map.getBounds();
    return { bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() };
  }, { base, style: job.style, bounds: job.bounds });
  const png = await page.locator('#map').screenshot({ type: 'png' });
  const info = await sharp(png).metadata();
  const file = path.join(root, 'assets/map', `${job.name}.webp`);
  await sharp(png).webp({ quality: job.webp }).toFile(file);
  hash.update(png);
  meta.maps[job.key] = { file: `assets/map/${job.name}.webp`, bounds: result.bounds.map(v => Number(v.toFixed(7))), zoom: Number(result.zoom.toFixed(3)), width: info.width, height: info.height };
  console.log(`${job.name}: ${info.width}x${info.height}, zoom ${result.zoom.toFixed(2)}`);
  await context.close();
}
await browser.close();
server.close();
meta.styleHash = createHash('sha256').update(await readFile(path.join(root, 'assets/map/style-print.json'))).digest('hex').slice(0, 12);
await writeFile(path.join(root, 'assets/map/print-base.json'), JSON.stringify(meta, null, 2) + '\n');
console.log('print-base.json written');
