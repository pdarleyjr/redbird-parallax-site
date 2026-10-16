// Generate 128 px marker icons (webp with real alpha) and data/icons.json from the processed icon set in tools/flyer-map/icons/.
// That set is shared with the printable flyer: transparent 3D-style art, no boxed backgrounds (owner rule), three 2024 medallions cut to round
// coins, and Microsoft Fluent Emoji 3D (MIT, tools/flyer-map/icons/FLUENT-LICENSE.txt). Run: node scripts/assets/make-icons.mjs
import { readdir, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = path.join(root, 'tools/flyer-map/icons');
const out = path.join(root, 'assets/img/markers');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const sourceOf = key => (key.startsWith('fluent-') ? 'fluent-emoji' : ['blues-boooooo-house', 'sweet-and-spooky-stop'].includes(key) ? 'red-bird-2024' : 'trail-2026');
const title = key => key.replace(/^fluent-/, '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
const catalog = [];
for (const f of (await readdir(src)).filter(f => f.endsWith('.png')).sort()) {
  const key = path.basename(f, '.png');
  await sharp(path.join(src, f)).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().webp({ quality: 82, alphaQuality: 100 }).toFile(path.join(out, `${key}.webp`));
  catalog.push({ key, label: title(key), source: sourceOf(key), file: `assets/img/markers/${key}.webp` });
}
await copyFile(path.join(src, 'FLUENT-LICENSE.txt'), path.join(out, 'FLUENT-LICENSE.txt'));
await writeFile(path.join(root, 'data/icons.json'), JSON.stringify({ icons: catalog }, null, 2) + '\n');
console.log(`${catalog.length} marker icons`);
