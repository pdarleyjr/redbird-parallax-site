import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../../', import.meta.url);
const PAGES = ['index.html', 'halloween/index.html', 'halloween/trail-map/index.html', 'halloween/print/index.html', 'christmas/index.html', '404.html', 'offline.html'];
const read = async rel => readFile(new URL(rel, root), 'utf8');
const rootOf = rel => (['404.html', 'offline.html'].includes(rel) ? '/' : '../'.repeat(rel.split('/').length - 1));   // these two are served at any depth, so they use absolute paths

for (const rel of PAGES) {
  test(`${rel}: apple-touch-icon, manifest and the app name are on the page`, async () => {
    const html = await read(rel), up = rootOf(rel);
    assert.match(html, new RegExp(`<link rel="apple-touch-icon" href="${up}assets/app/apple-touch-icon\\.png\\?v=[0-9a-f]{10}">`));
    assert.match(html, new RegExp(`<link rel="manifest" href="${up}manifest\\.webmanifest\\?v=[0-9a-f]{10}">`));
    for (const size of [180, 167, 152, 120]) assert.match(html, new RegExp(`<link rel="apple-touch-icon" sizes="${size}x${size}" href="${up}assets/app/apple-touch-icon-${size}\\.png\\?v=[0-9a-f]{10}">`));
    assert.match(html, /<meta name="apple-mobile-web-app-title" content="Red Bird Events">/);
    assert.match(html, /<meta name="application-name" content="Red Bird Events">/);
    assert.match(html, /<title>[^<]+<\/title>/, 'the page title is untouched');
    assert.doesNotMatch(html.match(/<title>([^<]*)<\/title>/)[1], /^Red Bird Events$/);
  });
}

test('the manifest names the app "Red Bird Events" and lists the new icons', async () => {
  const manifest = JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.name, 'Red Bird Events');
  assert.equal(manifest.short_name, 'Red Bird Events');
  const sizes = Object.fromEntries(manifest.icons.map(i => [i.src.replace(/\?v=[0-9a-f]{10}$/, ''), i.purpose]));
  assert.deepEqual(sizes, { 'assets/app/icon-192.png': 'any', 'assets/app/icon-512.png': 'any', 'assets/app/icon-maskable-512.png': 'maskable' });
  assert.ok(manifest.icons.every(i => /\?v=[0-9a-f]{10}$/.test(i.src)), 'every manifest icon URL carries a content hash');
});

const file = rel => new URL(rel, root).pathname.replace(/^\/([A-Za-z]:)/, '$1').replaceAll('%20', ' ');

test('apple-touch icons: 180, 167, 152 and 120 px, fully opaque, and the default is the 180', async () => {
  for (const size of [180, 167, 152, 120]) {
    const touch = sharp(file(`assets/app/apple-touch-icon-${size}.png`));
    const meta = await touch.metadata();
    assert.equal(meta.width, size); assert.equal(meta.height, size);
    assert.equal((await touch.stats()).isOpaque, true, `${size} must be opaque (iOS paints transparency black)`);
  }
  assert.deepEqual(await readFile(new URL('assets/app/apple-touch-icon.png', root)), await readFile(new URL('assets/app/apple-touch-icon-180.png', root)).catch(() => null) ?? await readFile(new URL('assets/app/apple-touch-icon.png', root)));
});

test('after iOS rounds the corners (radius 22.37%) no white or light rim, ring or sliver remains in the corners', async () => {
  for (const size of [180, 167, 152, 120]) {
    const { data, info } = await sharp(file(`assets/app/apple-touch-icon-${size}.png`)).raw().toBuffer({ resolveWithObject: true });
    const radius = size * 0.2237, reach = Math.ceil(size * 0.12);
    let checked = 0, light = 0;
    for (const [ox, oy] of [[0, 0], [size - reach, 0], [0, size - reach], [size - reach, size - reach]]) {
      for (let y = oy; y < oy + reach; y++) for (let x = ox; x < ox + reach; x++) {
        const dx = Math.max(radius - x, x - (size - 1 - radius), 0), dy = Math.max(radius - y, y - (size - 1 - radius), 0);
        if (Math.hypot(dx, dy) > radius) continue;           // cut away by the mask
        checked++;
        const i = (y * info.width + x) * info.channels;
        if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) light++;
      }
    }
    assert.ok(checked > 20, 'corner pixels were examined');
    assert.equal(light, 0, `${size}: light pixels in the corners`);
  }
});

test('the icon set has every size, "any" icons keep transparent corners, maskable is opaque', async () => {
  const sizes = { 'assets/app/icon-192.png': 192, 'assets/app/icon-512.png': 512, 'assets/app/icon-maskable-512.png': 512, 'assets/img/favicon-32.png': 32, 'assets/img/favicon-96.png': 96 };
  for (const [rel, size] of Object.entries(sizes)) {
    const meta = await sharp(await readFile(new URL(rel, root))).metadata();
    assert.equal(meta.width, size, rel); assert.equal(meta.height, size, rel);
  }
  assert.equal((await sharp(file('assets/app/icon-192.png')).stats()).isOpaque, false);
  assert.equal((await sharp(file('assets/app/icon-maskable-512.png')).stats()).isOpaque, true);
});

test('the service worker never serves the manifest or an icon cache-first', async () => {
  const sw = await read('sw.js');
  const branch = sw.slice(sw.indexOf("path === 'manifest.webmanifest'"), sw.indexOf("path === 'manifest.webmanifest'") + 400);
  assert.match(branch, /networkFirst/);
  assert.doesNotMatch(branch, /cacheFirst/);
});

test('the old organizer map is not linked anywhere in the shipped site', async () => {
  const sw = await read('sw.js');
  assert.doesNotMatch(sw, /redbird-trail-2026[.-]/);
  for (const rel of [...PAGES, 'manifest.webmanifest', 'data/site.json']) assert.doesNotMatch(await read(rel), /redbird-trail-2026[.-]|Original October 9 map/, rel);
  const files = await readdir(new URL('assets/maps/', root));
  assert.ok(files.some(f => f.startsWith('redbird-trail-2026')), 'the files stay in the repo, unlinked');
});
