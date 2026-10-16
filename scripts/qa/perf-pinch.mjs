// Debug: node scripts/qa/perf-pinch.mjs [url] — 4x CPU throttle, simulated pinch (zoom steps every frame): frame times, long tasks, pin layout work.
import { chromium } from '@playwright/test';
const url = process.argv[2] || 'http://127.0.0.1:4173/redbird-parallax-site/halloween/?debug';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('#map').scrollIntoView());
await page.waitForFunction(() => window.__map?.loaded() && document.querySelectorAll('.pin-head').length > 0, null, { timeout: 60000 });
await page.waitForTimeout(2000);
if (process.argv.includes('--bare')) await page.evaluate(() => document.querySelectorAll('.pin').forEach(e => e.remove()));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const result = await page.evaluate(async () => {
  const map = window.__map;
  const frames = [], longTasks = [];
  new PerformanceObserver(l => l.getEntries().forEach(e => longTasks.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] });
  let pinWrites = 0;
  const mo = new MutationObserver(m => { pinWrites += m.length; });
  document.querySelectorAll('.pin').forEach(p => mo.observe(p, { attributes: true, attributeFilter: ['style', 'hidden'] }));
  const wait = () => new Promise(r => requestAnimationFrame(r));
  let last = performance.now();
  const start = map.getZoom();
  for (let i = 0; i < 40; i++) { map.jumpTo({ zoom: start + i * 0.04 }); await wait(); const t = performance.now(); frames.push(t - last); last = t; }
  const duringGesture = pinWrites; // layout runs on moveend only
  const t0 = performance.now(); await new Promise(r => map.once('idle', r)); const settle = performance.now() - t0;
  await wait(); await wait();
  frames.sort((a, b) => a - b);
  return { frames: frames.length, medianMs: +frames[frames.length >> 1].toFixed(1), p95Ms: +frames[Math.floor(frames.length * .95)].toFixed(1), maxMs: +frames[frames.length - 1].toFixed(1), over16: frames.filter(f => f > 16.7).length, longTasks, pinStyleWritesDuringGesture: duringGesture, pinStyleWritesAfter: pinWrites - duringGesture, settleMs: +settle.toFixed(0) };
});
console.log(JSON.stringify(result));
await browser.close();
