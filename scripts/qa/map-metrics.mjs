// node scripts/qa/map-metrics.mjs [url] [outDir] — measures the live map at several viewports and views; prints JSON, saves stage screenshots.
import { chromium } from '@playwright/test';
const [url = 'http://127.0.0.1:4173/redbird-parallax-site/halloween/?debug', out = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const rows = [];
for (const [w, h] of [[375, 812], [390, 844], [430, 932], [768, 1024], [1440, 900]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('#map').scrollIntoView());
  await page.waitForFunction(() => window.__map?.loaded() && window.__pins?.metrics(), null, { timeout: 60000 });
  const measure = async view => {
    await page.waitForTimeout(1800);
    const m = await page.evaluate(() => {
      const x = window.__pins.metrics(), R = x.radius;
      return { mode: x.mode, badge: R * 2, ...x.stats, houses: x.stats.total, zoom: +window.__map.getZoom().toFixed(2), crossings: window.__cross(x.units), headsOverlap: window.__close(x.units) < 2 * R, needleMax: Math.round(x.stats.maxNeedle * 10) / 10 };
    });
    rows.push({ viewport: `${w}x${h}`, view, ...m });
    if (out) await page.locator('#map-stage').screenshot({ path: `${out}/map-${w}-${view}.png` });
  };
  await measure('default');
  const home = await page.evaluate(() => ({ z: window.__map.getZoom(), c: window.__map.getCenter() }));
  await page.locator('#show-all').click(); await measure('whole');
  await page.evaluate(h => window.__map.jumpTo({ zoom: h.z + 1, center: h.c }), home); await measure('zoomed-in');
  await page.close();
}
console.table(rows);
await browser.close();
