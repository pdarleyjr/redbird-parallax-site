// The Halloween app shell: layouts per device size, the map dock (peek / half / full), list and map staying in sync, safe areas and the
// bottom tab bar on iPhone Safari (WebKit, iPhone 15) and Pixel 7 (Chromium). Each device also saves a picture of every view when QA_SHOTS is set.
import { test, expect, mockApi } from './fixtures.mjs';
import { webkit, chromium, devices } from '@playwright/test';
import { located, snapshot } from './helpers.mjs';

const GL = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
const VIEWS = ['map', 'houses', 'info', 'more'];
const mapReady = async page => { await page.waitForFunction(() => window.__map?.loaded() && window.__pins?.metrics(), null, { timeout: 45000 }); await page.waitForTimeout(800); };
const settle = page => page.waitForFunction(() => !window.__map.isMoving() && !window.__map.isZooming(), null, { timeout: 30000 });

test.beforeEach(({ browserName }, info) => { const iphone = info.title.startsWith('iPhone 15'); test.skip(iphone ? info.project.name !== 'webkit-mobile' : browserName !== 'chromium', 'The shell is checked on Chromium here; iPhone Safari is checked in the webkit-mobile project'); test.setTimeout(120000); });

async function deviceChecks(browserType, device, name, info, shared) {
  const browser = shared ?? await browserType.launch(GL);
  const context = await browser.newContext({ ...devices[device], baseURL: info.project.use.baseURL, deviceScaleFactor: 2 });
  await mockApi(context);
  const page = await context.newPage();
  await page.goto('halloween/?debug');
  await page.locator('#house-list .hrow').first().waitFor({ state: 'attached' });
  const rules = await page.evaluate(() => {
    const bar = document.querySelector('#tabbar'), cs = getComputedStyle(bar), offenders = [];
    for (let a = bar.parentElement; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if ((s.transform && s.transform !== 'none') || (s.filter && s.filter !== 'none') || (s.backdropFilter && s.backdropFilter !== 'none') || s.willChange.includes('transform')) offenders.push(a.tagName);
    }
    return { offenders, scrollable: (() => { scrollTo(0, 500); const y = scrollY; scrollTo(0, 0); return y; })(), viewport: document.querySelector('meta[name=viewport]').content, status: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content };
  });
  expect(rules.offenders, 'no ancestor of the tab bar can detach it').toEqual([]);
  expect(rules.scrollable, 'the page itself never scrolls: each view scrolls inside the shell').toBeLessThanOrEqual(1);
  expect(rules.viewport).toContain('viewport-fit=cover');
  expect(rules.status).toBe('black-translucent');
  const results = [];
  for (const view of VIEWS) {
    await page.locator(`#tabbar a[data-tab="${view}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', view);
    await page.waitForTimeout(view === 'map' ? 2500 : 500);
    if (view === 'houses') await page.locator('#house-list').evaluate(ol => { ol.parentElement.scrollTop = 600; });
    const m = await page.evaluate(() => ({ barBottom: document.querySelector('#tabbar').getBoundingClientRect().bottom, inner: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }));
    results.push({ view, gap: Math.abs(m.barBottom - m.inner), overflow: m.overflow });
    if (process.env.QA_SHOTS) await page.screenshot({ path: `${process.env.QA_SHOTS}/${name}-${view}.png` });
  }
  for (const r of results) { expect(r.gap, `${r.view}: tab bar bottom vs window height`).toBeLessThanOrEqual(0.5); expect(r.overflow).toBeLessThanOrEqual(1); }
  await context.close();
  if (!shared) await browser.close();
}

test('iPhone 15 (WebKit): the tab bar stays attached to the bottom on every view, the page does not scroll, status bar is translucent', async ({ browser }, info) => {
  await deviceChecks(webkit, 'iPhone 15', 'iphone-15-webkit', info, browser);
});

test('Pixel 7 (Chromium): the same checks', async ({}, info) => {
  await deviceChecks(chromium, 'Pixel 7', 'pixel-7-chromium', info);
});

test.describe('phone: the dock', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('peek by default, the handle button cycles peek, half, full; keys and Escape work; the list is only reachable when open', async ({ page }) => {
    await page.goto('halloween/?debug'); await mapReady(page);
    const dock = page.locator('#dock'), handle = page.locator('#dock-handle');
    await expect(dock).toHaveAttribute('data-state', 'peek');
    expect(await page.locator('#dock-body').evaluate(e => e.inert)).toBe(true);
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    const heights = {};
    heights.peek = (await dock.boundingBox()).height;
    await handle.click(); await expect(dock).toHaveAttribute('data-state', 'half'); await page.waitForTimeout(400);
    heights.half = (await dock.boundingBox()).height;
    expect(await page.locator('#dock-body').evaluate(e => e.inert)).toBe(false);
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    await handle.click(); await expect(dock).toHaveAttribute('data-state', 'full'); await page.waitForTimeout(400);
    heights.full = (await dock.boundingBox()).height;
    expect(heights.peek).toBeLessThan(heights.half); expect(heights.half).toBeLessThan(heights.full);
    expect(heights.peek).toBeLessThanOrEqual(844 * 0.42);
    await handle.click(); await expect(dock).toHaveAttribute('data-state', 'peek');
    await handle.focus(); await page.keyboard.press('ArrowUp'); await expect(dock).toHaveAttribute('data-state', 'half');
    await page.keyboard.press('ArrowUp'); await expect(dock).toHaveAttribute('data-state', 'full');
    await page.keyboard.press('ArrowDown'); await expect(dock).toHaveAttribute('data-state', 'half');
    await page.keyboard.press('Escape'); await expect(dock).toHaveAttribute('data-state', 'peek');
  });

  test('dragging the handle moves the sheet and snaps to half or full; dragging down returns to peek', async ({ page }) => {
    await page.goto('halloween/?debug'); await mapReady(page);
    const dock = page.locator('#dock');
    const grab = await page.locator('#dock-grab').boundingBox();
    const x = grab.x + grab.width / 2, y = grab.y + grab.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y - 120, { steps: 6 });
    expect(await dock.evaluate(e => e.hasAttribute('data-dragging'))).toBe(true);
    const mid = (await dock.boundingBox()).height;
    expect(mid).toBeGreaterThan(200);
    await page.mouse.move(x, y - 330, { steps: 6 }); await page.mouse.up();
    await expect(dock).toHaveAttribute('data-state', /half|full/);
    const open = await dock.getAttribute('data-state');
    const g2 = await page.locator('#dock-grab').boundingBox();
    await page.mouse.move(g2.x + g2.width / 2, g2.y + 14); await page.mouse.down();
    await page.mouse.move(g2.x + g2.width / 2, g2.y + 700, { steps: 8 }); await page.mouse.up();
    await expect(dock).toHaveAttribute('data-state', 'peek');
    expect(open).not.toBe('peek');
  });

  test('half and full show search, filter chips and the compact list; a row selects that house, shows its card and collapses to peek', async ({ page }) => {
    await page.goto('halloween/?debug'); await mapReady(page);
    await page.locator('#dock-handle').click();
    await page.locator('#dock .list-search').fill('5792');
    await expect(page.locator('#map-house-list .hrow')).toHaveCount(1);
    await page.locator('#dock .list-search').fill('');
    await expect(page.locator('#map-house-list .hrow')).toHaveCount(snapshot.houses.length);
    await page.locator('#dock [data-filter="visited"]').click();
    await expect(page.locator('#map-house-list .hlist-empty')).toBeVisible();
    await page.locator('#dock [data-filter="all"]').click();
    const target = located[11];
    await page.locator(`#map-house-list .hr-main[data-id="${target.id}"]`).click();
    await expect(page.locator('#house-sheet h3')).toContainText(`#${target.mapNumber}`);
    await expect(page.locator('#dock')).toHaveAttribute('data-state', 'peek');
    await expect(page.locator('.pin:not(.is-cluster).is-selected, .pin.is-cluster.is-selected').first()).toBeAttached();
    await settle(page);
  });

  test('the dock list sorts by distance once the location is known, and the peek card is the nearest house with its actions', async ({ browser }, info) => {
    const here = { latitude: located[0].lat + 0.00005, longitude: located[0].lng + 0.00005 };
    const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, geolocation: { ...here, accuracy: 10 }, permissions: ['geolocation'] });
    await mockApi(context);
    const page = await context.newPage();
    await page.goto('halloween/?debug'); await mapReady(page);
    await page.locator('#dock .prompt button').click();
    await expect(page.locator('#house-sheet h3')).toContainText('Nearest:');
    const card = page.locator('#house-sheet');
    await expect(card.getByRole('button', { name: /Mark visited/ })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Next' })).toBeVisible();
    await expect(card.getByRole('link', { name: /directions/i })).toBeVisible();
    await expect(card.locator('.arrow')).toBeAttached();
    await expect(card.locator('.sub')).toContainText('About');
    await page.locator('#dock-handle').click();
    await expect(page.locator('#map-house-list .hr-dist').first()).toBeVisible();
    const firstId = await page.locator('#map-house-list .hrow').first().getAttribute('data-id');
    expect(firstId).toBe(located[0].id);
    await context.close();
  });

  test('marking visited from the peek card advances to the next nearest, updates the ring, and announces it', async ({ browser }, info) => {
    const here = { latitude: located[0].lat + 0.00005, longitude: located[0].lng + 0.00005 };
    const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, geolocation: { ...here, accuracy: 10 }, permissions: ['geolocation'] });
    await mockApi(context);
    const page = await context.newPage();
    await page.goto('halloween/?debug'); await mapReady(page);
    await page.locator('#dock .prompt button').click();
    await expect(page.locator('#house-sheet h3')).toContainText(`#${located[0].mapNumber}`);
    await page.locator('#house-sheet').getByRole('button', { name: 'Mark visited' }).click();
    await expect(page.locator('#ring-text')).toHaveText(`1/${snapshot.houses.length}`);
    await expect(page.locator('#announce')).toContainText('Marked');
    await expect(page.locator('#house-sheet h3')).not.toContainText(`#${located[0].mapNumber} `);
    await context.close();
  });
});

