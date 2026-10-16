// Assemble worker/admin-ui/dist: the UI plus the shared tokens, fonts, map assets and shared modules it uses.
import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const worker = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(worker, '..');
const dist = path.join(worker, 'admin-ui/dist');
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets'), { recursive: true });
for (const entry of (await readdir(path.join(worker, 'admin-ui'), { withFileTypes: true })).filter(e => e.isFile())) await cp(path.join(worker, 'admin-ui', entry.name), path.join(dist, entry.name));
const copy = (from, to) => cp(path.join(repo, from), path.join(dist, to), { recursive: true });
await Promise.all([
  copy('assets/css/tokens.css', 'assets/css/tokens.css'), copy('assets/fonts', 'assets/fonts'), copy('assets/img/favicon.png', 'assets/img/favicon.png'),
  copy('assets/img/markers', 'assets/img/markers'), copy('assets/vendor', 'assets/vendor'), copy('data/icons.json', 'assets/icons.json'),
  copy('assets/map/style-night.json', 'assets/map/style-night.json'), copy('assets/map/tiles', 'assets/map/tiles'), copy('assets/map/fonts', 'assets/map/fonts'),
  copy('shared/csv.mjs', 'shared/csv.mjs')
]);
console.log('admin-ui/dist ready');
