import { expect, test } from '@playwright/test';

test('no data-smooth, reveals already visible', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(page.locator('[data-hero] h1')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(html).not.toHaveAttribute('data-smooth', /.*/);
  await expect(html).not.toHaveClass(/\bjs-motion\b/);
  await expect(page.locator('.reveal-line')).toHaveCount(0);
  for (const el of await page.locator('[data-reveal]').all()) {
    await expect(el).toHaveCSS('opacity', '1');
    await expect(el).toHaveCSS('transform', 'none');
  }
});

test('the case-study video waits for the visitor: paused, with a play button', async ({ page }) => {
  await page.goto('/work/stashout');
  const video = page.locator('[data-case-video]');
  const toggle = page.locator('[data-video-toggle]');
  await expect(toggle).toHaveAccessibleName('Play video');
  await page.waitForTimeout(500);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await toggle.click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
});
