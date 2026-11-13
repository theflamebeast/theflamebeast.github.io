import { expect, test } from '@playwright/test';

test('under reduced motion the header stays put while scrolling', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(720, 600);
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-header-hidden'))).toBe(false);
  expect((await page.locator('[data-header]').boundingBox())!.y).toBe(0);
});

test('under reduced motion a same-page link jumps to its section', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-links a[href="/#about"]').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  await expect(page).toHaveURL(/#about$/);
});
