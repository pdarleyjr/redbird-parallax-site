// A browser that has the retired Christmas 2025 cache-first service worker installed must end up on the new site after the domain move.
import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const legacySW = await readFile(new URL('../fixtures/legacy-christmas-sw.js', import.meta.url), 'utf8');
const killSwitch = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
const OLD_PAGE = `<!doctype html><title>OLD Christmas site</title><h1 id="which">OLD Christmas 2025</h1><script>if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js')</script>`;
const NEW_PAGE = '<!doctype html><title>NEW Holiday Trails</title><h1 id="which">NEW Red Bird Holiday Trails</h1>';
const STUBS = ['/styles.css', '/script.js', '/manifest.json', '/assets/images/red_bird_holiday_trail.png', '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/assets/icons/apple-touch-icon.png',
  '/assets/images/fox_large.jpg', '/assets/images/fox_small.jpg', '/assets/images/gingerbreadhouse_new_large.jpg', '/assets/images/gingerbreadhouse_new_small.jpg', '/assets/images/holiday-trail-map-2025.png'];

test.use({ serviceWorkers: 'allow' });
test.beforeEach(({ browserName }) => test.skip(browserName !== 'chromium', 'Service worker flows are verified on Chromium'));

test('the kill-switch replaces the cache-first Christmas worker and returning visitors reach the new site', async ({ page }) => {
  const files = new Map([['/', OLD_PAGE], ['/index.html', OLD_PAGE], ['/service-worker.js', legacySW]]);
  for (const p of STUBS) files.set(p, 'stub');
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    const body = files.get(path);
    if (body == null) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html', 'Cache-Control': 'no-cache' });
    res.end(body);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    // 1. A visitor with the old site installed: worker registered, cache filled, old page served by the worker.
    await page.goto(origin + '/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    expect(await page.evaluate(async () => (await caches.keys()).filter(k => k.startsWith('red-bird-holiday-trail-')).length)).toBe(1);
    await expect(page.locator('#which')).toContainText('OLD');

    // 2. The domain now serves the new app and the kill-switch at the same worker URL. The old worker is cache-first, so the first view is still old.
    files.set('/', NEW_PAGE); files.set('/index.html', NEW_PAGE); files.set('/service-worker.js', killSwitch);
    await page.reload();
    await expect(page.locator('#which')).toContainText('OLD'); // cache-first serves the stale page until the kill-switch takes over

    // 3. The browser re-checks the worker script, installs the kill-switch, which clears the old caches, unregisters and reloads the page.
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), { timeout: 30000 }).toBe(0);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(k => k.startsWith('red-bird-holiday-trail-')).length), { timeout: 30000 }).toBe(0);
    await page.reload();
    await expect(page.locator('#which')).toContainText('NEW');
  } finally {
    server.close();
  }
});

test('the kill-switch only deletes the retired site caches and never uses the current worker name', async () => {
  expect(killSwitch).toMatch(/\^red-bird-holiday-trail-/);
  expect(killSwitch).not.toMatch(/rbht-/);
  const sw = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  expect(sw).toContain('rbht-shell-');
  const { readFile: rf } = await import('node:fs/promises');
  expect((await rf(new URL('../../scripts/lib/sw.mjs', import.meta.url), 'utf8'))).not.toContain("'service-worker.js'");
});
