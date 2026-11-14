import { expect, test } from '@playwright/test';

const HERO = '[data-hero] h1[data-dots]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('ag:intro', '1'));
});

// Chromium also sends a document-level pointerleave when a touch ends, which hides the problem; these
// events are sent alone, as an engine that doesn't send it would.
const touchEvent = (page: import('@playwright/test').Page, type: string, x: number, y: number) =>
  page.evaluate(
    ([t, px, py]) => {
      window.dispatchEvent(
        new PointerEvent(t as string, { pointerType: 'touch', clientX: px as number, clientY: py as number, bubbles: true }),
      );
    },
    [type, x, y],
  );

for (const end of ['pointerup', 'pointercancel']) {
  test(`a finger that moved over the name and ended with ${end} stops pushing the dots, and the drawing idles`, async ({
    page,
  }) => {
    await page.goto('/');
    const canvas = page.locator(`${HERO} canvas[data-dots-canvas]`);
    await expect(canvas).toHaveAttribute('data-state', 'idle', { timeout: 15000 });
    const box = (await page.locator(HERO).boundingBox())!;
    const y = box.y + box.height / 2;
    await touchEvent(page, 'pointermove', box.x + 20, y);
    await touchEvent(page, 'pointermove', box.x + 80, y);
    await expect(canvas).toHaveAttribute('data-state', 'running');
    await touchEvent(page, end, box.x + 80, y);
    await expect(canvas).toHaveAttribute('data-state', 'idle', { timeout: 15000 });
  });
}

test('control: a finger resting on the name keeps the drawing alive while it is down', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator(`${HERO} canvas[data-dots-canvas]`);
  await expect(canvas).toHaveAttribute('data-state', 'idle', { timeout: 15000 });
  const box = (await page.locator(HERO).boundingBox())!;
  const y = box.y + box.height / 2;
  await touchEvent(page, 'pointermove', box.x + 20, y);
  await touchEvent(page, 'pointermove', box.x + 80, y);
  await expect(canvas).toHaveAttribute('data-state', 'running');
  await page.waitForTimeout(1500);
  await expect(canvas).toHaveAttribute('data-state', 'running');
});

test('control: a mouse that stays over the name after a button release keeps pushing the dots', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator(`${HERO} canvas[data-dots-canvas]`);
  await expect(canvas).toHaveAttribute('data-state', 'idle', { timeout: 15000 });
  const box = (await page.locator(HERO).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.evaluate(
    ([px, py]) => {
      const fire = (type: string, x: number) =>
        window.dispatchEvent(
          new PointerEvent(type, { pointerType: 'mouse', clientX: x, clientY: py as number, bubbles: true }),
        );
      fire('pointermove', (px as number) + 20);
      fire('pointermove', (px as number) + 80);
      fire('pointerup', (px as number) + 80);
    },
    [box.x, y],
  );
  await expect(canvas).toHaveAttribute('data-state', 'running');
  await page.waitForTimeout(1500);
  await expect(canvas).toHaveAttribute('data-state', 'running');
});
