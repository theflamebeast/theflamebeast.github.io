import { expect, test } from '@playwright/test';

test('under reduced motion the live colour holds still at its resting value', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--ink-live'))).toBe('');
});
