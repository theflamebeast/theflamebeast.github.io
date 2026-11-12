import { expect, test } from '@playwright/test';

test('tapping Work opens the rows with no preview area; tapping Stashout opens its case study', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-work-toggle]').tap();
  await expect(page.locator('[data-work-panel]')).toBeVisible();
  await expect(page.locator('[data-work-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.work-previews')).toBeHidden();
  await page.locator('[data-work-item="stashout"]').tap();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('[data-work-panel]')).toBeHidden();
});

test('nothing overflows sideways with the panel open', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-work-toggle]').tap();
  await expect(page.locator('[data-work-panel]')).toBeVisible();
  // html and body clip overflow-x; lift the clip, as home.phone.spec.ts does.
  const scrollWidth = await page.evaluate(() => {
    for (const el of [document.documentElement, document.body]) el.style.overflowX = 'visible';
    return document.documentElement.scrollWidth;
  });
  expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});
