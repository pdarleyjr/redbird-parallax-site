// Generate 128 px marker icons and data/icons.json. Run: node scripts/assets/make-icons.mjs
// Sources: (a) approved 2026 trail art, (b) the owner's 2024 originals, (c) Microsoft Fluent Emoji 3D (MIT).
// (b) and (c) are rendered on a brand badge so mixed sources read as one set.
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readTokens } from '../map/build-style.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'assets/img/markers');
await mkdir(out, { recursive: true });
const tokens = await readTokens();
const SIZE = 128;

const badgeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="64" cy="64" r="61" fill="${tokens['rb-panel']}" stroke="${tokens['rb-cream']}" stroke-width="3"/></svg>`;
async function badged(file) {
  const art = await sharp(file).resize(84, 84, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(Buffer.from(badgeSVG)).composite([{ input: art, gravity: 'centre' }]).webp({ quality: 85 }).toBuffer();
}
// The 2024 originals are round badges with a baked-in checkerboard/white corner: clip to the circle.
async function clipped(file) {
  const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><circle cx="128" cy="128" r="113"/></svg>');
  const round = await sharp(file).resize(256, 256).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const art = await sharp(round).resize(112, 112).png().toBuffer();
  return sharp(Buffer.from(badgeSVG)).composite([{ input: art, gravity: 'centre' }]).webp({ quality: 85 }).toBuffer();
}
async function plain(file) {
  return sharp(file).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer();
}

const titleCase = key => key.replace(/^fluent-/, '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
const catalog = [];
const add = async (key, label, source, buffer) => { await writeFile(path.join(out, `${key}.webp`), buffer); catalog.push({ key, label, source, file: `assets/img/markers/${key}.webp` }); };

for (const f of (await readdir(path.join(root, 'assets/img/trail'))).filter(f => f.endsWith('.webp') && f !== 'cardinal.webp')) {
  const key = path.basename(f, '.webp');
  await add(key, titleCase(key), 'trail-2026', await plain(path.join(root, 'assets/img/trail', f)));
}
for (const f of (await readdir(path.join(root, 'assets/img/source/2024'))).filter(f => /\.(png|webp)$/.test(f))) {
  const key = f.replace(/\.\w+$/, '');
  await add(key, titleCase(key), 'red-bird-2024', await clipped(path.join(root, 'assets/img/source/2024', f)));
}
for (const f of (await readdir(path.join(root, 'assets/img/source/fluent'))).filter(f => f.endsWith('.png'))) {
  const key = f.replace(/\.png$/, '');
  await add(key, titleCase(key), 'fluent-emoji', await badged(path.join(root, 'assets/img/source/fluent', f)));
}
catalog.sort((a, b) => a.key.localeCompare(b.key));
await writeFile(path.join(root, 'data/icons.json'), JSON.stringify({ icons: catalog }, null, 2) + '\n');
console.log(`${catalog.length} marker icons`);
