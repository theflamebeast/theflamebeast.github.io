import { expect, test } from '@playwright/test';

test('no preloader, and navigation swaps without the cover ever leaving idle', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  const wipe = page.locator('[data-ink-wipe]');
  await expect(wipe).toHaveAttribute('data-state', 'idle');
  await expect(wipe).toBeHidden();

  const states: string[] = [];
  await page.exposeFunction('reportWipeState', (s: string) => states.push(s));
  await page.evaluate(() => {
    const el = document.querySelector('[data-ink-wipe]')!;
    new MutationObserver(() => (window as unknown as { reportWipeState: (s: string) => void }).reportWipeState(el.getAttribute('data-state')!)).observe(el, {
      attributes: true,
      attributeFilter: ['data-state'],
    });
  });
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('main h1')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(300);
  expect(states).toEqual([]);
  await expect(wipe).toBeHidden();
});
