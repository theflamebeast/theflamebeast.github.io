import { expect, test } from '@playwright/test';

test('under reduced motion links swap pages and back returns, with nothing covering them', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  await expect(page.locator('[data-ink-wipe]')).toHaveCount(0);
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('main h1')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-hero] h1')).toBeVisible();
});
