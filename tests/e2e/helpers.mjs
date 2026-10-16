import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);

export const snapshot = JSON.parse(await readFile(new URL('../../data/halloween-2026.public.json', import.meta.url), 'utf8'));
export const located = snapshot.houses.filter(h => h.location !== 'none');

const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

export async function axeViolations(page) {
  await page.evaluate(axeSource);
  const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] } }));
  return result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target.join(' ')).slice(0, 4) }));
}

export async function allImages(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  });
}

/** Collect page errors and non-2xx responses. */
export function watch(page) {
  const problems = { errors: [], bad: [], external: [] };
  page.on('pageerror', e => problems.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') problems.errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) problems.bad.push(`${r.status()} ${r.url()}`); });
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost', 'redbird-public.pdarleyjr.workers.dev'].includes(u.hostname) && u.protocol.startsWith('http')) problems.external.push(r.url()); });
  return problems;
}
