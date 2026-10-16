// Generate 128 px marker icons and data/icons.json. Run: node scripts/assets/make-icons.mjs
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'assets/img/markers');
await mkdir(out, { recursive: true });
const sources = (await readdir(path.join(root, 'assets/img/trail'))).filter(f => f.endsWith('.webp') && f !== 'cardinal.webp')
  .map(f => [path.basename(f, '.webp'), path.join(root, 'assets/img/trail', f)]);
sources.push(['pumpkin', path.join(root, 'assets/img/pumpkin-source.png')]);
const catalog = [];
for (const [key, file] of sources) {
  await sharp(file).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toFile(path.join(out, `${key}.webp`));
  catalog.push({ key, label: key.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), file: `assets/img/markers/${key}.webp` });
}
catalog.sort((a, b) => a.key.localeCompare(b.key));
await writeFile(path.join(root, 'data/icons.json'), JSON.stringify({ icons: catalog }, null, 2) + '\n');
console.log(`${catalog.length} marker icons`);
