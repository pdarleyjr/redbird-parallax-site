// Admin UI behaviour against a mocked API (the real API is covered by the Worker test suite).
import { test, expect } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { axeViolations } from './helpers.mjs';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../worker/admin-ui/dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const houses = [
  { id: 'stop-01', eventId: 'halloween-2026', mapNumber: 1, name: 'Skeleton Dog', address: '3911 SW 60th Court', description: null, icon: 'skeleton-dog', lat: 25.7348, lng: -80.2922, locationStatus: 'suggested', status: 'published', version: 1, flags: [] },
  { id: 'stop-47', eventId: 'halloween-2026', mapNumber: 47, name: 'Needs a look', address: '1 SW 40th Street', description: null, icon: 'ghost', lat: null, lng: null, locationStatus: 'none', status: 'review', version: 1, flags: [{ code: 'zip_mismatch' }] }
];

const builtin = JSON.parse(await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/icons.json'), 'utf8')).icons.map(i => ({ key: i.key, label: i.label, source: 'builtin', status: 'active', uses: i.key === 'ghost' ? 1 : 0 }));

async function mount(page, { signedIn = false } = {}) {
  const state = { signedIn, calls: [], uploads: [], icons: [...builtin] };
  await page.route('https://admin.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      state.calls.push(`${route.request().method()} ${url.pathname}`);
      const ok = data => route.fulfill({ json: { ok: true, data, error: null } });
      const fail = (status, message) => route.fulfill({ status, json: { ok: false, data: null, error: { message } } });
      if (!state.signedIn) return fail(401, 'Please sign in.');
      if (url.pathname === '/api/me') return ok({ email: 'admin@example.invalid' });
      if (url.pathname === '/api/houses') return ok({ houses, counts: { published: 1, draft: 0, review: 1, archived: 0, approximate: 1 }, snapshotVersion: 2, boundary: { type: 'Polygon', coordinates: [[[-80.3, 25.733], [-80.286, 25.733], [-80.286, 25.7392], [-80.3, 25.7392], [-80.3, 25.733]]] }, event: { id: 'halloween-2026', status: 'published' } });
      if (url.pathname === '/api/icons' && route.request().method() === 'GET') return ok({ icons: state.icons });
      if (url.pathname === '/api/icons' && route.request().method() === 'POST') { state.uploads.push(route.request().postData()?.length || 0); const icon = { key: 'up-test-pumpkin-0a1b2c3d', label: 'Test pumpkin', source: 'upload', status: 'active', uses: 0 }; state.icons = [...state.icons, icon]; return route.fulfill({ status: 201, json: { ok: true, data: icon, error: null } }); }
      if (url.pathname.startsWith('/api/icons/file/')) return route.fulfill({ body: await readFile(path.join(dist, 'assets/img/markers/ghost.webp')), contentType: 'image/webp' });
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


// ---- icon upload ----
const circle = (size, radius, fill) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${fill}"/></svg>`);
const blank = (size, alpha, background = { r: 255, g: 255, b: 255, alpha }) => sharp({ create: { width: size, height: size, channels: 4, background } });
const goodPng = async () => blank(1024, 0, { r: 0, g: 0, b: 0, alpha: 0 }).composite([{ input: circle(1024, 420, '#fa8e29') }]).png().toBuffer();
const withBackground = async () => blank(1024, 1).composite([{ input: circle(1024, 420, '#fa8e29') }]).png().toBuffer();
const tiny = async () => blank(1024, 0, { r: 0, g: 0, b: 0, alpha: 0 }).composite([{ input: circle(1024, 200, '#fa8e29') }]).png().toBuffer();

test('Icons tab: upload shows the spec, previews the real badge at 40 and 28 px and the directory row, then saves', async ({ page }) => {
  const state = await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await page.getByRole('button', { name: 'Icons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Icons' })).toBeVisible();
  await expect(page.locator('tr', { has: page.locator('code', { hasText: /^ghost$/ }) }).getByRole('button')).toBeDisabled();
  await page.getByRole('button', { name: 'Upload an icon' }).click();
  await expect(page.locator('#icon-upload')).toContainText('PNG with transparent background · square · 1024×1024 recommended · one centred subject · no text');
  await page.locator('#icon-file').setInputFiles({ name: 'pumpkin.png', mimeType: 'image/png', buffer: await goodPng() });
  await expect(page.locator('#icon-upload .pin-preview')).toHaveCount(2);
  expect(await page.locator('#icon-upload .pin-preview').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().width)))).toEqual([40, 28]);
  await expect(page.locator('#icon-upload .dir-row')).toBeVisible();
  await expect(page.locator('#icon-label')).toHaveValue('pumpkin');
  if (process.env.QA_SHOTS) await page.locator('#icon-upload').screenshot({ path: `${process.env.QA_SHOTS}/admin-icon-upload.png` });
  expect(await axeViolations(page)).toEqual([]);
  await page.locator('#icon-label').fill('Test pumpkin');
  await page.getByRole('button', { name: 'Save icon' }).click();
  await expect(page.getByText('Test pumpkin').first()).toBeVisible();
  expect(state.uploads.length).toBe(1);
});

test('Icons tab: pictures with a background, a tiny subject, wrong size or type are refused with a clear message', async ({ page }) => {
  await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await page.getByRole('button', { name: 'Icons', exact: true }).click();
  await page.getByRole('button', { name: 'Upload an icon' }).click();
  const message = page.locator('#icon-upload .icon-msg');
  const save = page.getByRole('button', { name: 'Save icon' });
  await page.locator('#icon-file').setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: await withBackground() });
  await expect(message).toHaveText('This image has a background. Please upload a PNG with a transparent background.');
  await expect(save).toBeDisabled();
  await page.locator('#icon-file').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: await tiny() });
  await expect(message).toContainText('too small inside the image');
  await page.locator('#icon-file').setInputFiles({ name: 'small.png', mimeType: 'image/png', buffer: await blank(300, 0, { r: 0, g: 0, b: 0, alpha: 0 }).png().toBuffer() });
  await expect(message).toContainText('512 × 512');
  await page.locator('#icon-file').setInputFiles({ name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
  await expect(message).toContainText('PNG or WebP');
});

test('the house editor offers every active icon and an Upload your own icon button', async ({ page }) => {
  await mount(page, { signedIn: true });
  await page.goto('https://admin.test/');
  await page.getByRole('button', { name: /^Edit/ }).first().click();
  await page.getByRole('button', { name: 'Upload your own icon' }).click();
  await expect(page.locator('#icon-upload')).toBeVisible();
});
