// Debug probe: node scripts/qa/probe.mjs <url> — prints console messages and failed requests.
import { chromium } from '@playwright/test';
const url = process.argv[2] || 'http://127.0.0.1:4173/redbird-parallax-site/halloween/?debug';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
page.on('console', m => console.log(`console ${m.type()}: ${m.text()}`));
page.on('pageerror', e => console.log(`pageerror: ${e.message}`));
page.on('request', r => { if (/assets\/(map|vendor)/.test(r.url())) console.log('req', r.url().replace(/^.*redbird-parallax-site\//,'')); });
page.on('response', r => { if (r.status() >= 400) console.log(`HTTP ${r.status()} ${r.url()}`); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('#map').scrollIntoView());
await page.waitForTimeout(4000);
await page.evaluate(() => window.__map && window.__map.jumpTo({ center: [-80.2905, 25.7365], zoom: 17.8 }));
await page.waitForTimeout(3000);
console.log('canvas', await page.evaluate(() => !!document.querySelector('canvas.maplibregl-canvas')));
console.log(JSON.stringify(await page.evaluate(() => { const m = window.__map; if (!m) return 'no map'; return { loaded: m.loaded(), zoom: m.getZoom(), center: m.getCenter(), size: [m.getCanvas().width, m.getCanvas().height], bgOK: m.getLayer('bg') && m.getPaintProperty('bg','background-color'), feats: m.queryRenderedFeatures().length, srcLoaded: m.isSourceLoaded('protomaps') }; })));
console.log('status:', await page.textContent('#map-status'));
await page.locator('#map-stage').screenshot({ path: process.env.TEMP + '/rbshots/map.png' });
await browser.close();




