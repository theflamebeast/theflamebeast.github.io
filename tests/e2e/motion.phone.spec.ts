import { expect, test } from '@playwright/test';

const SCRUBBED = '[data-row], [data-parallax], [data-footer-curve], [data-rotate]';

test('no scroll-scrubbed transforms on rows, parallax, rotations or footer curve below 720px', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-hero] h1')).toBeVisible();
  const scrubbed = page.locator(SCRUBBED);
  expect(await scrubbed.count()).toBeGreaterThan(3);
  for (const f of [0.3, 0.6, 1]) {
    await page.evaluate((y) => window.scrollTo(0, y * document.documentElement.scrollHeight), f);
    await page.waitForTimeout(300);
    for (const el of await scrubbed.all()) {
      await expect(el).toHaveCSS('transform', 'none');
    }
  }
});
