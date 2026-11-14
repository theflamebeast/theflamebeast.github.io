import { expect, test, type Page } from '@playwright/test';

const live = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink-live').trim());

test('--ink-live changes as the page clock runs', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--ink-live')))
    .not.toBe('');
  const before = await live(page);
  await page.clock.fastForward(6000);
  await expect.poll(() => live(page)).not.toBe(before);
});
