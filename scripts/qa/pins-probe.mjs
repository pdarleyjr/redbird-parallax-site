// Debug: node scripts/qa/pins-probe.mjs [url] [width] [height] [out.png] — inspect the themed pins on the live or local map.
import { chromium } from '@playwright/test';
const [url = 'http://127.0.0.1:4173/redbird-parallax-site/halloween/?debug', w = '390', h = '844', out = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 2 })).newPage();
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 160)); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('#map').scrollIntoView());
await page.waitForFunction(() => window.__map?.loaded() && document.querySelectorAll('.pin-head').length > 0, null, { timeout: 45000 });
await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(() => {
  const dot = document.querySelector('.pin-dot'), line = document.querySelector('.pin-line'), svg = document.querySelector('.pin-needle');
  const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  return { dot: r(dot), line: r(line), svg: r(svg), lineAttrs: ['x1', 'y1', 'x2', 'y2'].map(a => line.getAttribute(a)), svgStyle: getComputedStyle(svg).overflow, lineStroke: getComputedStyle(line).stroke, dotFill: getComputedStyle(dot).fill };
})));
if (out) await page.locator('#map-stage').screenshot({ path: out });
await browser.close();
