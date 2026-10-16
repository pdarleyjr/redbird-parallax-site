import { test, expect } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';
import { snapshot, located, axeViolations, allImages, watch } from './helpers.mjs';

test('the trail map page shows the flyer, a same-origin PDF download and print buttons', async ({ page, request }) => {
  const problems = watch(page);
  await page.goto('halloween/trail-map/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trail map flyer');
  const pdf = page.locator('#tm-pdf');
  await expect(pdf).toHaveAttribute('download', 'redbird-trail-map-2026.pdf');
  const res = await request.get(new URL(await pdf.getAttribute('href'), page.url()).href);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/application\/pdf/);
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Print latest map' })).toHaveAttribute('href', /halloween\/print\/$/);
  await allImages(page);
  expect(await page.locator('#tm-image').evaluate(i => i.naturalWidth)).toBe(1600);
  expect(await page.locator('figure a').getAttribute('href')).toMatch(/redbird-trail-map-2026\.webp$/);
  expect(await axeViolations(page)).toEqual([]);
  expect(problems.errors).toEqual([]);
  expect(problems.bad).toEqual([]);
});

test('the PDF button downloads the file', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit download events differ; the link itself is verified above');
  await page.goto('halloween/trail-map/');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#tm-pdf').click()]);
  expect(download.suggestedFilename()).toBe('redbird-trail-map-2026.pdf');
});

test('it is linked from the homepage, the Halloween map section, the menu and the print page', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.card-note a')).toHaveAttribute('href', 'halloween/trail-map/');
  await page.goto('halloween/');
  await expect(page.locator('.map-flyer a')).toHaveAttribute('href', /trail-map\/$/);
  await expect(page.locator('#site-nav a[href$="halloween/trail-map/"]')).toBeAttached();
  await page.goto('halloween/print/');
  await expect(page.locator('#print-ready')).toHaveText('Map ready ✓');
});

test('the mobile Print entry opens a sheet with the flyer first, then the live map', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'action bar is a phone control');
  await page.goto('halloween/');
  await page.locator('#bar-print').click();
  const links = page.locator('#house-sheet a');
  await expect(links.nth(0)).toHaveText('Trail map flyer (PDF)');
  await expect(links.nth(1)).toHaveText('Print live map');
  await expect(links.nth(0)).toHaveAttribute('href', /halloween\/trail-map\/$/);
});

test('a hint appears when the live list has houses the flyer lacks, here and on the print page', async ({ page }) => {
  const extra = { ...located[0], id: 'stop-99', mapNumber: 99, name: 'Fixture House', lat: located[0].lat + 0.0002 };
  await page.context().route('**/data/halloween-2026.public.json', route => route.fulfill({ json: { ...snapshot, houses: [...snapshot.houses, extra] } }));
  await page.goto('halloween/trail-map/');
  await expect(page.locator('#tm-hint')).toContainText('1 newer house');
  await page.goto('halloween/print/');
  await expect(page.locator('#print-newer')).toContainText('1 newer house');
});

test('no hint when the flyer has every house', async ({ page }) => {
  await page.goto('halloween/trail-map/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#tm-hint')).toBeHidden();
  const flyer = JSON.parse(await readFile(new URL('../../data/flyer-houses.json', import.meta.url), 'utf8'));
  for (const h of snapshot.houses) expect(flyer.ids).toContain(h.id);
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test('the trail map page loads offline after the first visit and the PDF is cached after a download', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Service worker flows are verified on Chromium');
    await page.goto('./');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.goto('halloween/trail-map/');
    await page.evaluate(async () => { const r = await fetch('../../assets/maps/redbird-trail-map-2026.pdf'); await r.arrayBuffer(); });
    await page.waitForTimeout(1000);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trail map flyer');
    expect(await page.locator('#tm-image').evaluate(async img => { await img.decode().catch(() => {}); return img.naturalWidth; })).toBe(1600);
    const bytes = await page.evaluate(async () => (await (await fetch('../../assets/maps/redbird-trail-map-2026.pdf')).arrayBuffer()).byteLength);
    expect(bytes).toBeGreaterThan(1_000_000);
    await context.setOffline(false);
  });
});
