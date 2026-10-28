// node scripts/qa/axe.mjs <url> [w h] — prints axe violations
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const [url, w = '1280', h = '800'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: +w, height: +h } })).newPage();
await p.route('**/assets/vendor/**', r => r.abort());
await p.goto(url, { waitUntil: 'networkidle' });
await p.evaluate(await readFile(require.resolve('axe-core/axe.min.js'), 'utf8'));
const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa'] } }));
for (const v of r.violations) for (const n of v.nodes) console.log(v.id, n.target.join(' '), '|', (n.any[0]?.message || '').slice(0, 160));
console.log('violations', r.violations.length);
await b.close();
