import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('every [data-reveal] element is visible with opacity 1', async ({ page }) => {
  await page.goto('/');
  const reveals = page.locator('[data-reveal]');
  expect(await reveals.count()).toBeGreaterThan(3);
  for (const el of await reveals.all()) {
    await el.scrollIntoViewIfNeeded();
    await expect(el).toBeVisible();
    await expect(el).toHaveCSS('opacity', '1');
  }
});
