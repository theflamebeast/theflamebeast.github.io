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

test('the progress line is empty at the top and full at the bottom', async ({ page }) => {
  await page.goto('/');
  const scaleX = () =>
    page.locator('[data-progress]').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
  expect(await scaleX()).toBeLessThan(0.02);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(scaleX).toBeGreaterThan(0.98);
});
