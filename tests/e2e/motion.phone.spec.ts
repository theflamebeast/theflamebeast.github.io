import { expect, test } from '@playwright/test';

const SCRUBBED = '[data-row], [data-parallax], [data-footer-curve], [data-rotate]';

test('no scroll-scrubbed transforms on rows, parallax, rotations or footer curve below 720px', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-hero] h1')).toBeVisible();
  const scrubbed = page.locator(SCRUBBED);
  expect(await scrubbed.count()).toBeGreaterThan(3);
  for (const f of [0.3, 0.6, 1]) {
    await page.evaluate((y) => window.scrollTo(0, y * document.documentElement.scrollHeight), f);
    await page.waitForTimeout(300);
    for (const el of await scrubbed.all()) {
      await expect(el).toHaveCSS('transform', 'none');
    }
  }
});

test('the marquee still rolls on a phone', async ({ page }) => {
  await page.goto('/');
  const track = page.locator('[data-marquee]');
  await track.scrollIntoViewIfNeeded();
  const x = () => track.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
  const a = await x();
  await page.waitForTimeout(500);
  expect(Math.abs((await x()) - a)).toBeGreaterThan(5);
});
