import { test, expect } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';
import { axeViolations, allImages, watch, snapshot } from './helpers.mjs';

const loaded = async page => { await page.goto('halloween/'); await page.locator('.house-card').first().waitFor(); await page.evaluate(() => document.fonts.ready); };

test('public content: date, hours, directory equals snapshot, no historical content', async ({ page }) => {
  const problems = watch(page);
  await loaded(page);
  const text = await page.locator('body').innerText();
  expect(text).toMatch(/Saturday, October 31, 2026/);
  expect(text).toMatch(/6 PM–9 PM/);
  expect(text).not.toMatch(/2024|2025|Book Now|shipping|discount|Bedimcode/i);
  expect(await page.locator('.house-card').count()).toBe(snapshot.houses.length);
  expect(await page.locator('iframe,video,a[href*="jotform"]').count()).toBe(0);
  const ids = await page.locator('.house-card').evaluateAll(cards => cards.map(c => c.dataset.id));
  for (let n = 1; n <= 31; n++) expect(ids).toContain(`stop-${String(n).padStart(2, '0')}`);
  const actual = await page.locator('.house-card').evaluateAll(cards => cards.map(c => ({ name: c.querySelector('h3').textContent, address: c.querySelector('p').textContent })));
  expect(actual).toEqual(snapshot.houses.map(h => ({ name: h.name, address: h.address })));
  await expect(page.locator('#site-nav a[href="../"]')).toBeAttached();
  expect(problems.external).toEqual([]);
  expect(problems.bad).toEqual([]);
});

for (const [width, height] of [[320, 740], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 1000], [1920, 1080], [844, 390]]) {
  test(`responsive ${width}x${height}: no overflow, no broken images, usable hero action`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await loaded(page); await allImages(page);
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, broken: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src), ids: [...document.querySelectorAll('[id]')].map(e => e.id) }));
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.broken).toEqual([]);
    expect(new Set(layout.ids).size).toBe(layout.ids.length);
    const title = await page.locator('h1').boundingBox();
    expect(title.width).toBeLessThanOrEqual(width); expect(title.x).toBeGreaterThanOrEqual(0);
    const cta = await page.locator('.hero .button-primary').boundingBox();
    expect(cta.height).toBeGreaterThanOrEqual(44);
    if (width >= 375 && width <= 430) expect(cta.y + cta.height).toBeLessThan(height);
  });
}

test('mobile menu: touch, Escape, close, navigation, focus and resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loaded(page);
  const toggle = page.locator('#menu-toggle');
  await toggle.click();
  expect(await toggle.getAttribute('aria-expanded')).toBe('true');
  expect(await page.locator('#site-nav a').first().evaluate(e => e === document.activeElement)).toBe(true);
  await page.keyboard.press('Escape');
  expect(await toggle.getAttribute('aria-expanded')).toBe('false');
  expect(await toggle.evaluate(e => e === document.activeElement)).toBe(true);
  await toggle.press('Enter'); await page.locator('#menu-close').click();
  expect(await toggle.getAttribute('aria-expanded')).toBe('false');
  await toggle.click(); await page.locator('#site-nav a[href="#map"]').click();
  await page.waitForURL('**/#map');
  expect(await toggle.getAttribute('aria-expanded')).toBe('false');
  await toggle.click(); await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForFunction(() => document.querySelector('#menu-toggle').getAttribute('aria-expanded') === 'false');
  expect(await page.locator('#site-nav').isVisible()).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#site-nav').waitFor({ state: 'hidden' });
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
});

