import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const API = 'https://redbird-public.pdarleyjr.workers.dev';
const snapshot = JSON.parse(await readFile(new URL('../../data/halloween-2026.public.json', import.meta.url), 'utf8'));
const site = JSON.parse(await readFile(new URL('../../data/site.json', import.meta.url), 'utf8'));
const events = site.events.filter(e => e.status !== 'draft').map(e => ({ id: e.id, kind: e.kind, year: e.year, slug: e.slug, title: e.title, status: e.status, date: e.date, start: e.start, end: e.end, card: { art: e.kind, blurb: null } }));

/** Tests never touch the real public API: it is answered from the bundled data (override per test with page.route). */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(`${API}/**`, route => {
      const url = new URL(route.request().url());
      const body = url.pathname === '/v1/events' ? events : url.pathname.endsWith('/public') ? snapshot : null;
      return body ? route.fulfill({ json: { ok: true, data: body, error: null }, headers: { 'Access-Control-Allow-Origin': '*' } }) : route.fulfill({ status: 404, json: { ok: false, data: null, error: { message: 'not found' } } });
    });
    await use(context);
  }
});
export { expect };