test.describe('Houses view selects on the map', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('tapping a row opens the Map view with that house selected', async ({ page }) => {
    await page.goto('halloween/?debug#houses');
    await page.locator('#house-list .hrow').first().waitFor({ state: 'attached' });
    const target = located[19];
    await page.locator(`#house-list .hr-main[data-id="${target.id}"]`).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'map');
    expect(new URL(page.url()).hash).toBe(`#house-${target.id}`);
    await mapReady(page);
    await expect(page.locator('#house-sheet h3')).toContainText(`#${target.mapNumber}`);
    await expect(page.locator('#map-house-list .hrow.is-selected')).toHaveAttribute('data-id', target.id);
  });
});

test.describe('desktop: two panes', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('the map fills the left two thirds at full height; the right sidebar has the tabs and the active view; no bottom bar', async ({ page }) => {
    await page.goto('halloween/?debug'); await mapReady(page);
    const stage = await page.locator('#map-stage').boundingBox(), tabs = await page.locator('#tabbar').boundingBox(), bar = await page.locator('.appbar').boundingBox();
    expect(stage.x).toBe(0);
    expect(stage.width).toBeGreaterThan(1440 * 0.6); expect(stage.width).toBeLessThan(1440 * 0.75);
    expect(stage.y + stage.height).toBeCloseTo(900, 0);
    expect(tabs.x).toBeGreaterThanOrEqual(stage.x + stage.width - 1);
    expect(tabs.y).toBeLessThan(200);
    expect(bar.height).toBeLessThan(80);
    await expect(page.locator('#dock')).toBeVisible();
    await expect(page.locator('#dock-grab')).toBeHidden();
    for (const view of ['houses', 'info', 'more']) {
      await page.locator(`#tabbar a[data-tab="${view}"]`).click();
      await expect(page.locator(`#${view}`)).toBeVisible();
      await expect(page.locator('#map-stage')).toBeVisible();
      const box = await page.locator(`#${view}`).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(stage.width - 1);
    }
    await page.locator('#tabbar a[data-tab="map"]').click();
    await expect(page.locator('#dock')).toBeVisible();
    await expect(page.locator('.tab-map-label')).toHaveText('Map');
  });
});

