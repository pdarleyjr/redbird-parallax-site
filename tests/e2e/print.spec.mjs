import { test, expect } from './fixtures.mjs';
import { snapshot, located, axeViolations } from './helpers.mjs';

for (const paper of ['letter-portrait', 'letter-landscape']) {
  test(`print page (${paper}) is ready, draws one marker per located house and a full legend`, async ({ page }) => {
    await page.goto(`halloween/print/?paper=${paper}&list=1`);
    await expect(page.locator('#print-ready')).toHaveText('Map ready ✓', { timeout: 10000 });
    await expect(page.locator('#print-button')).toBeEnabled();
    expect(await page.locator('#print-overlay .pm g[data-n]').count()).toBe(located.length);
    expect(await page.locator('#print-legend-list li').count()).toBe(snapshot.houses.length);
    await expect(page.locator('.sheet-foot')).toContainText('OpenStreetMap');
    expect(await page.evaluate(() => document.documentElement.dataset.paper)).toBe(paper);
  });
}

test('a mismatched extent shows the "being updated" message and disables printing', async ({ page }) => {
  await page.route('**/assets/map/print-base.json', async route => {
    const body = await (await route.fetch()).json();
    await route.fulfill({ json: { ...body, extentHash: 'deadbeef' } });
  });
  await page.goto('halloween/print/');
  await expect(page.locator('#print-msg')).toContainText('being updated');
  await expect(page.locator('#print-button')).toBeDisabled();
});

test('adding or removing a house in the snapshot updates the overlay and legend', async ({ page }) => {
  const extra = { ...located[0], id: 'stop-99', mapNumber: 99, name: 'Fixture House', lat: located[0].lat + 0.0002 };
  await page.route('**/data/halloween-2026.public.json', route => route.fulfill({ json: { ...snapshot, houses: [...snapshot.houses, extra] } }));
  await page.goto('halloween/print/');
  await expect(page.locator('#print-ready')).toHaveText('Map ready ✓');
  await expect(page.locator('#print-overlay g[data-n="99"]')).toHaveCount(1);
  await page.unroute('**/data/halloween-2026.public.json');
  await page.route('**/data/halloween-2026.public.json', route => route.fulfill({ json: { ...snapshot, houses: snapshot.houses.slice(1) } }));
  await page.goto('halloween/print/');
  await expect(page.locator('#print-ready')).toHaveText('Map ready ✓');
  await expect(page.locator('#print-overlay g[data-n="1"]')).toHaveCount(0);
});

test('print media hides navigation and controls; a Letter PDF can be produced', async ({ page, browserName }) => {
  await page.goto('halloween/print/');
  await expect(page.locator('#print-ready')).toHaveText('Map ready ✓');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.print-controls')).toBeHidden();
  await expect(page.locator('#sheet')).toBeVisible();
  if (browserName === 'chromium') {
    const pdf = await page.pdf({ format: 'Letter', printBackground: true });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    await page.screenshot({ path: 'test-results/print-page.png', fullPage: true });
  }
});

test('print page has no axe violations', async ({ page }) => {
  await page.goto('halloween/print/');
  await expect(page.locator('#print-ready')).toHaveText('Map ready ✓');
  expect(await axeViolations(page)).toEqual([]);
});

for (const paper of ['letter-portrait', 'letter-landscape']) {
  test(`print badges (${paper}) show each house's icon and never overlap`, async ({ page }) => {
    await page.goto(`halloween/print/?paper=${paper}`);
    await expect(page.locator('#print-ready')).toHaveText('Map ready ✓');
    expect(await page.locator('#print-overlay .pm g[data-n] image').count()).toBe(located.length);
    const heads = await page.locator('#print-overlay .pm g[data-n]').evaluateAll(gs => gs.map(g => ({ x: Number(g.dataset.x), y: Number(g.dataset.y), r: Number(g.querySelector('.pm-head').getAttribute('r')) })));
    let closest = Infinity;
    for (let i = 0; i < heads.length; i++) for (let j = i + 1; j < heads.length; j++) closest = Math.min(closest, Math.hypot(heads[i].x - heads[j].x, heads[i].y - heads[j].y) - 2 * heads[i].r);
    expect(closest, `closest badges are ${closest.toFixed(1)} units apart`).toBeGreaterThanOrEqual(0);
    await page.locator('#map-block').screenshot({ path: `test-results/print-badges-${paper}.png` });
    if (process.env.QA_SHOTS) await page.locator('#map-block').screenshot({ path: `${process.env.QA_SHOTS}/print-badges-${paper}.png` });
  });
}
