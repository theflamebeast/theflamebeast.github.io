import { expect, test } from '@playwright/test';

test('at 390 px the email stays on one line and nothing overflows sideways', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const email = page.locator('footer [data-copy-email]');
  await expect(email).toBeVisible();
  const box = (await email.boundingBox())!;
  const size = await email.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(box.height).toBeLessThan(size * 1.6);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  // html and body clip overflow-x; lift the clip, as home.phone.spec.ts does, or a too-wide
  // element would hide from scrollWidth.
  const scrollWidth = await page.evaluate(() => {
    for (const el of [document.documentElement, document.body]) el.style.overflowX = 'visible';
    return document.documentElement.scrollWidth;
  });
  expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});
