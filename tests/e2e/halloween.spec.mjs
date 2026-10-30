import { test, expect } from './fixtures.mjs';
import { axeViolations, allImages, watch, snapshot } from './helpers.mjs';

// These tests are about the page content and the app shell, not the WebGL map (see map.spec.mjs); keep the map out of them
// (software GL crashes CI WebKit at big sizes).
test.beforeEach(({ page }) => page.route('**/assets/vendor/**', route => route.abort()));
const loaded = async (page, hash = '') => { await page.goto(`halloween/${hash}`); await page.locator('#house-list .hrow').first().waitFor({ state: 'attached' }); await page.evaluate(() => document.fonts.ready); };
const VIEWS = ['map', 'houses', 'info', 'more'];

test('public content: date and hours in Info, the Houses list equals the snapshot, no historical content', async ({ page }) => {
  const problems = watch(page);
  await loaded(page, '#info');
  const text = await page.locator('#info').innerText();
  expect(text).toMatch(/Saturday, October 31, 2026/);
  expect(text).toMatch(/6 PM–9 PM/);
  const all = await page.locator('body').innerText();
  expect(all).not.toMatch(/2024|2025|Book Now|shipping|discount|Bedimcode/i);
  expect(await page.locator('#house-list .hrow').count()).toBe(snapshot.houses.length);
  expect(await page.locator('iframe,video,a[href*="jotform"]').count()).toBe(0);
  const ids = await page.locator('#house-list .hrow').evaluateAll(rows => rows.map(r => r.dataset.id));
  for (let n = 1; n <= 56; n++) expect(ids).toContain(`stop-${String(n).padStart(2, '0')}`);
  const actual = await page.locator('#house-list .hrow').evaluateAll(rows => rows.map(r => ({ name: r.querySelector('.hr-t b').textContent, address: r.querySelector('.hr-t small').textContent })));
  expect(actual).toEqual(snapshot.houses.map(h => ({ name: h.name, address: h.address })));
  expect(problems.external).toEqual([]);
  expect(problems.bad).toEqual([]);
});

test('the app bar: back to Red Bird home, the event chip and the progress ring', async ({ page }) => {
  await loaded(page);
  await expect(page.locator('.appbar-home')).toHaveAttribute('href', /\?home$/);
  await expect(page.locator('.event-chip')).toHaveText('Sat Oct 31 · 6–9 PM');
  await expect(page.locator('#progress-ring')).toHaveAttribute('aria-label', `0/${snapshot.houses.length} houses visited`);
});

for (const [width, height] of [[320, 740], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [844, 390]]) {
  test(`responsive ${width}x${height}: every view fits, no broken images, 44 px targets`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const view of VIEWS) {
      await loaded(page, `#${view}`);
      await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }));
      await page.waitForFunction(() => [...document.images].every(i => !i.offsetParent || i.closest('[hidden]') || i.complete), null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(300);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        panes: [...document.querySelectorAll('.view:not([hidden])')].map(v => v.scrollWidth - v.clientWidth),
        broken: [...document.images].filter(i => i.offsetParent && (!i.complete || !i.naturalWidth) && !i.closest('[hidden]') && !i.classList.contains('map-poster')).map(i => i.src),
        ids: [...document.querySelectorAll('[id]')].map(e => e.id)
      }));
      expect(layout.overflow, `${view}: page overflow`).toBeLessThanOrEqual(1);
      for (const p of layout.panes) expect(p, `${view}: pane overflow`).toBeLessThanOrEqual(1);
      expect(layout.broken, `${view}: broken images`).toEqual([]);
      expect(new Set(layout.ids).size).toBe(layout.ids.length);
      const tabs = await page.locator('#tabbar a').evaluateAll(a => a.map(x => { const r = x.getBoundingClientRect(); return [r.width, r.height]; }));
      for (const [w, h] of tabs) { expect(w).toBeGreaterThanOrEqual(44); expect(h).toBeGreaterThanOrEqual(44); }
    }
  });
}

