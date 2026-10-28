// Printable maps section, the Get the app section and the header on the Halloween page.
import { test, expect, mockApi } from './fixtures.mjs';
import { axeViolations } from './helpers.mjs';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

test('Printable maps live in the More view: two cards, a which-to-use line, and the old #printables address opens them', async ({ page }) => {
  await page.route('**/assets/vendor/**', route => route.abort());
  await page.goto('halloween/#printables');
  await expect(page.locator('body')).toHaveAttribute('data-view', 'more');
  const section = page.locator('#printables');
  await expect(section.getByRole('heading', { name: 'Printable maps', level: 2 })).toBeVisible();
  await expect(section.getByRole('heading', { name: 'Trail map flyer' })).toBeVisible();
  await expect(section.getByText('Designed one-page map with every house, best for printing and sharing')).toBeVisible();
  await expect(section.getByRole('link', { name: 'Download PDF' })).toHaveAttribute('href', /redbird-trail-map-2026\.pdf$/);
  await expect(section.getByRole('link', { name: 'View full screen' })).toHaveAttribute('href', /halloween\/trail-map\/$/);
  await expect(section.getByRole('heading', { name: 'Live map printout' })).toBeVisible();
  await expect(section.getByText('Always includes the newest houses')).toBeVisible();
  await expect(section.getByRole('link', { name: 'Print or save as PDF' })).toHaveAttribute('href', /halloween\/print\/$/);
  await expect(section.getByText('Which should I use?')).toBeVisible();
  expect(await page.evaluate(() => [...document.querySelectorAll('#printables img')].every(i => i.getAttribute('width') && i.getAttribute('height')))).toBe(true);
  if (process.env.QA_SHOTS) await section.screenshot({ path: process.env.QA_SHOTS + "/printables-" + test.info().project.name + ".png" });
});

test.describe('Get the Red Bird app', () => {
  test('the section explains the benefits and offers steps for every device with tabs', async ({ page }) => {
    await page.goto('./');
    const section = page.locator('#get-app');
    await expect(section.getByRole('heading', { name: 'Get the Red Bird app' })).toBeVisible();
    await expect(section).toContainText('One app for every Red Bird neighborhood event. Install it once and you’ll have the Halloween trail now, the holiday trail when it opens, and future events, even with weak signal on the night.');
    for (const benefit of ['Find the nearest house', 'Works offline on event night', 'New events appear automatically']) await expect(section.getByText(benefit)).toBeVisible();
    await expect(section.getByRole('tab')).toHaveCount(3);
    await section.getByRole('tab', { name: 'iPhone or iPad' }).click();
    await expect(section.locator('#panel-ios')).toContainText('Open as Web App');
    await expect(section.locator('#panel-ios svg.glyph')).toHaveCount(2);
    await section.getByRole('tab', { name: 'Android' }).click();
    await expect(section.locator('#panel-android')).toContainText('Chrome menu');
    await section.getByRole('tab', { name: 'Computer' }).click();
    await expect(section.locator('#panel-desktop')).toContainText('install icon');
    await section.getByRole('tab', { name: 'Computer' }).press('ArrowLeft');
    await expect(section.getByRole('tab', { name: 'Android' })).toHaveAttribute('aria-selected', 'true');
    if (process.env.QA_SHOTS) await section.screenshot({ path: `${process.env.QA_SHOTS}/get-app-${test.info().project.name}.png` });
    expect(await axeViolations(page)).toEqual([]);
  });

  test('it sits below the event cards and above the footer, with nothing popping up by itself', async ({ page }) => {
    await page.goto('./');
    expect(await page.evaluate(() => {
      const c = document.querySelector('.cards-section'), a = document.querySelector('#get-app'), f = document.querySelector('footer');
      return !!(c.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(a.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await page.waitForTimeout(1500);
    await expect(page.locator('dialog[open], .toast, .sheet')).toHaveCount(0);
  });

  test('an iPhone sees the iPhone steps first', async ({ browser }) => {
    const context = await browser.newContext({ userAgent: IOS, baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
    await mockApi(context);
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.getByRole('tab', { name: 'iPhone or iPad' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-ios')).toBeVisible();
    await expect(page.locator('#panel-android')).toBeHidden();
    if (process.env.QA_SHOTS) await page.locator('#get-app').screenshot({ path: `${process.env.QA_SHOTS}/get-app-ios.png` });
    await context.close();
  });

  test('Android sees the Install app button once the browser offers the prompt, and the menu fallback otherwise', async ({ browser }) => {
    const context = await browser.newContext({ userAgent: ANDROID, baseURL: test.info().project.use.baseURL, viewport: { width: 412, height: 915 }, hasTouch: true });
    await mockApi(context);
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.getByRole('tab', { name: 'Android' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#app-install-button')).toBeHidden();
    await expect(page.locator('#panel-android')).toContainText('Chrome menu');
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true });
      e.prompt = () => { window.__prompted = true; };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
    await expect(page.locator('#app-install-button')).toBeVisible();
    if (process.env.QA_SHOTS) await page.locator('#get-app').screenshot({ path: `${process.env.QA_SHOTS}/get-app-android.png` });
    await page.locator('#app-install-button').click();
    expect(await page.evaluate(() => window.__prompted)).toBe(true);
    await context.close();
  });

  test('when the app is already installed it says so instead of showing steps', async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = q => (q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q));
    });
    await page.goto('./?home');
    await expect(page.locator('#app-installed')).toBeVisible();
    await expect(page.locator('#app-installed')).toHaveText('You’re using the Red Bird app ✓');
    await expect(page.locator('#app-steps')).toBeHidden();
  });

  test('without JavaScript every device section is readable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: test.info().project.use.baseURL });
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.locator('#panel-ios')).toBeVisible();
    await expect(page.locator('#panel-android')).toBeVisible();
    await expect(page.locator('#panel-desktop')).toBeVisible();
    await context.close();
  });
});
