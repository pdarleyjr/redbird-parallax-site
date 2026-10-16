// Screenshot pages for visual QA. Usage: node scripts/qa/shots.mjs [outDir] [baseURL]
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve(process.argv[2] || 'docs/qa/2026-holiday-trails/brand');
const base = process.argv[3] || 'http://127.0.0.1:4173/redbird-parallax-site/';
await mkdir(out, { recursive: true });
const pages = [['home', ''], ['halloween', 'halloween/'], ['print', 'halloween/print/'], ['christmas', 'christmas/']];
const sizes = [['390', { width: 390, height: 844 }], ['1440', { width: 1440, height: 1000 }]];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [sizeName, viewport] of sizes) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: sizeName === '390' ? 2 : 1 });
  const page = await context.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(`[${sizeName}] console ${m.type()}: ${m.text()}`); });
  for (const [name, rel] of pages) {
    await page.goto(base + rel, { waitUntil: 'networkidle' });
    await page.waitForTimeout(name === 'halloween' ? 2500 : 600);
    await page.screenshot({ path: path.join(out, `${name}-${sizeName}.png`), fullPage: name !== 'halloween' });
    if (name === 'halloween') await page.screenshot({ path: path.join(out, `${name}-${sizeName}-full.png`), fullPage: true });
  }
  await context.close();
}
await browser.close();
console.log(`screenshots in ${out}`);
