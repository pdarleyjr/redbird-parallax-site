// Debug: load the site with the service worker, go offline, reload /halloween/ and report what happens.
import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://127.0.0.1:4173/redbird-parallax-site/';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on('console', m => console.log('console', m.type(), m.text().slice(0, 200)));
page.on('pageerror', e => console.log('pageerror', e.message));
page.on('requestfailed', r => console.log('requestfailed', r.url().slice(-80), r.failure()?.errorText));
await page.goto(base);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await page.goto(base + 'halloween/');
await page.waitForTimeout(2500);
console.log('caches', await page.evaluate(async () => { const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).length; return out; }));
await context.setOffline(true);
await page.reload().catch(e => console.log('reload failed', e.message));
await page.waitForTimeout(2500);
console.log('onLine', await page.evaluate(() => navigator.onLine), 'banner', JSON.stringify(await page.textContent('#offline-banner').catch(() => 'missing')), 'cards', await page.locator('.house-card').count());
console.log('controls hidden', await page.evaluate(() => document.querySelector('#house-controls').hidden), 'resources', JSON.stringify(await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name.split('/').slice(-2).join('/') + ':' + r.responseStatus).slice(0, 40))));
await browser.close();

