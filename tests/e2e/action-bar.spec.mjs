// The bottom action bar must stay attached to the bottom of the screen on iPhone Safari while the whole page scrolls.
// (The real proof is a real iPhone with iOS 26's floating toolbar; this checks the layout rules that make it hold.)
import { test, expect } from './fixtures.mjs';
import { webkit, devices } from '@playwright/test';

test.beforeEach(({ browserName }) => { test.skip(browserName !== 'webkit', 'iPhone Safari behaviour is checked with WebKit'); test.setTimeout(120000); });

test('iPhone 15: the bar bottom equals the window height at every scroll step and nothing can show beneath it', async ({}, info) => {
  const browser = await webkit.launch();
  const context = await browser.newContext({ ...devices['iPhone 15'], baseURL: info.project.use.baseURL });
  const page = await context.newPage();
  await page.goto('halloween/');
  await page.waitForLoadState('networkidle');
  const bar = page.locator('.action-bar');
  await expect(bar).toBeVisible();

  const rules = await page.evaluate(() => {
    const el = document.querySelector('.action-bar'), cs = getComputedStyle(el);
    const offenders = [];
    for (let a = el.parentElement; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if ((s.transform && s.transform !== 'none') || (s.filter && s.filter !== 'none') || (s.backdropFilter && s.backdropFilter !== 'none') || s.willChange.includes('transform') || (s.contain && s.contain !== 'none' && s.contain !== 'style')) offenders.push(a.tagName);
    }
    const after = getComputedStyle(el, '::after');
    return { position: cs.position, left: cs.left, right: cs.right, bottom: cs.bottom, padBottom: cs.paddingBottom, offenders, afterTop: after.top, afterHeight: after.height, afterBg: after.backgroundColor, barBg: cs.backgroundColor, bodyPad: getComputedStyle(document.body).paddingBottom };
  });
  expect(rules.position).toBe('fixed');
  expect([rules.left, rules.right, rules.bottom]).toEqual(['0px', '0px', '0px']);
  expect(rules.offenders, 'no ancestor turns fixed into absolute').toEqual([]);
  expect(rules.afterHeight).toBe('120px');
  expect(rules.afterBg).toBe(rules.barBg);
  expect(parseFloat(rules.bodyPad)).toBeGreaterThanOrEqual(88);

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const view = await page.evaluate(() => window.innerHeight);
  const positions = [];
  const gaps = [];
  for (let y = 0; y <= total; y += Math.round(view * 0.6)) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
    const { bottom, inner } = await page.evaluate(() => ({ bottom: document.querySelector('.action-bar').getBoundingClientRect().bottom, inner: window.innerHeight }));
    gaps.push(Math.abs(bottom - inner));
    positions.push(y);
  }
  expect(Math.max(...gaps), 'bar bottom minus window height at every step').toBeLessThanOrEqual(0.5);

  if (process.env.QA_SHOTS) {
    for (const [label, frac] of [['top', 0.05], ['middle', 0.5], ['bottom', 1]]) {
      await page.evaluate(f => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), frac);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${process.env.QA_SHOTS}/action-bar-webkit-${label}.png` });
    }
  }
  // the last content is not hidden behind the bar
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const clear = await page.evaluate(() => { const last = document.querySelector('footer').getBoundingClientRect().bottom, bar = document.querySelector('.action-bar').getBoundingClientRect().top; return bar - last; });
  expect(clear).toBeGreaterThanOrEqual(-0.5);
  await browser.close();
});

test('no layout on the Halloween page uses 100vh', async ({ page }) => {
  const css = await Promise.all(['base', 'halloween', 'map'].map(n => page.request.get(`assets/css/${n}.css`).then(r => r.text())));
  expect(css.join('\n')).not.toMatch(/100vh/);
});
