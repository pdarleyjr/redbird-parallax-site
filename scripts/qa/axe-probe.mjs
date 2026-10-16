// Debug: node scripts/qa/axe-probe.mjs <url> <width> <height> — prints full axe violation details.
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const [url = 'http://127.0.0.1:4173/redbird-parallax-site/halloween/?debug', w = '412', h = '915'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, isMobile: true, hasTouch: true })).newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.locator('#map').scrollIntoViewIfNeeded();
await page.waitForFunction(() => window.__map?.loaded(), null, { timeout: 30000 }).catch(() => {});
await page.evaluate(await readFile(require.resolve('axe-core/axe.min.js'), 'utf8'));
const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] } }));
for (const v of result.violations) for (const n of v.nodes) console.log(v.id, n.target.join(' '), '|', n.any.map(a => a.message).join(' / ').slice(0, 300), n.any.flatMap(a => a.relatedNodes.map(r => r.html.slice(0, 90))).join(' ; '));
await browser.close();
