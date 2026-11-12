import { expect, test } from '@playwright/test';

test('a button fills with the live colour on hover, its label turns dark, and it does not lean', async ({ page }) => {
  await page.goto('/work/stashout');
  const btn = page.locator('.case-links .btn').first();
  await expect(btn).not.toHaveAttribute('data-magnetic', /.*/);
  const box = (await btn.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3);
  await expect(btn.locator('.btn-text')).toHaveCSS('color', 'rgb(6, 7, 12)');
  // The fill has risen to cover the button.
  await expect
    .poll(async () => Math.abs((await btn.locator('.btn-fill').boundingBox())!.y - box.y))
    .toBeLessThan(2);
  await expect(btn).toHaveCSS('transform', 'none');
  expect(await btn.boundingBox()).toEqual(box);
});

test('a button fills the same way when it is reached with the keyboard', async ({ page }) => {
  await page.goto('/work/stashout');
  const btn = page.locator('.case-links .btn').first();
  await btn.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(btn).toBeFocused();
  await expect(btn.locator('.btn-text')).toHaveCSS('color', 'rgb(6, 7, 12)');
});

test('a project card dims its screenshot and the cursor lights the area around it', async ({ page }) => {
  await page.goto('/');
  const media = page.locator('[data-project-card] [data-spotlight-target]').first();
  await media.scrollIntoViewIfNeeded();
  await expect(media).toHaveAttribute('data-spotlight', 'on');
  const box = (await media.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect
    .poll(() => media.evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue('--mx'))))
    .toBeCloseTo(box.width / 2, -1);
  await page.mouse.move(2, 2);
  await expect.poll(() => media.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--mx'))).toBe('');
});

test('without JS the cards are fully lit', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const media = page.locator('[data-project-card] [data-spotlight-target]').first();
  await expect(media).toBeVisible();
  await expect(media).not.toHaveAttribute('data-spotlight', /.*/);
  await context.close();
});
