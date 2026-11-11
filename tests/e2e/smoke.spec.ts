import { expect, test } from '@playwright/test';

test('home responds with the owner name as title', async ({ page }) => {
  const res = await page.goto('/');
  expect(res!.status()).toBe(200);
  await expect(page).toHaveTitle(/Anish Gupta/);
});
