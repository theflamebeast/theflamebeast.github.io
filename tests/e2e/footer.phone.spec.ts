import { expect, test } from '@playwright/test';

test('at 390 px the headline stays on one line, the address shows in full, and nothing overflows sideways', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const heading = page.locator('footer').getByRole('heading', { name: 'Contact', exact: true });
  await expect(heading).toBeVisible();
  const box = (await heading.boundingBox())!;
  const size = await heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(box.height).toBeLessThan(size * 1.6);
  // The address is the Email tile's value; at 390 px it must not be cut off with an ellipsis.
  const value = page.locator('footer [data-contact-tile][data-copy-email] .tile-value');
  await expect(value).toBeVisible();
  expect(await value.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  // html and body clip overflow-x; lift the clip, as home.phone.spec.ts does, or a too-wide
  // element would hide from scrollWidth.
  const scrollWidth = await page.evaluate(() => {
    for (const el of [document.documentElement, document.body]) el.style.overflowX = 'visible';
    return document.documentElement.scrollWidth;
  });
  expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});
