import { expect, test } from '@playwright/test';

test('thin live-colour lines run down both edges of the viewport, on every page', async ({ page }) => {
  for (const path of ['/', '/work/flameburst']) {
    await page.goto(path);
    const { width, height } = page.viewportSize()!;
    for (const side of ['left', 'right'] as const) {
      const line = page.locator(`[data-edge="${side}"]`);
      await expect(line).toBeVisible();
      await expect(line).toHaveCSS('position', 'fixed');
      await expect(line).toHaveCSS('pointer-events', 'none');
      const box = (await line.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(1);
      expect(box.height).toBe(height);
      if (side === 'left') expect(box.x).toBe(0);
      else expect(box.x + box.width).toBe(width);
    }
  }
});

test('the edge lines take the live colour', async ({ page }) => {
  await page.goto('/');
  // Both read in one go: the live colour is rewritten every 200 ms.
  const [colour, live] = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.background = 'var(--ink-live)';
    document.body.append(probe);
    const pair = [
      getComputedStyle(document.querySelector('[data-edge="left"]')!).backgroundColor,
      getComputedStyle(probe).backgroundColor,
    ];
    probe.remove();
    return pair;
  });
  expect(colour).toBe(live);
});
