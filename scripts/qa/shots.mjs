// node scripts/qa/shots.mjs <outDir> [width height] — screenshots of every Halloween view (API answered from the bundled data).
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const [out = 'docs/qa/shots', w = '390', h = '844', base = 'http://127.0.0.1:4173/redbird-parallax-site/'] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const snap = JSON.parse(await readFile('data/halloween-2026.public.json', 'utf8'));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, isMobile: +w < 768, hasTouch: +w < 768 });
await ctx.route('https://redbird-public.pdarleyjr.workers.dev/**', r => r.fulfill({ json: { ok: true, data: r.request().url().endsWith('/public') ? snap : [], error: null }, headers: { 'Access-Control-Allow-Origin': '*' } }));
const p = await ctx.newPage();
p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('console', m.type(), m.text().slice(0, 200)); });
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto(base + 'halloween/?debug', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__map?.loaded() && window.__pins?.metrics(), null, { timeout: 60000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/map-peek-${w}.png` });
for (const view of ['houses', 'info', 'more']) { await p.evaluate(v => { location.hash = '#' + v; }, view); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${view}-${w}.png` }); }
await p.evaluate(() => { location.hash = '#map'; }); await p.waitForTimeout(800);
await b.close();
