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

test('the 15 unapproved houses are not in git: snapshot and decisions only contain approved houses', async () => {
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  const decisions = JSON.parse(await readFile(path.join(root, 'data/reconcile/2026-10-16.decisions.json'), 'utf8'));
  assert.equal(snapshot.houses.length, decisions.approvedNew.length + 31);
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

test('owner decisions are applied: #36 name as submitted, manual pins verified, 46 houses, Fluent attribution and license present', async () => {
  const snapshot = JSON.parse(await readFile(path.join(root, 'data/halloween-2026.public.json'), 'utf8'));
  const byId = Object.fromEntries(snapshot.houses.map(h => [h.id, h]));
  assert.equal(snapshot.houses.length, 46);
  assert.equal(byId['stop-36'].name, 'Just stop for juice and water');
  assert.deepEqual([byId['stop-03'].lat, byId['stop-03'].lng, byId['stop-03'].location], [25.734927, -80.288444, 'verified']);
  assert.deepEqual([byId['stop-25'].lat, byId['stop-25'].lng, byId['stop-25'].location], [25.7367261, -80.2955533, 'verified']);
  assert.equal(snapshot.houses.filter(h => h.location === 'approximate').length, 44);
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
  assert.ok(checked >= 78, `checked ${checked} icons`);
});