test('tabs are real views: routes, titles, active tab, one view at a time, and the back button walks them', async ({ page }) => {
  await loaded(page);
  await expect(page.locator('body')).toHaveAttribute('data-view', 'map');
  await expect(page).toHaveTitle(/^Map · /);
  const seen = [];
  for (const view of ['houses', 'info', 'more']) {
    await page.locator(`#tabbar a[data-tab="${view}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', view);
    expect(new URL(page.url()).hash).toBe(`#${view}`);
    await expect(page.locator(`#${view}`)).toBeVisible();
    for (const other of ['houses', 'info', 'more'].filter(v => v !== view)) await expect(page.locator(`#${other}`)).toBeHidden();
    await expect(page.locator(`#tabbar a[data-tab="${view}"]`)).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveTitle(new RegExp(`^${view[0].toUpperCase()}${view.slice(1)} · `));
    seen.push(view);
  }
  await page.goBack(); await expect(page.locator('body')).toHaveAttribute('data-view', 'info');
  await page.goBack(); await expect(page.locator('body')).toHaveAttribute('data-view', 'houses');
  await page.goBack(); await expect(page.locator('body')).toHaveAttribute('data-view', 'map');
  await page.goForward(); await expect(page.locator('body')).toHaveAttribute('data-view', 'houses');
});

test('every old anchor of the long page opens the right view and the address is rewritten', async ({ page }) => {
  const cases = { hero: 'map', nearest: 'map', 'what-to-expect': 'info', 'how-it-works': 'info', 'featured-houses': 'houses', 'house-list': 'houses', printables: 'more', 'get-app': 'more', info: 'info', more: 'more', houses: 'houses', map: 'map' };
  for (const [anchor, view] of Object.entries(cases)) {
    await page.goto(`halloween/#${anchor}`);
    await expect(page.locator('body')).toHaveAttribute('data-view', view);
    await expect(page.locator(`#${view}`)).toBeVisible();
    await expect.poll(() => new URL(page.url()).hash).toBe(`#${view}`);
  }
});

test('the skip link works and focus moves to the view on a tab change', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loaded(page);
  if (browserName !== 'webkit') { // Safari does not Tab to links unless a system setting is on
    await page.keyboard.press('Tab');
    expect(await page.locator('.skip-link').evaluate(e => e === document.activeElement)).toBe(true);
  }
  await page.locator('#tabbar a[data-tab="info"]').click();
  await expect(page.locator('#info')).toBeFocused();
});

test('Houses: search, filter chips and the sort button work on the one list', async ({ page }) => {
  await loaded(page, '#houses');
  await page.locator('#house-search').fill('5792');
  await expect(page.locator('#house-list .hrow')).toHaveCount(1);
  await page.locator('#house-search').fill('NONEXISTENT LOCAL TEST FIXTURE');
  await expect(page.locator('#house-list .hrow')).toHaveCount(0);
  await expect(page.locator('#house-empty')).toBeVisible();
  await page.locator('#house-search').fill('');
  await expect(page.locator('#house-list .hrow')).toHaveCount(snapshot.houses.length);
  await page.locator('#house-list .hrow').first().locator('[data-visited]').check();
  await page.locator('#house-controls [data-filter="visited"]').click();
  await expect(page.locator('#house-list .hrow')).toHaveCount(1);
  await page.locator('#house-controls [data-filter="todo"]').click();
  await expect(page.locator('#house-list .hrow')).toHaveCount(snapshot.houses.length - 1);
  await page.locator('#house-controls [data-filter="all"]').click();
  await expect(page.locator('#house-controls [data-sort-toggle]')).toHaveAttribute('aria-disabled', 'true');   // no location yet, so "Nearest" is not available
});

test('rows are about 64 px with a 40 px icon, the number, name, address and a visited box', async ({ page }) => {
  await loaded(page, '#houses');
  const row = page.locator('#house-list .hrow').first();
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(63); expect(box.height).toBeLessThanOrEqual(72);
  const icon = await row.locator('.hr-art img').boundingBox();
  expect(Math.round(icon.width)).toBe(40);
  await expect(row.locator('.hr-n')).toContainText('1');
  expect(await page.locator('#house-list').evaluate(el => el.scrollHeight)).toBeLessThan(snapshot.houses.length * 72);
  expect((await row.locator('[data-visited]').locator('xpath=..').boundingBox()).width).toBeGreaterThanOrEqual(44);
});

test('visited: persists across reloads, drives the progress ring and the live announcement, and Reset asks first', async ({ page }) => {
  await loaded(page, '#houses');
  await page.locator('#house-list .hrow').first().locator('[data-visited]').check();
  await expect(page.locator('#visited-count')).toHaveText(`1 of ${snapshot.houses.length} visited`);
  await expect(page.locator('#ring-text')).toHaveText(`1/${snapshot.houses.length}`);
  await expect(page.locator('#progress-ring')).toHaveAttribute('aria-label', `1/${snapshot.houses.length} houses visited`);
  await expect(page.locator('#announce')).toContainText(`1 of ${snapshot.houses.length}`);
  expect(await page.locator('#ring-fill').getAttribute('stroke-dasharray')).toBe(`${Math.round((1 / snapshot.houses.length) * 1000) / 10} 100`);
  await page.reload(); await page.locator('#house-list .hrow').first().waitFor({ state: 'attached' });
  await expect(page.locator('#house-list .hrow').first().locator('[data-visited]')).toBeChecked();
  await page.locator('#tabbar a[data-tab="more"]').click();
  await page.locator('#visited-reset').click();
  await expect(page.locator('#reset-confirm')).toBeVisible();
  await page.locator('#reset-cancel').click();
  await expect(page.locator('#reset-confirm')).toBeHidden();
  await expect(page.locator('#ring-text')).toHaveText(`1/${snapshot.houses.length}`);
  await page.locator('#visited-reset').click(); await page.locator('#reset-yes').click();
  await expect(page.locator('#ring-text')).toHaveText(`0/${snapshot.houses.length}`);
});

