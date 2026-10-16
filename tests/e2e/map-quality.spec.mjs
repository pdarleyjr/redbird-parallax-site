// Measured map quality at the sizes people use. Numbers are printed and, with QA_SHOTS set, saved to map-metrics.json.
import { test, expect } from './fixtures.mjs';
import { writeFile } from 'node:fs/promises';
import { located } from './helpers.mjs';

const VIEWPORTS = [[375, 812], [390, 844], [430, 932], [768, 1024], [1440, 900]];
const rows = [];

test.beforeEach(({ browserName }) => { test.skip(browserName !== 'chromium', 'Map metrics are measured on Chromium'); test.setTimeout(120000); });

for (const [w, h] of VIEWPORTS) {
  test(`map quality at ${w}x${h}: default, whole trail and one zoom level in`, async ({ browser }) => {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto('halloween/?debug');
    await page.evaluate(() => document.querySelector('#map').scrollIntoView());
    await page.waitForFunction(() => window.__map?.loaded() && window.__pins?.metrics(), null, { timeout: 45000 });
    const phone = w < 768;
    const settle = async () => { await page.waitForFunction(() => !window.__map.isMoving() && !window.__map.isZooming() && !window.__map.isRotating(), null, { timeout: 30000 }); await page.waitForTimeout(900); };
    const measure = async view => {
      await settle();
      const m = await page.evaluate(() => {
        const x = window.__pins.metrics();
        const R = x.radius, flat = x.mode === 'flat';
        const needles = x.units.map(u => Math.hypot(u.hx - u.ax, u.hy - u.ay) - (flat ? 0 : R));
        // a needle must not pass behind another unit's head
        let behind = 0;
        for (const u of x.units) for (const v of x.units) if (u !== v && !flat) {
          const dx = u.hx - u.ax, dy = u.hy - u.ay, len2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((v.hx - u.ax) * dx + (v.hy - u.ay) * dy) / len2));
          if (Math.hypot(v.hx - (u.ax + t * dx), v.hy - (u.ay + t * dy)) < R - 0.5) behind++;
        }
        return { mode: x.mode, badgePx: R * 2, houses: x.stats.total, clusters: x.stats.clusters, singles: x.stats.singles, maxNeedlePx: Math.round(Math.max(0, ...needles) * 10) / 10, crossings: window.__cross(x.units), headsTouching: window.__close(x.units) < 2 * R - 0.5, needlesBehindHeads: behind, zoom: +window.__map.getZoom().toFixed(2) };
      });
      rows.push({ viewport: `${w}x${h}`, view, ...m });
      return m;
    };

    const def = await measure('default');
    const home = await page.evaluate(() => ({ z: window.__map.getZoom(), c: window.__map.getCenter() }));
    expect(def.crossings, 'no crossing needles').toBe(0);
    expect(def.headsTouching).toBe(false);
    expect(def.needlesBehindHeads, 'no needle behind another head').toBe(0);
    expect(def.clusters, 'clusters in the default view').toBeLessThanOrEqual(12);
    expect(def.singles, 'individual pins in the default view').toBeGreaterThanOrEqual(0.6 * def.houses);
    if (phone) expect(def.maxNeedlePx, 'needle length on a phone').toBeLessThanOrEqual(20.01);
    expect(def.mode).toBe('needles');

    await page.locator('#show-all').click();
    const whole = await measure('whole trail');
    expect(whole.houses).toBe(located.length);
    expect(whole.crossings).toBe(0);
    expect(whole.headsTouching).toBe(false);
    if (phone) { expect(whole.mode).toBe('flat'); expect(whole.badgePx).toBe(28); expect(whole.maxNeedlePx).toBe(0); }

    await page.evaluate(v => window.__map.jumpTo({ zoom: v.z + 1, center: v.c }), home);
    const zoomed = await measure('one level in');
    expect(zoomed.crossings).toBe(0);
    expect(zoomed.headsTouching).toBe(false);
    expect(zoomed.needlesBehindHeads).toBe(0);
    if (phone) expect(zoomed.maxNeedlePx).toBeLessThanOrEqual(20.01);

    if (process.env.QA_SHOTS) {
      await page.locator('#map-stage').screenshot({ path: `${process.env.QA_SHOTS}/map-${w}-zoomed-in.png` });
      await page.evaluate(v => window.__map.jumpTo({ zoom: v.z, center: v.c }), home);
      await settle();
      await page.locator('#map-stage').screenshot({ path: `${process.env.QA_SHOTS}/map-${w}-default.png` });
      await page.locator('#show-all').click(); await settle();
      await page.locator('#map-stage').screenshot({ path: `${process.env.QA_SHOTS}/map-${w}-whole.png` });
    }
    await context.close();
  });
}

test.afterAll(async () => {
  console.table(rows);
  if (process.env.QA_SHOTS && rows.length) await writeFile(`${process.env.QA_SHOTS}/map-metrics.json`, JSON.stringify(rows, null, 2));
});

test('a one-line legend sits under the map and says how to read the pins', async ({ page }) => {
  await page.goto('halloween/');
  await expect(page.locator('#map-legend')).toHaveText('Tap a pumpkin pin for the house · +N = nearby houses, tap to zoom');
});
