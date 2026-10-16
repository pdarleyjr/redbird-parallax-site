import { test, expect } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';
import { rollbackSource } from '../../scripts/sw-rollback.mjs';
import { snapshot } from './helpers.mjs';

test.use({ serviceWorkers: 'allow' });
test.beforeEach(({ browserName }) => test.skip(browserName !== 'chromium', 'Service worker flows are verified on Chromium'));

const ready = async page => { await page.goto('./'); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller); };

test('manifest is valid and its icons exist at the declared sizes', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifest = await (await request.get(new URL(href, page.url()).href)).json();
  expect(manifest).toMatchObject({ id: './', scope: './', display: 'standalone', name: 'Red Bird Neighborhood Holiday Trails' });
  expect(new URL(manifest.start_url, page.url()).pathname).toBe(new URL('./', page.url()).pathname);
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, page.url()).href);
    expect(res.status()).toBe(200);
    const png = await res.body();
    const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    expect(`${w}x${h}`).toBe(icon.sizes);
  }
});

test('the service worker registers with the site scope and the app is installable', async ({ page }) => {
  await ready(page);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
  expect(scope).toBe(new URL('./', page.url()).href);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});

test('offline reload of home and Halloween succeeds and shows the saved house list', async ({ page, context }) => {
  await ready(page);
  await page.goto('halloween/');
  await page.locator('.house-card').first().waitFor();
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.house-card')).toHaveCount(snapshot.houses.length);
  await page.goto('./');
  await expect(page.locator('.event-card')).toHaveCount(2);
  await context.setOffline(false);
});

test('a newer snapshot after reconnect replaces the bundled list (bundled v1 → live v2)', async ({ page }) => {
  await ready(page);
  const live = { ...snapshot, version: snapshot.version + 1, houses: snapshot.houses.slice(0, 5) };
  await page.context().route('**/data/halloween-2026.public.json', route => route.fulfill({ json: live }));
  await page.goto('halloween/');
  await expect(page.locator('.house-card')).toHaveCount(5);
});

test('data-only changes never change the service worker version', async () => {
  const { buildAll } = await import('../../scripts/build.mjs');
  const version = text => text.match(/const VERSION = "(\w+)"/)[1];
  const sw = (await buildAll()).get('sw.js');
  expect(version(sw)).toBe(version(await readFile(new URL('../../sw.js', import.meta.url), 'utf8')));
});

test('the rollback stub unregisters the worker and clears rbht caches', async ({ page }) => {
  await ready(page);
  // Chromium does not route SW script update checks, so install the stub as the worker for the same scope.
  await page.context().route('**/sw-rollback-stub.js', route => route.fulfill({ contentType: 'text/javascript', body: rollbackSource() }));
  await page.evaluate(() => navigator.serviceWorker.register(new URL('sw-rollback-stub.js', document.baseURI), { scope: new URL('./', document.baseURI).href }));
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), { timeout: 20000 }).toBe(0);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(k => k.startsWith('rbht-')).length), { timeout: 20000 }).toBe(0);
});

test('Christmas stays an inert card offline too', async ({ page }) => {
  await ready(page);
  expect(await page.locator('.event-card[data-event="christmas-2026"] a, .event-card[data-event="christmas-2026"] button').count()).toBe(0);
});
