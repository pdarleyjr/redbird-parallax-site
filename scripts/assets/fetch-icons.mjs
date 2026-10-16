// One-time fetch of third-party icon sources into assets/img/source/ (committed, so builds never need the network).
//   Microsoft Fluent Emoji 3D (MIT): https://github.com/microsoft/fluentui-emoji
//   2024 Red Bird originals (owner's own art): pdarleyjr/map-icons at commit 3cd82ff~1
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FLUENT = {
  'fluent-candy': 'Candy', 'fluent-lollipop': 'Lollipop', 'fluent-potion': 'Alembic', 'fluent-bone': 'Bone', 'fluent-black-cat': 'Black cat', 'fluent-headstone': 'Headstone',
  'fluent-bat': 'Bat', 'fluent-ghost': 'Ghost', 'fluent-castle': 'Castle', 'fluent-skull': 'Skull', 'fluent-jack-o-lantern': 'Jack-o-lantern',
  'fluent-spider-web': 'Spider web', 'fluent-spider': 'Spider', 'fluent-candy-corn': 'Candy', 'fluent-crystal-ball': 'Crystal ball', 'fluent-witch': 'Mage', 'fluent-zombie': 'Zombie',
  'fluent-vampire': 'Vampire', 'fluent-skull-bones': 'Skull and crossbones', 'fluent-house': 'House with garden', 'fluent-full-moon': 'Full moon', 'fluent-owl': 'Owl', 'fluent-pumpkin-pie': 'Pie'
};
const USED = ['fluent-candy', 'fluent-lollipop', 'fluent-potion', 'fluent-bone', 'fluent-black-cat', 'fluent-headstone', 'fluent-bat', 'fluent-ghost', 'fluent-castle', 'fluent-skull', 'fluent-jack-o-lantern',
  'fluent-spider-web', 'fluent-crystal-ball', 'fluent-witch', 'fluent-zombie', 'fluent-vampire', 'fluent-skull-bones', 'fluent-full-moon', 'fluent-owl', 'fluent-spider'];
const snake = name => name.toLowerCase().replace(/ /g, '_');

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const dir = path.join(root, 'assets/img/source/fluent');
await mkdir(dir, { recursive: true });
const REQUIRED = new Set(USED.slice(0, 11));
for (const key of USED) {
  const name = FLUENT[key];
  const url = `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/${encodeURIComponent(name)}/3D/${snake(name)}_3d.png`;
  try { await writeFile(path.join(dir, `${key}.png`), await get(url)); console.log('fluent', key); }
  catch (error) { if (REQUIRED.has(key)) throw error; console.warn('optional icon skipped:', key); }
}
await writeFile(path.join(dir, 'LICENSE.txt'), await get('https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/LICENSE'));
console.log('license saved');
