import { test, expect } from './fixtures.mjs';
import { axeViolations, allImages, watch } from './helpers.mjs';

test('home shows two cards; Halloween is a link, Christmas is inert text', async ({ page }) => {
  const problems = watch(page);
  await page.goto('./');
  await expect(page.locator('.event-card')).toHaveCount(2);
  const halloween = page.locator('a.event-card[data-event="halloween-2026"]');
  await expect(halloween).toHaveAttribute('href', 'halloween/');
  const xmas = page.locator('.event-card[data-event="christmas-2026"]');
  await expect(xmas).toContainText("Updating for this year's event");
  expect(await xmas.locator('a, button, [tabindex]').count()).toBe(0);
  expect(await xmas.evaluate(el => el.tagName)).toBe('ARTICLE');
  const before = page.url();
  await xmas.click({ force: true });
  expect(page.url()).toBe(before);
  await allImages(page);
  expect(problems.errors).toEqual([]);
  expect(problems.bad).toEqual([]);
  expect(problems.external).toEqual([]);
});
test('home card shows the live house count from the snapshot', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('a.event-card .card-count')).toHaveText(/^\d+ houses on the trail$/);
});
test('legacy /#map links redirect to the Halloween page', async ({ page }) => {
  await page.goto('./#map');
  await page.waitForURL(/\/halloween\/#map$/);
  await page.goto('./#featured-houses');
  await page.waitForURL(/\/halloween\/#houses$/);
});
test('home has no axe violations and no horizontal overflow at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('./');
  await allImages(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await axeViolations(page)).toEqual([]);
});
test('christmas page says updating and links home', async ({ page }) => {
  await page.goto('christmas/');
  await expect(page.locator('#xmas-status')).toHaveText('Updating for this year’s event');
  expect(await axeViolations(page)).toEqual([]);
});
test('404 page gives a way back and offline page renders', async ({ page }) => {
  const res = await page.goto('does-not-exist/');
  expect(res.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Holiday Trails home' })).toBeVisible();
  await page.goto('offline.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Offline');
});
test('Halloween card meets the brand rules: cream text on dark scrim, neon frame, no red body text', async ({ page }) => {
  await page.goto('./');
  const bad = await page.evaluate(() => {
    const red = getComputedStyle(document.documentElement).getPropertyValue('--rb-cardinal').trim();
    const toRGB = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
    const target = toRGB(red);
    return [...document.querySelectorAll('p, a, li, span, h2, h3')].filter(el => getComputedStyle(el).color === target && parseFloat(getComputedStyle(el).fontSize) < 24 && el.textContent.trim()).map(el => el.textContent.trim().slice(0, 30));
  });
  expect(bad).toEqual([]);
});
