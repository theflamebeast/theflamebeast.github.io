import { expect, test } from '@playwright/test';

test('under reduced motion no canvas is created and the still is visible', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-hero] [data-ink-still] img')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-ink-hint]')).toBeHidden();
  expect(errors).toEqual([]);
});