test.describe('tablet: map with a side sheet', () => {
  test.use({ viewport: { width: 900, height: 1100 } });
  test('the dock is a 360 px side sheet over the right of the map and the tab bar stays at the bottom', async ({ page }) => {
    await page.goto('halloween/?debug'); await mapReady(page);
    const dock = await page.locator('#dock').boundingBox(), tabs = await page.locator('#tabbar').boundingBox();
    expect(Math.round(dock.width)).toBe(360);
    expect(dock.x + dock.width).toBeCloseTo(900, 0);
    expect(tabs.y + tabs.height).toBeCloseTo(1100, 0);
    await expect(page.locator('#dock-body')).toBeVisible();
  });
});

test.describe('installed app', () => {
  test('an installed app opens straight into the one live event; ?home keeps the home page', async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = q => (q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q));
    });
    await page.route('**/assets/vendor/**', route => route.abort());
    await page.goto('./?source=pwa');
    await expect(page).toHaveURL(/halloween\/$/);
    await page.goto('./?home');
    await expect(page.locator('#home-title')).toBeVisible();
    await page.goto('halloween/');
    await expect(page.locator('.appbar-home')).toHaveAttribute('href', /\?home$/);
    await expect(page.locator('#get-app')).toHaveAttribute('hidden', '');
  });
});
