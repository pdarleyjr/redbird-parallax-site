import { test, expect } from './fixtures.mjs';
import { nearest } from '../../shared/geo.mjs';
import { snapshot, located, axeViolations } from './helpers.mjs';

test.beforeEach(({ browserName }) => { test.skip(browserName !== 'chromium', 'WebGL map specs run on Chromium (software GL)'); test.setTimeout(90000); });

const here = { latitude: located[0].lat + 0.00005, longitude: located[0].lng + 0.00005 };
const mapReady = async page => {
  await page.goto('halloween/?debug');
  await page.evaluate(() => document.querySelector('#map').scrollIntoView());
  await page.waitForFunction(() => window.__map?.loaded() && document.querySelectorAll('.pin-head').length > 0, null, { timeout: 30000 });
};

test('the map is lazy: MapLibre is not requested on the homepage or before the map is near', async ({ page }) => {
  const urls = [];
  page.on('request', r => urls.push(r.url()));
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(urls.filter(u => u.includes('maplibre'))).toEqual([]);
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.goto('halloween/');
  await page.waitForLoadState('networkidle');
  expect(urls.filter(u => u.includes('maplibre-gl.mjs'))).toEqual([]);
});

test('every located house renders exactly once with the correct number; unlocated houses are list-only', async ({ page }) => {
  await mapReady(page);
  const pins = await page.locator('.pin:not(.is-cluster) .pin-head').evaluateAll(els => els.map(e => ({ n: Number(e.querySelector('.pin-num').textContent), src: e.querySelector('img').getAttribute('src'), label: e.getAttribute('aria-label') })));
  expect(pins.map(p => p.n)).toEqual(located.map(h => h.mapNumber)); // one pin per located house, Tab order = number order
  for (const h of located) {
    const pin = pins.find(p => p.n === h.mapNumber);
    expect(pin.src).toMatch(new RegExp(`assets/img/markers/${h.icon}\\.webp$`));
    expect(pin.label).toBe(`Stop ${h.mapNumber}, ${h.name}, ${h.address}`);
  }
  expect(await page.locator('#map-house-list li').count()).toBe(snapshot.houses.length);
  const none = snapshot.houses.filter(h => h.location === 'none');
  for (const h of none) await expect(page.locator(`#map-house-list button[data-id="${h.id}"]`)).toContainText('Map location coming soon');
  expect(await page.evaluate(() => window.__map.getStyle().glyphs.startsWith(location.origin))).toBe(true);
});

test('Find my location shows the nearest house, then visited changes it; no coordinates leave the device', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, geolocation: { ...here, accuracy: 10 }, permissions: ['geolocation'], viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const leaks = [];
  page.on('request', r => { if (r.url().includes(String(here.latitude).slice(0, 8)) || (r.postData() || '').includes(String(here.longitude).slice(0, 8))) leaks.push(r.url()); });
  await mapReady(page);
  await page.locator('#locate-button').click();
  const first = nearest(snapshot.houses, { lat: here.latitude, lng: here.longitude });
  await expect(page.locator('#house-sheet h3')).toHaveText(`Nearest: #${first[0].house.mapNumber} ${first[0].house.name}`);
  await expect(page.locator('#house-sheet .sub')).toContainText('straight-line');
  await page.locator('#house-sheet').getByRole('button', { name: 'Mark visited' }).click();
  await expect(page.locator('#house-sheet h3')).toHaveText(`Nearest: #${first[1].house.mapNumber} ${first[1].house.name}`);
  const link = page.locator('#house-sheet a', { hasText: 'Walking directions' });
  expect(await link.getAttribute('href')).toMatch(/destination=[\d.-]+,[\d.-]+/);
  expect(await link.getAttribute('href')).not.toContain(String(here.latitude).slice(0, 8));
  await expect(page.locator('#map-status')).toHaveText('');
  expect(leaks).toEqual([]);
  await context.close();
});

