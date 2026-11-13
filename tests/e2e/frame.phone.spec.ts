import { expect, test } from '@playwright/test';

test('at 390 px the edge lines sit at the edges and nothing overflows sideways', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-edge="left"]')).toBeVisible();
  const right = (await page.locator('[data-edge="right"]').boundingBox())!;
  expect(right.x + right.width).toBe(390);
  // html and body clip overflow-x; lift the clip, as home.phone.spec.ts does.
  const scrollWidth = await page.evaluate(() => {
    for (const el of [document.documentElement, document.body]) el.style.overflowX = 'visible';
    return document.documentElement.scrollWidth;
  });
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
