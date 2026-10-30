import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { root, buildAll } from '../../scripts/build.mjs';
import { buildStyles, readTokens, MAP_SHADES } from '../../scripts/map/build-style.mjs';

const tracked = () => execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const TEXT = /\.(html|css|js|mjs|json|md|yml|yaml|webmanifest|geojson|sql|svg|txt|jsonc)$/;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b(?![-\w])|rgba?\(\s*\d|hsla?\(\s*\d/;

test('all colors are defined once in tokens.css; no other stylesheet uses raw colors', async () => {
  const files = (await readdir(path.join(root, 'assets/css'))).filter(f => f.endsWith('.css') && f !== 'tokens.css');
  assert.ok(files.length >= 3);
  for (const file of files) {
    const css = await readFile(path.join(root, 'assets/css', file), 'utf8');
    assert.doesNotMatch(css, RAW_COLOR, `${file} contains a raw color`);
  }
});

test('generated HTML has no raw colors except the theme-color meta', async () => {
  const outputs = await buildAll();
  for (const [file, content] of outputs) {
    if (!file.endsWith('.html')) continue;
    const stripped = content.replace(/<meta name="theme-color" content="#[0-9a-f]{6}">/, '').replace(/<script id="[\w-]+" type="application\/json">[\s\S]*?<\/script>/g, '');
    assert.doesNotMatch(stripped, RAW_COLOR, `${file} contains a raw color`);
  }
});

test('brand tokens match the flyer palette in 04-UX-SPEC', async () => {
  const t = await readTokens();
  const expected = { 'rb-sky': '#022255', 'rb-sky-deep': '#000a20', 'rb-panel': '#131127', 'rb-cardinal': '#e8200c', 'rb-neon-orange': '#f85818', 'rb-cream': '#fdeed3', 'rb-text': '#fbf3e3', 'rb-ink': '#08132b', 'rb-gold': '#fcd272', 'rb-amber': '#fa8e29', 'rb-coral': '#f9a066', 'rb-violet': '#8858c8' };
  for (const [name, hex] of Object.entries(expected)) assert.equal(t[name], hex, name);
  assert.doesNotMatch(Object.values(t).join(' '), /#0b0e1d|#ff7a1a/i, 'old palette must be gone');
});

test('map styles only use token colors plus the documented map-only shades; no icons or sprite', async () => {
  const t = await readTokens();
  const allowed = new Set([...Object.values(t), ...Object.values(MAP_SHADES.night), ...Object.values(MAP_SHADES.print)].map(c => c.toLowerCase()));
  const styles = await buildStyles();
  for (const [name, style] of Object.entries(styles)) {
    const found = new Set();
    (function walk(v) { if (typeof v === 'string') { if (/^#|^rgb/i.test(v)) found.add(v.toLowerCase()); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(style);
    for (const color of found) assert.ok(allowed.has(color), `${name} style uses ${color}`);
    assert.equal(style.sprite, undefined);
    assert.equal(style.layers.filter(l => l.layout?.['icon-image']).length, 0);
    const fonts = new Set(style.layers.flatMap(l => l.layout?.['text-font'] || []));
    for (const font of fonts) await readFile(path.join(root, 'assets/map/fonts', font, '0-255.pbf'));
  }
  const committed = JSON.parse(await readFile(path.join(root, 'assets/map/style-night.json'), 'utf8'));
  assert.deepEqual(committed, styles.night, 'style-night.json is stale: run npm run styles');
});

test('generated pages use no root-absolute URLs (404 and offline excepted)', async () => {
  const outputs = await buildAll();
  for (const [file, content] of outputs) {
    if (!/\.(html|js|webmanifest)$/.test(file) || ['404.html', 'offline.html', 'sw.js'].includes(file)) continue;
    assert.doesNotMatch(content, /(?:href|src|action)="\/(?!\/)/, `${file} has a root-absolute attribute`);
    assert.doesNotMatch(content, /url\(\//, file);
  }
  for (const file of (await readdir(path.join(root, 'assets/css'))).filter(f => f.endsWith('.css'))) assert.doesNotMatch(await readFile(path.join(root, 'assets/css', file), 'utf8'), /url\(\s*['"]?\//);
});

test('no innerHTML and no external map-app links outside shared/directions.mjs', () => {
  for (const file of tracked().filter(f => /^(assets\/js|shared|scripts|worker\/(src|admin-ui))\/.*\.(js|mjs)$/.test(f) && !f.includes('vendor'))) {
    const text = execFileSyncRead(file);
    assert.doesNotMatch(text, /\binnerHTML\b|insertAdjacentHTML|document\.write/, `${file} uses unsafe HTML APIs`);
    if (file !== 'shared/directions.mjs') assert.doesNotMatch(text, /google\.com\/maps|maps\.apple\.com/, `${file} builds a map link`);
  }
});
const execFileSyncRead = file => execFileSync('git', ['show', `:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

test('privacy scan: no emails or phone numbers in tracked files; private data is ignored', () => {
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
  const phone = /(?<![\d.])\(?\b[2-9]\d{2}\)?[-. ]\d{3}[-. ]\d{4}\b(?!\d)/g;
  const allowedEmail = /@(example\.(com|invalid|org)|users\.noreply\.github\.com|anthropic\.com)$/i;
  const offenders = [];
  for (const file of tracked().filter(f => TEXT.test(f) && !f.includes('package-lock') && !f.includes('vendor/'))) {
    let text;
    try { text = execFileSyncRead(file); } catch { continue; }
    for (const m of text.match(email) || []) if (!allowedEmail.test(m)) offenders.push(`${file}: email-like`);
    for (const m of text.match(phone) || []) offenders.push(`${file}: phone-like`);
  }
  assert.deepEqual([...new Set(offenders)], []);
  for (const probe of ['private/x.csv', 'registrations.csv']) {
    assert.doesNotThrow(() => execFileSync('git', ['check-ignore', '-q', probe], { cwd: root }), `${probe} must be ignored`);
  }
});

test('snapshot and decisions only contain approved houses: 31 original + 15 (Oct 16) + 6 (Oct 23) + 4 (Oct 30)', async () => {
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  const oct16 = JSON.parse(await readFile(path.join(root, 'data/reconcile/2026-10-16.decisions.json'), 'utf8'));
  const oct23 = JSON.parse(await readFile(path.join(root, 'data/reconcile/2026-10-23.decisions.json'), 'utf8'));
  assert.equal(oct16.approvedNew.length, 15);
  const oct30 = JSON.parse(await readFile(path.join(root, 'data/reconcile/2026-10-30.decisions.json'), 'utf8'));
  assert.equal(oct23.approvedNew.length, 6);
  assert.equal(oct30.approvedNew.length, 4);
  assert.equal(snapshot.houses.length, 31 + oct16.approvedNew.length + oct23.approvedNew.length + oct30.approvedNew.length);
});

test('the six houses added from the Oct 23 export are published with the agreed names, addresses, pins and icons', async () => {
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  const byNumber = Object.fromEntries(snapshot.houses.map(h => [h.mapNumber, h]));
  const expected = {
    47: ['Refreshment Station', '5795 SW 35th Street', 25.7382364, -80.2890194, 'fluent-cup-with-straw'],
    48: ['Scully’s Den', '6235 SW 38th Street', 25.7357145, -80.2954973, 'fluent-skull-and-crossbones'],
    49: ['Bob the Ghost!', '3726 SW 60th Avenue', 25.736422, -80.291807, 'rb-bob-the-ghost'],
    50: ['The Little Boo House', '5740 SW 39th Street', 25.7352696, -80.2875565, 'rb-little-boo-house'],
    51: ['CARME-NAUGHTY OR NICE?!', '6285 SW 38th Street', 25.7361045, -80.2965024, 'fluent-smiling-face-with-horns'],
    52: ['Coraline’s Button-Eye Parlour', '3610 SW 58th Court', 25.7370017, -80.2901682, 'rb-button-eye-parlour']
  };
  for (const [n, [name, address, lat, lng, icon]] of Object.entries(expected)) {
    const h = byNumber[n];
    assert.deepEqual([h.id, h.name, h.address, h.lat, h.lng, h.icon, h.location], [`stop-${n}`, name, address, lat, lng, icon, 'approximate'], `#${n}`);
  }
  assert.equal(byNumber[7].address, '5795 SW 39th Street', '#7 is a different house from #47 (39th vs 35th)');
});

test('every published house resolves to an existing icon file and the icon catalog is consistent', async () => {
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  const catalog = JSON.parse(await readFile(path.join(root, 'data/icons.json'), 'utf8')).icons;
  const keys = new Set(catalog.map(i => i.key));
  for (const house of snapshot.houses) {
    assert.ok(keys.has(house.icon), `${house.id} uses unknown icon ${house.icon}`);
    await readFile(path.join(root, 'assets/img/markers', `${house.icon}.webp`));
  }
  for (const icon of catalog) await readFile(path.join(root, icon.file));
});

test('owner decisions are applied: #36 name as submitted, manual pins verified, 56 houses, Fluent attribution and license present', async () => {
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  const byId = Object.fromEntries(snapshot.houses.map(h => [h.id, h]));
  assert.equal(snapshot.houses.length, 56);
  assert.equal(byId['stop-36'].name, 'Just stop for juice and water');
  assert.deepEqual([byId['stop-03'].lat, byId['stop-03'].lng, byId['stop-03'].location], [25.734927, -80.288444, 'verified']);
  assert.deepEqual([byId['stop-25'].lat, byId['stop-25'].lng, byId['stop-25'].location], [25.7367261, -80.2955533, 'verified']);
  assert.equal(snapshot.houses.filter(h => h.location === 'approximate').length, 54);
  assert.equal(byId['stop-33'].icon, 'blues-boooooo-house'); assert.equal(byId['stop-40'].icon, 'fluent-spider-web'); assert.equal(byId['stop-36'].icon, 'sweet-and-spooky-stop');
  assert.match(await readFile(path.join(root, 'assets/img/markers/FLUENT-LICENSE.txt'), 'utf8'), /MIT License/);
  const footer = (await buildAll()).get('halloween/index.html');
  assert.match(footer, /Fluent Emoji/);
});

test('every marker icon has real alpha transparency at all four corners (no boxed or checkerboard backgrounds)', async () => {
  const { default: sharp } = await import('sharp');
  const dirs = ['tools/flyer-map/icons', 'assets/img/markers'];
  let checked = 0;
  for (const dir of dirs) {
    for (const file of (await readdir(path.join(root, dir))).filter(f => /\.(png|webp)$/.test(f))) {
      const { data, info } = await sharp(path.join(root, dir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.channels, 4, `${dir}/${file} has no alpha channel`);
      const at = (x, y) => data[(y * info.width + x) * 4 + 3];
      for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) assert.ok(at(x, y) < 16, `${dir}/${file} corner (${x},${y}) is opaque (alpha ${at(x, y)})`);
      checked++;
    }
  }
  assert.ok(checked >= 90, `checked ${checked} icons`);
});
test('the app and the printed flyer use the same icon for every house (ICONS in tools/flyer-map/build_flyer.py)', async () => {
  const py = await readFile(path.join(root, 'tools/flyer-map/build_flyer.py'), 'utf8');
  const block = py.match(/ICONS\s*=\s*\{([\s\S]*?)\n\}/)[1];
  const flyer = new Map([...block.matchAll(/(\d+)\s*:\s*"([\w-]+)"/g)].map(m => [Number(m[1]), m[2]]));
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  assert.equal(flyer.size, snapshot.houses.length);
  for (const h of snapshot.houses) assert.equal(h.icon, flyer.get(h.mapNumber), `#${h.mapNumber} ${h.name}: app uses ${h.icon}, flyer uses ${flyer.get(h.mapNumber)}`);
});

test('the four houses added from the Oct 30 export are published with the agreed names, addresses, pins and icons', async () => {
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  const byNumber = Object.fromEntries(snapshot.houses.map(h => [h.mapNumber, h]));
  const expected = {
    53: ['Sand snake Haunt', '3930 SW 60th Avenue', 25.734832645454546, -80.29169068181818, 'fluent-snake'],
    54: ['Cancela’s Crypt', '3715 SW 60th Place', 25.73648731818182, -80.29292733636363, 'fluent-coffin'],
    55: ['Halloween Lab', '3801 SW 60th Avenue', 25.73590377777778, -80.29123465555556, 'fluent-test-tube'],
    56: ['No Name House', '3800 SW 59th Avenue', 25.735925394117647, -80.29098590000001, 'fluent-house']
  };
  for (const [n, [name, address, lat, lng, icon]] of Object.entries(expected)) {
    const h = byNumber[n];
    assert.deepEqual([h.id, h.name, h.address, h.lat, h.lng, h.icon, h.location], [`stop-${n}`, name, address, lat, lng, icon, 'approximate'], `#${n}`);
  }
  // same house numbers on different streets are different houses
  assert.equal(byNumber[45].address, '3930 SW 60th Place');
  assert.equal(byNumber[44].address, '3801 SW 60th Place');
  assert.equal(byNumber[10].address, '3800 SW 58th Avenue');
});
