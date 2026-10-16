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
      if (url.pathname === '/api/login') {
        const { password } = route.request().postDataJSON();
        if (password !== 'right') return fail(401, 'That password did not work.');
        state.signedIn = true; return ok({ signedIn: true });
      }
      if (url.pathname === '/api/logout') { state.signedIn = false; return ok({ signedIn: false }); }
      if (!state.signedIn) return fail(401, 'Please sign in.');
      if (url.pathname === '/api/me') return ok({ role: 'admin' });
      if (url.pathname === '/api/houses') return ok({ houses, counts: { published: 1, draft: 0, review: 1, archived: 0, approximate: 1 }, snapshotVersion: 2, boundary: { type: 'Polygon', coordinates: [[[-80.3, 25.733], [-80.286, 25.733], [-80.286, 25.7392], [-80.3, 25.7392], [-80.3, 25.733]]] }, event: { id: 'halloween-2026', status: 'published' } });
      return ok([]);
    }
    const file = path.join(dist, url.pathname === '/' ? 'index.html' : url.pathname);
    try { await route.fulfill({ body: await readFile(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' }); } catch { await route.fulfill({ status: 404, body: 'not found' }); }
  });
  return state;
}

test.beforeEach(({ browserName }) => test.skip(browserName !== 'chromium', 'Admin UI is verified on Chromium'));

test('signed-out visitors see only a password field (autocomplete=current-password) and no data', async ({ page }) => {
  const state = await mount(page);
  await page.goto('https://admin.test/');
  const field = page.getByLabel('Admin password');
  await expect(field).toHaveAttribute('autocomplete', 'current-password');
  await expect(field).toHaveAttribute('type', 'password');
  await expect(page.locator('#tabs')).toBeHidden();
  expect(state.calls).toEqual(['GET /api/me']);
  expect(await axeViolations(page)).toEqual([]);
});

test('a wrong password shows a generic error; the right one opens Houses; sign out returns to the login screen', async ({ page }) => {
  await mount(page);
  await page.goto('https://admin.test/');
  await page.getByLabel('Admin password').fill('wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#login-msg')).toHaveText('That password did not work.');
  await page.getByLabel('Admin password').fill('right');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Manage houses' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByText('zip mismatch')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Admin password')).toBeVisible();
  await expect(page.locator('#tabs')).toBeHidden();
});

test('an expired session sends the user back to the login screen', async ({ page }) => {
  const state = await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await expect(page.getByRole('heading', { name: 'Manage houses' })).toBeVisible();
  state.signedIn = false;
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByLabel('Admin password')).toBeVisible();
  await expect(page.locator('#login-msg')).toContainText('session ended');
});

test('the editor opens with the icon picker and a location section', async ({ page }) => {
  await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await page.getByRole('button', { name: /^Edit/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.locator('#editor input[name=icon]').count()).toBeGreaterThan(30);
  await expect(page.getByRole('button', { name: 'Suggest from address' })).toBeVisible();
  await expect(page.getByLabel('The pin is on the correct house front')).toBeVisible();
});
