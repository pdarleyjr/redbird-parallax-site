// A phone that installed the PREVIOUS release (its service worker, cached manifest and cached icon) must pick up the new manifest name
// and the new icon after the new build is deployed and the page is reloaded once. The previous release's files are kept in
// tests/fixtures/previous-release/ (sw.js, manifest.webmanifest and icons exactly as they were shipped).
import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const previous = rel => readFile(path.join(root, 'tests/fixtures/previous-release', rel));
const current = rel => readFile(path.join(root, rel));
const OLD_FILES = { 'sw.js': 'text/javascript', 'manifest.webmanifest': 'application/manifest+json', 'assets/app/apple-touch-icon.png': 'image/png', 'assets/app/icon-192.png': 'image/png', 'assets/app/icon-512.png': 'image/png', 'assets/app/icon-maskable-512.png': 'image/png' };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

test.use({ serviceWorkers: 'allow' });
test.beforeEach(({ browserName }) => { test.skip(browserName !== 'chromium', 'service worker update flow is checked on Chromium'); test.setTimeout(90000); });

test('previous release installed, new build deployed, one reload: new manifest name and new icon bytes', async ({ page }) => {
  let deployed = 'previous';
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = pathname === '/' ? 'index.html' : pathname.slice(1).replace(/\/$/, '/index.html');
    try {
      if (/^(node_modules|tests|scripts|docs|worker|private|templates|\.git)(\/|$)/.test(rel)) throw new Error('blocked');
      const body = deployed === 'previous' && rel in OLD_FILES ? await previous(rel) : await current(rel);
      res.writeHead(200, { 'Content-Type': OLD_FILES[rel] || TYPES[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const bytesOf = async href => page.evaluate(async url => { const r = await fetch(url); return btoa(String.fromCharCode(...new Uint8Array(await r.arrayBuffer()))); }, new URL(href, page.url()).href);
  const manifestName = async () => page.evaluate(async href => (await (await fetch(href)).json()).name, new URL(await page.locator('link[rel=manifest]').getAttribute('href'), page.url()).href);
  try {
    // 1. The previous release is installed: its worker is running and has cached its manifest and icon.
    await page.goto(origin + '/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    expect(await manifestName(), 'the previous release is installed').toBe('Red Bird Neighborhood Holiday Trails');
    expect(Buffer.from(await bytesOf('assets/app/apple-touch-icon.png'), 'base64').equals(await previous('assets/app/apple-touch-icon.png'))).toBe(true);

    // 2. The new build is deployed and the visitor reloads once.
    deployed = 'new';
    await page.reload();
    const newVersion = /const VERSION = "([0-9a-f]+)"/.exec((await current('sw.js')).toString())[1];
    await expect.poll(() => page.evaluate(async expected => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
      const controller = navigator.serviceWorker.controller;
      if (!controller) return false;
      return await new Promise(resolve => {
        const onMessage = event => { if (event.data?.type === 'VERSION') { navigator.serviceWorker.removeEventListener('message', onMessage); resolve(event.data.version === expected); } };
        navigator.serviceWorker.addEventListener('message', onMessage);
        controller.postMessage({ type: 'GET_VERSION' });
        setTimeout(() => resolve(false), 1500);
      });
    }, newVersion), { timeout: 45000, intervals: [1000] }).toBe(true);

    // 3. What the page gets now: the new manifest name, and the new icon bytes through the versioned URL in the page.
    await page.reload();
    expect(await manifestName()).toBe('Red Bird Events');
    const touchHref = await page.locator('link[rel=apple-touch-icon]:not([sizes])').getAttribute('href');
    expect(touchHref).toMatch(/\?v=[0-9a-f]{10}$/);
    const served = Buffer.from(await bytesOf(touchHref), 'base64');
    expect(served.equals(await current('assets/app/apple-touch-icon.png'))).toBe(true);
    expect(served.equals(await previous('assets/app/apple-touch-icon.png'))).toBe(false);
  } finally {
    server.close();
  }
});
