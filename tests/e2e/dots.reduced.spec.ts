import { expect, test } from '@playwright/test';

test('under reduced motion the headings stay ordinary type, with no dots', async ({ page }) => {
  for (const path of ['/', '/work/stashout']) {
    await page.goto(path);
    await expect(page.locator('canvas[data-dots-canvas]')).toHaveCount(0);
    await expect(page.locator('h1[data-dots]')).toHaveCSS('color', 'rgb(233, 237, 243)');
  }
});