test('denied location shows the friendly message and the list still works', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  await mapReady(page);
  await context.clearPermissions();
  await page.addInitScript(() => {});
  await page.evaluate(() => { navigator.geolocation.watchPosition = (ok, fail) => { fail({ code: 1 }); return 1; }; });
  await page.locator('#locate-button').click();
  await expect(page.locator('#map-status')).toContainText('Location is off for this site');
  await page.locator('#map-house-list button').first().click();
  await expect(page.locator('#house-sheet')).toBeVisible();
  await context.close();
});

test('selecting a house from the accessible list flies to it and announces details', async ({ page }) => {
  await mapReady(page);
  const h = located[8];
  await page.locator(`#map-house-list button[data-id="${h.id}"]`).click();
  await expect(page.locator('#house-sheet h3')).toContainText(h.name);
  await expect(page.locator('.pin:not(.is-cluster).is-selected:not([hidden]) .pin-head')).toHaveAttribute('aria-label', new RegExp(`^Stop ${h.mapNumber}, `));
});

test('without WebGL2 the page explains and the list remains', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { return type === 'webgl2' ? null : orig.call(this, type, ...a); };
  });
  await page.goto('halloween/');
  await page.locator('#locate-button').click();
  await expect(page.locator('.map-fallback')).toContainText('Interactive map isn’t supported');
  await expect(page.locator('#map-house-list li').first()).toBeVisible();
  await context.close();
});

test('the Halloween page with the map loaded has no axe violations', async ({ page }) => {
  await mapReady(page);
  expect(await axeViolations(page)).toEqual([]);
});

test('a house deep link opens that house', async ({ page }) => {
  await page.goto('halloween/?debug#house-stop-12');
  await expect(page.locator('#house-sheet h3')).toContainText('#12');
});

// Pin overlap, needle length, crossings and clusters at every viewport are measured in map-quality.spec.mjs.

test('visited and nearest states restyle the pins', async ({ page }) => {
  await mapReady(page);
  const h = located[3];
  await page.locator(`#map-house-list button[data-id="${h.id}"]`).click();
  await page.locator('#house-sheet').getByRole('button', { name: 'Mark visited' }).click();
  const pin = page.locator('.pin:not(.is-cluster)', { has: page.locator(`.pin-head[aria-label^="Stop ${h.mapNumber},"]`) });
  await expect(pin).toHaveClass(/is-visited/);
  await expect(pin.locator('.pin-num')).toHaveText('✓');
  await expect(pin.locator('.pin-head')).toHaveAttribute('aria-label', /visited$/);
});

test('Show whole trail on a phone accounts for every house, in pins or clusters, with short needles', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await mapReady(page);
  await page.locator('#show-all').click();
  await page.waitForFunction(() => !window.__map.isMoving() && !window.__map.isZooming(), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const shown = await page.locator('.pin:not([hidden]):not(.is-cluster)').count();
  const grouped = await page.locator('.pin.is-cluster .pin-num').allTextContents();
  expect(shown + grouped.reduce((n, t) => n + Number(t.replace('+', '')), 0)).toBe(located.length);
  const needles = await page.locator('.pin:not([hidden]) .pin-line').evaluateAll(ls => ls.map(l => Math.hypot(Number(l.getAttribute('x1')), Number(l.getAttribute('y1')))));
  for (const n of needles) expect(n - 20).toBeLessThanOrEqual(29);
  if (process.env.QA_SHOTS) await page.locator('#map-stage').screenshot({ path: `${process.env.QA_SHOTS}/map-pins-390-whole.png` });
  await context.close();
});

test('tapping a cluster zooms in and splits it into more pins', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await mapReady(page);
  await page.locator('#show-all').click();
  await page.waitForFunction(() => !window.__map.isMoving() && !window.__map.isZooming(), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const before = await page.locator('.pin.is-cluster:not([hidden])').count();
  expect(before).toBeGreaterThan(0);
  const zoom = await page.evaluate(() => window.__map.getZoom());
  await page.locator('.pin.is-cluster:not([hidden]) .pin-head').first().click();
  await page.waitForFunction(z => window.__map.getZoom() > z + 0.5, zoom);
  expect(await page.evaluate(() => window.__map.getZoom())).toBeGreaterThan(zoom);
  await context.close();
});
