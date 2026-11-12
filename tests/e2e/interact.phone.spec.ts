import { expect, test } from '@playwright/test';

test('on a touch screen cards are fully lit: no spotlight attribute', async ({ page }) => {
  await page.goto('/');
  const media = page.locator('[data-project-card] [data-spotlight-target]');
  expect(await media.count()).toBeGreaterThan(0);
  await media.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  for (const el of await media.all()) {
    await expect(el).not.toHaveAttribute('data-spotlight', /.*/);
  }
});
