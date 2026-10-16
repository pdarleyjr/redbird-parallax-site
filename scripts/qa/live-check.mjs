// Verify a deployed site with a real browser. Usage: node scripts/qa/live-check.mjs [baseURL] [outDir] [--wait]
// --wait polls until the homepage serves the expected build (up to 10 minutes) before checking.
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const base = (args[0] || 'https://pdarleyjr.github.io/redbird-parallax-site/').replace(/\/?$/, '/');
const out = path.resolve(args[1] || 'docs/qa/2026-holiday-trails/live');
const wait = process.argv.includes('--wait');
await mkdir(out, { recursive: true });
const snapshot = JSON.parse(await readFile(new URL('../../data/halloween-2026.public.json', import.meta.url), 'utf8'));
const results = [];
const check = async (name, fn) => { try { const details = await fn(); results.push({ name, ok: true, details }); console.log('PASS', name, details ?? ''); } catch (e) { results.push({ name, ok: false, error: e.message }); console.log('FAIL', name, e.message.split('\n')[0]); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (wait) {
  for (let i = 0; i < 60; i++) {
    const html = await fetch(base, { cache: 'no-store' }).then(r => r.text()).catch(() => '');
    if (html.includes(`${snapshot.houses.length} houses on the trail`)) break;
    await sleep(10000);
  }
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
const page = await context.newPage();
const problems = [];
page.on('pageerror', e => problems.push(`pageerror ${e.message}`));
page.on('response', r => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });

await check('homepage cards', async () => {
  await page.goto(base, { waitUntil: 'networkidle' });
  const cards = await page.locator('.event-card').count();
  const link = await page.locator('a.event-card').getAttribute('href');
  const xmas = await page.locator('.event-card.is-updating').innerText();
  if (cards !== 2 || link !== 'halloween/' || !/Updating for this year's event/.test(xmas)) throw new Error(`cards=${cards} link=${link}`);
  await page.screenshot({ path: path.join(out, 'home-1280.png'), fullPage: true });
  return `${await page.locator('.card-count').innerText()}`;
});
await check('halloween directory', async () => {
  await page.goto(base + 'halloween/', { waitUntil: 'networkidle' });
  const n = await page.locator('.house-card').count();
  if (n !== snapshot.houses.length) throw new Error(`cards=${n}`);
  const text = await page.locator('body').innerText();
  if (!/Saturday, October 31, 2026/.test(text) || !/6 PM–9 PM/.test(text)) throw new Error('date/hours missing');
  return `${n} houses`;
});
await check('interactive map renders every located house', async () => {
  await page.goto(base + 'halloween/?debug', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('#map').scrollIntoView());
  await page.waitForFunction(() => window.__map?.loaded() && window.__map.isSourceLoaded('houses'), null, { timeout: 45000 });
  const n = await page.evaluate(() => window.__map.getSource('houses').serialize().data.features.length);
  const located = snapshot.houses.filter(h => h.location !== 'none').length;
  if (n !== located) throw new Error(`features=${n} expected=${located}`);
  await page.screenshot({ path: path.join(out, 'halloween-map-1280.png') });
  return `${n} pins`;
});
await check('print page ready', async () => {
  await page.goto(base + 'halloween/print/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#print-ready')?.textContent.includes('Map ready'), null, { timeout: 20000 });
  const markers = await page.locator('#print-overlay g[data-n]').count();
  await page.screenshot({ path: path.join(out, 'print-1280.png'), fullPage: true });
  return `${markers} markers`;
});
await check('manifest, icons, service worker file', async () => {
  const get = async p => { const r = await fetch(base + p); if (!r.ok) throw new Error(`${p} ${r.status}`); return r; };
  const manifest = await (await get('manifest.webmanifest')).json();
  for (const icon of manifest.icons) await get(icon.src);
  const sw = await (await get('sw.js')).text();
  if (!sw.includes('rbht-shell')) throw new Error('sw.js is not the app worker');
  return `${manifest.name}; ${manifest.icons.length} icons; sw ${sw.length} bytes`;
});
await check('live data feed matches the site', async () => {
  const api = JSON.parse(await readFile(new URL('../../data/site.json', import.meta.url), 'utf8')).api.publicBase;
  if (!api) return 'api not configured (static data only)';
  const body = await (await fetch(`${api}/v1/events/halloween-2026/public`)).json();
  if (body.data.houses.length !== snapshot.houses.length) throw new Error(`api has ${body.data.houses.length} houses`);
  return `snapshot v${body.data.version}, ${body.data.houses.length} houses`;
});
await check('no page errors or failed requests', async () => { if (problems.length) throw new Error(problems.slice(0, 5).join(' | ')); return 'clean'; });
await browser.close();
await writeFile(path.join(out, 'live-check.json'), JSON.stringify({ at: new Date().toISOString(), base, results }, null, 2));
if (results.some(r => !r.ok)) process.exitCode = 1;