test('visited uses the same storage key as before (nothing people saved is lost)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rbht:visited:halloween-2026', JSON.stringify(['stop-01', 'stop-02'])));
  await loaded(page, '#houses');
  await expect(page.locator('#ring-text')).toHaveText(`2/${snapshot.houses.length}`);
  await expect(page.locator('#house-list .hrow').first().locator('[data-visited]')).toBeChecked();
});

test('the old organizer map is gone from the page: no section, no links to its files', async ({ page }) => {
  await loaded(page, '#more');
  await expect(page.locator('details.archive')).toHaveCount(0);
  await expect(page.getByText('Original October 9 map')).toHaveCount(0);
  const hrefs = await page.locator('a[href], img[src], source[srcset]').evaluateAll(els => els.map(e => e.getAttribute('href') || e.getAttribute('src') || e.getAttribute('srcset')));
  expect(hrefs.filter(h => /redbird-trail-2026[.-]/.test(h))).toEqual([]);
});

for (const [label, size] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
  test(`WCAG 2.2 AA automated accessibility (axe) has zero violations on every view (${label})`, async ({ page }) => {
    await page.setViewportSize(size);
    for (const view of VIEWS) {
      await loaded(page, `#${view}`); await allImages(page);
      expect(await axeViolations(page), view).toEqual([]);
    }
  });
}

test('reduced motion: no scroll animation, axe stays clean', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', baseURL: test.info().project.use.baseURL });
  await page.route('**/assets/vendor/**', route => route.abort());
  await loaded(page, '#houses');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(await axeViolations(page)).toEqual([]);
  await page.close();
});

test('JavaScript disabled: one readable page with the date, the full house list and the printable maps', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await page.goto('halloween/');
  await expect(page.locator('#info h1')).toBeVisible();
  await expect(page.locator('#houses')).toBeVisible();
  await expect(page.locator('#more')).toBeVisible();
  expect(await page.locator('#house-list .hrow').count()).toBe(snapshot.houses.length);
  await expect(page.locator('#info')).toContainText('Saturday, October 31, 2026');
  await expect(page.locator('#printables a[href$=".pdf"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await context.close();
});

test('fixtures: invalid or historical snapshots are ignored (bundled data used)', async ({ page }) => {
  for (const body of ['{"invalid":', JSON.stringify({ schema: 1, eventId: 'x', version: 9, houses: [{ id: 'x', email: 'a@example.invalid' }] })]) {
    await page.route('**/data/halloween-2026.public.json', route => route.fulfill({ body, contentType: 'application/json' }));
    await page.goto('halloween/');
    await page.waitForLoadState('networkidle');
    expect(await page.locator('#house-list .hrow').count()).toBe(snapshot.houses.length);
    await page.unroute('**/data/halloween-2026.public.json');
  }
});

test('a newer valid snapshot re-renders the list (long names stay text, no injection)', async ({ page }) => {
  const next = { ...snapshot, version: snapshot.version + 5, houses: [{ ...snapshot.houses[0], name: 'Local test <img src=x onerror=window.INJECTED=true> & ' + 'Long name '.repeat(25) }] };
  await page.route('**/data/halloween-2026.public.json', route => route.fulfill({ json: next }));
  await page.goto('halloween/#houses');
  await expect(page.locator('#house-list .hrow')).toHaveCount(1);
  expect(await page.evaluate(() => window.INJECTED)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('#house-count')).toHaveText('1 house on the trail');
});

test('the map and its code are not loaded on the Info, Houses or More views (phone)', async ({ page }) => {
  await page.unroute('**/assets/vendor/**');
  await page.setViewportSize({ width: 390, height: 844 });
  const urls = [];
  page.on('request', r => urls.push(r.url()));
  await page.goto('halloween/#info');
  await page.waitForLoadState('networkidle');
  for (const view of ['houses', 'more', 'info']) { await page.goto(`halloween/#${view}`); await page.waitForLoadState('networkidle'); }
  expect(urls.filter(u => /maplibre|map-view\.js|\/tiles\//.test(u))).toEqual([]);
});
