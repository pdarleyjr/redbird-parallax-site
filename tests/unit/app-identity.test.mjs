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
    assert.match(html, new RegExp(`<link rel="apple-touch-icon" href="${up}assets/app/apple-touch-icon\\.png">`));
    assert.match(html, new RegExp(`<link rel="manifest" href="${up}manifest\\.webmanifest">`));
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
  const sizes = Object.fromEntries(manifest.icons.map(i => [i.src, i.purpose]));
  assert.deepEqual(sizes, { 'assets/app/icon-192.png': 'any', 'assets/app/icon-512.png': 'any', 'assets/app/icon-maskable-512.png': 'maskable' });
});

test('apple-touch-icon is 180x180 and fully opaque (iOS paints transparency black); maskable is opaque too', async () => {
  const touch = sharp(new URL('assets/app/apple-touch-icon.png', root).pathname.replace(/^\/([A-Za-z]:)/, '$1').replaceAll('%20', ' '));
  const meta = await touch.metadata();
  assert.equal(meta.width, 180); assert.equal(meta.height, 180);
  assert.equal((await touch.stats()).isOpaque, true);
});

test('the icon set has every size', async () => {
  const sizes = { 'assets/app/icon-192.png': 192, 'assets/app/icon-512.png': 512, 'assets/app/icon-maskable-512.png': 512, 'assets/img/favicon-32.png': 32, 'assets/img/favicon-96.png': 96 };
  for (const [rel, size] of Object.entries(sizes)) {
    const meta = await sharp(await readFile(new URL(rel, root))).metadata();
    assert.equal(meta.width, size, rel); assert.equal(meta.height, size, rel);
  }
});

test('the old organizer map is not linked anywhere in the shipped site', async () => {
  const sw = await read('sw.js');
  assert.doesNotMatch(sw, /redbird-trail-2026[.-]/);
  for (const rel of [...PAGES, 'manifest.webmanifest', 'data/site.json']) assert.doesNotMatch(await read(rel), /redbird-trail-2026[.-]|Original October 9 map/, rel);
  const files = await readdir(new URL('assets/maps/', root));
  assert.ok(files.some(f => f.startsWith('redbird-trail-2026')), 'the files stay in the repo, unlinked');
});
