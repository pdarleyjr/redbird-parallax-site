// Admin UI behaviour against a mocked API (the real API is covered by the Worker test suite).
import { test, expect } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { axeViolations } from './helpers.mjs';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../worker/admin-ui/dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const houses = [
  { id: 'stop-01', eventId: 'halloween-2026', mapNumber: 1, name: 'Skeleton Dog', address: '3911 SW 60th Court', description: null, icon: 'skeleton-dog', lat: 25.7348, lng: -80.2922, locationStatus: 'suggested', status: 'published', version: 1, flags: [] },
  { id: 'stop-47', eventId: 'halloween-2026', mapNumber: 47, name: 'Needs a look', address: '1 SW 40th Street', description: null, icon: 'ghost', lat: null, lng: null, locationStatus: 'none', status: 'review', version: 1, flags: [{ code: 'zip_mismatch' }] }
];

async function mount(page, { signedIn = false } = {}) {
  const state = { signedIn, calls: [] };
  await page.route('https://admin.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      state.calls.push(`${route.request().method()} ${url.pathname}`);
      const ok = data => route.fulfill({ json: { ok: true, data, error: null } });
      const fail = (status, message) => route.fulfill({ status, json: { ok: false, data: null, error: { message } } });
      if (!state.signedIn) return fail(401, 'Please sign in.');
      if (url.pathname === '/api/me') return ok({ email: 'admin@example.invalid' });
      if (url.pathname === '/api/houses') return ok({ houses, counts: { published: 1, draft: 0, review: 1, archived: 0, approximate: 1 }, snapshotVersion: 2, boundary: { type: 'Polygon', coordinates: [[[-80.3, 25.733], [-80.286, 25.733], [-80.286, 25.7392], [-80.3, 25.7392], [-80.3, 25.733]]] }, event: { id: 'halloween-2026', status: 'published' } });
      return ok([]);
    }
    const file = path.join(dist, url.pathname === '/' ? 'index.html' : url.pathname);
    try { await route.fulfill({ body: await readFile(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' }); } catch { await route.fulfill({ status: 404, body: 'not found' }); }
  });
  return state;
}

test.beforeEach(({ browserName }) => test.skip(browserName !== 'chromium', 'Admin UI is verified on Chromium'));

test('a signed-in admin sees the email, the tabs and the house list; there is no password field', async ({ page }) => {
  await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await expect(page.getByRole('heading', { name: 'Manage houses' })).toBeVisible();
  await expect(page.locator('#who')).toContainText('admin@example.invalid');
  await expect(page.locator('#who a')).toHaveAttribute('href', '/cdn-cgi/access/logout');
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByText('zip mismatch')).toBeVisible();
  if (process.env.QA_SHOTS) await page.screenshot({ path: `${process.env.QA_SHOTS}/admin-houses.png` });
  expect(await axeViolations(page)).toEqual([]);
});

test('a refused or expired session explains and offers a reload (which re-runs Access)', async ({ page }) => {
  const state = await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await expect(page.getByRole('heading', { name: 'Manage houses' })).toBeVisible();
  state.signedIn = false;
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('heading', { name: 'Sign-in needed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload and sign in' })).toBeVisible();
  await expect(page.locator('#tabs')).toBeHidden();
});
test('the editor opens with the icon picker and a location section', async ({ page }) => {
  await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await page.getByRole('button', { name: /^Edit/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.locator('#editor input[name=icon]').count()).toBeGreaterThan(30);
  await expect(page.getByRole('button', { name: 'Suggest from address' })).toBeVisible();
  await expect(page.getByLabel('The pin is on the correct house front')).toBeVisible();
  if (process.env.QA_SHOTS) await page.screenshot({ path: `${process.env.QA_SHOTS}/admin-editor.png` });
});
