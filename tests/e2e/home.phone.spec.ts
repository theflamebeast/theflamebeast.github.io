import { expect, test } from '@playwright/test';

test('on a phone the portrait sits between the About heading and the text, inside the screen', async ({ page }) => {
  await page.goto('/');
  const img = page.locator('#about [data-portrait] img');
  await img.scrollIntoViewIfNeeded();
  const pic = (await img.boundingBox())!;
  const title = (await page.locator('#about-title').boundingBox())!;
  const lede = (await page.locator('.about-lede').boundingBox())!;
  expect(pic.y).toBeGreaterThanOrEqual(title.y + title.height);
  expect(pic.y + pic.height).toBeLessThanOrEqual(lede.y);
  expect(pic.x).toBeGreaterThanOrEqual(0);
  expect(pic.x + pic.width).toBeLessThanOrEqual(390);
  expect(pic.width).toBeGreaterThan(150);
});

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
