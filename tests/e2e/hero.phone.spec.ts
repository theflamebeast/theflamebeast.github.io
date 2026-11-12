import { expect, test } from '@playwright/test';

const INK = '[data-hero] canvas[data-ink]';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(INK)).toHaveAttribute('data-running', 'true');
});

test('dragging on the hero scrolls the page', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y?: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: y === undefined ? [] : [{ x: 195, y }] });
  await touch('touchStart', 640);
  for (let y = 600; y >= 200; y -= 40) {
    await touch('touchMove', y);
    await page.waitForTimeout(16);
  }
  await touch('touchEnd');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
});

test('the hint says "Tap to splash" and fades after a tap', async ({ page }) => {
  const hint = page.locator('[data-ink-hint]');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText(/^tap to splash$/i, { useInnerText: true });
  await page.locator('[data-hero]').tap({ position: { x: 195, y: 300 } });
  await expect(hint).toHaveCSS('opacity', '0');
});

test('neither the hero nor the canvas sets touch-action', async ({ page }) => {
  await expect(page.locator('[data-hero]')).toHaveCSS('touch-action', 'auto');
  await expect(page.locator(INK)).toHaveCSS('touch-action', 'auto');
});
