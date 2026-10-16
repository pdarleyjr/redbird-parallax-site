// Lighthouse (mobile) against the local preview with budgets from 06-QA. Usage: node scripts/qa/lighthouse.mjs [baseURL] [outDir]
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPreviewServer } from '../serve.mjs';

const out = path.resolve(process.argv[3] || 'docs/qa/2026-holiday-trails/lighthouse');
await mkdir(out, { recursive: true });
let base = process.argv[2];
let server;
if (!base) {
  server = createPreviewServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/redbird-parallax-site/`;
}
const BUDGETS = [
  { name: 'home', path: '', perf: 0.95, a11y: 1, lcp: 2000, cls: 0.05, tbt: 100, kb: 350 },
  { name: 'halloween', path: 'halloween/', perf: 0.90, a11y: 1, lcp: 2500, cls: 0.1, tbt: 200, kb: 500 }
];
const port = 9333;
const chrome = spawn(chromium.executablePath(), [`--remote-debugging-port=${port}`, '--headless=new', '--no-sandbox', '--disable-gpu', `--user-data-dir=${await mkdtemp(path.join(tmpdir(), 'lh-'))}`, 'about:blank'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const rows = [];
let failed = false;
for (const b of BUDGETS) {
  const { lhr } = await lighthouse(base + b.path, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
  await writeFile(path.join(out, `${b.name}.json`), JSON.stringify(lhr, null, 2));
  const a = lhr.audits;
  const row = {
    page: b.name, perf: lhr.categories.performance.score, a11y: lhr.categories.accessibility.score, bp: lhr.categories['best-practices'].score, seo: lhr.categories.seo.score,
    lcp: Math.round(a['largest-contentful-paint'].numericValue), cls: Number(a['cumulative-layout-shift'].numericValue.toFixed(3)), tbt: Math.round(a['total-blocking-time'].numericValue),
    kb: Math.round(a['total-byte-weight'].numericValue / 1024)
  };
  const ok = row.perf >= b.perf && row.a11y >= b.a11y && row.lcp <= b.lcp && row.cls <= b.cls && row.tbt <= b.tbt && row.kb <= b.kb;
  rows.push({ ...row, budget: b, ok });
  if (!ok) failed = true;
  console.log(`${b.name}: perf ${row.perf} a11y ${row.a11y} bp ${row.bp} seo ${row.seo} LCP ${row.lcp}ms CLS ${row.cls} TBT ${row.tbt}ms ${row.kb}KiB ${ok ? 'PASS' : 'FAIL'}`);
}
await writeFile(path.join(out, 'summary.json'), JSON.stringify(rows, null, 2));
chrome.kill();
server?.close();
if (failed) process.exitCode = 1;
