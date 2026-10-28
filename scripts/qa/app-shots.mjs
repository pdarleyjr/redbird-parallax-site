// node scripts/qa/app-shots.mjs <outDir> [base] — screenshots of every view at 390x844 (phone) and 1440x900 (desktop), API from bundled data.
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const [out = 'docs/qa/2026-holiday-trails/round5', base = 'http://127.0.0.1:4173/redbird-parallax-site/'] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const snap = JSON.parse(await readFile('data/halloween-2026.public.json', 'utf8'));
const h1 = snap.houses[0];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const make = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768, geolocation: { latitude: h1.lat + 0.00006, longitude: h1.lng + 0.00006, accuracy: 10 }, permissions: ['geolocation'] });
  await ctx.route('https://redbird-public.pdarleyjr.workers.dev/**', r => r.fulfill({ json: { ok: true, data: r.request().url().endsWith('/public') ? snap : [], error: null }, headers: { 'Access-Control-Allow-Origin': '*' } }));
  return ctx.newPage();
};
const settle = async p => { await p.waitForFunction(() => window.__map?.loaded() && !window.__map.isMoving() && window.__pins?.metrics()); await p.waitForTimeout(2200); };
// phone
let p = await make(390, 844);
await p.goto(base, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/home-390.png` });
await p.goto(base + 'halloween/?debug', { waitUntil: 'networkidle' }); await settle(p);
await p.screenshot({ path: `${out}/map-peek-prompt-390.png` });
await p.locator('#dock .prompt button').click(); await p.waitForFunction(() => document.querySelector('#house-sheet h3')?.textContent.startsWith('Nearest')); await settle(p);
await p.screenshot({ path: `${out}/map-peek-390.png` });
await p.locator('#dock-handle').click(); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/map-half-390.png` });
await p.locator('#dock-handle').click(); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/map-full-390.png` });
for (const v of ['houses', 'info', 'more']) { await p.evaluate(x => { location.hash = '#' + x; }, v); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${v}-390.png` }); }
await p.evaluate(() => { location.hash = '#houses'; }); await p.waitForTimeout(700);
await p.locator('#house-list .hrow').nth(2).locator('[data-visited]').check(); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/houses-visited-390.png` });
// desktop
p = await make(1440, 900);
await p.goto(base + 'halloween/?debug', { waitUntil: 'networkidle' }); await settle(p);
await p.locator('#dock .prompt button').click(); await p.waitForFunction(() => document.querySelector('#house-sheet h3')?.textContent.startsWith('Nearest')); await settle(p);
await p.screenshot({ path: `${out}/desktop-map-1440.png` });
for (const v of ['houses', 'info', 'more']) { await p.locator(`#tabbar a[data-tab="${v}"]`).click(); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/desktop-${v}-1440.png` }); }
await p.goto(base, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/home-1440.png` });
await b.close();
