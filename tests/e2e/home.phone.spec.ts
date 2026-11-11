import { expect, test } from '@playwright/test';

test('no horizontal scroll at 390px', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#work [data-project-card]').first()).toBeVisible();
  // html and body clip overflow-x, which would hide a too-wide element from scrollWidth. Compare
  // against the configured viewport, not innerWidth: mobile emulation zooms out to fit overflow,
  // so innerWidth grows along with the content.
  const scrollWidth = await page.evaluate(() => {
    for (const el of [document.documentElement, document.body]) el.style.overflowX = 'visible';
    return document.documentElement.scrollWidth;
  });
  expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});