test('all in-page anchors resolve and the skip link works', async ({ page, browserName }) => {
  await page.route('**/assets/vendor/**', route => route.abort());   // this test is about anchors; keep the WebGL map (heavy on CI WebKit) out of it
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loaded(page);
  const missing = await page.locator('a[href^="#"]').evaluateAll(links => links.filter(l => !document.getElementById(l.hash.slice(1))).map(l => l.href));
  expect(missing).toEqual([]);
  if (browserName !== 'webkit') { // Safari does not Tab to links unless a system setting is on
    await page.keyboard.press('Tab');
    expect(await page.locator('.skip-link').evaluate(e => e === document.activeElement)).toBe(true);
    await page.keyboard.press('Enter');
    expect(page.url()).toMatch(/#main$/);
  }
  for (const href of ['#what-to-expect', '#how-it-works', '#featured-houses', '#map']) { await page.locator(`#site-nav a[href="${href}"]`).click(); expect(new URL(page.url()).hash).toBe(href); }
});

test('search filters the real count and handles no matches', async ({ page }) => {
  await loaded(page);
  await page.locator('#house-search').fill('5792');
  await expect(page.locator('.house-card:not([hidden])')).toHaveCount(1);
  await page.locator('#house-search').fill('NONEXISTENT LOCAL TEST FIXTURE');
  await expect(page.locator('.house-card:not([hidden])')).toHaveCount(0);
  await expect(page.locator('#house-empty')).toBeVisible();
  await page.locator('#house-search').fill('');
  await expect(page.locator('.house-card:not([hidden])')).toHaveCount(snapshot.houses.length);
});

test('visited marks persist across reloads and update the count', async ({ page }) => {
  await loaded(page);
  await page.locator('.house-card').first().locator('[data-visited]').check();
  await expect(page.locator('#visited-count')).toHaveText(`1 of ${snapshot.houses.length} visited`);
  await page.reload(); await page.locator('.house-card').first().waitFor();
  await expect(page.locator('.house-card').first().locator('[data-visited]')).toBeChecked();
  await page.locator('#visited-reset').click();
  await expect(page.locator('#visited-count')).toHaveText(`0 of ${snapshot.houses.length} visited`);
});

test('the old organizer map is gone from the page: no section, no links to its files', async ({ page }) => {
  await loaded(page);
  await expect(page.locator('details.archive')).toHaveCount(0);
  await expect(page.getByText('Original October 9 map')).toHaveCount(0);
  const hrefs = await page.locator('a[href], img[src], source[srcset]').evaluateAll(els => els.map(e => e.getAttribute('href') || e.getAttribute('src') || e.getAttribute('srcset')));
  expect(hrefs.filter(h => /redbird-trail-2026[.-]/.test(h))).toEqual([]);
});

test('WCAG 2.2 AA automated accessibility (axe) has zero violations', async ({ page }) => {
  await loaded(page); await allImages(page);
  expect(await axeViolations(page)).toEqual([]);
});

test('reduced motion and mobile menu open have no axe violations', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', baseURL: test.info().project.use.baseURL });
  await loaded(page);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.locator('#menu-toggle').click();
  expect(await axeViolations(page)).toEqual([]);
  await page.close();
});

test('JavaScript disabled: date, directory and navigation remain usable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await page.goto('halloween/');
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.locator('.house-card').count()).toBe(snapshot.houses.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await context.close();
});

test('fixtures: invalid or historical snapshots are ignored (bundled data used)', async ({ page }) => {
  for (const body of ['{"invalid":', JSON.stringify({ schema: 1, eventId: 'x', version: 9, houses: [{ id: 'x', email: 'a@example.invalid' }] })]) {
    await page.route('**/data/halloween-2026.public.json', route => route.fulfill({ body, contentType: 'application/json' }));
    await page.goto('halloween/');
    await page.waitForLoadState('networkidle');
    expect(await page.locator('.house-card').count()).toBe(snapshot.houses.length);
    await page.unroute('**/data/halloween-2026.public.json');
  }
});

test('a newer valid snapshot re-renders the directory (long names stay text, no injection)', async ({ page }) => {
  const next = { ...snapshot, version: snapshot.version + 5, houses: [{ ...snapshot.houses[0], name: 'Local test <img src=x onerror=window.INJECTED=true> & ' + 'Long name '.repeat(25) }] };
  await page.route('**/data/halloween-2026.public.json', route => route.fulfill({ json: next }));
  await page.goto('halloween/');
  await expect(page.locator('.house-card')).toHaveCount(1);
  expect(await page.evaluate(() => window.INJECTED)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('#house-count')).toHaveText('1 house on the trail');
});
