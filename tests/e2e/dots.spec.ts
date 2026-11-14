import { expect, test, type Page } from '@playwright/test';

const HERO = '[data-hero] h1[data-dots]';
const CASE = 'main h1[data-dots]';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('ag:intro', '1'));
});

const pixels = (page: Page, heading: string) =>
  page.locator(`${heading} canvas[data-dots-canvas]`).evaluate((c: HTMLCanvasElement) => c.toDataURL());

test('the hero name is drawn in dots over the real heading, which keeps its name', async ({ page }) => {
  await page.goto('/');
  const h1 = page.locator(HERO);
  const canvas = h1.locator('canvas[data-dots-canvas]');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  await expect(h1).toHaveAccessibleName('Anish Gupta');
  await expect(h1).toHaveText('Anish Gupta');
  await expect(h1).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  const [hb, cb] = [(await h1.boundingBox())!, (await canvas.boundingBox())!];
  expect(cb.x).toBeLessThanOrEqual(hb.x);
  expect(cb.y).toBeLessThanOrEqual(hb.y);
  expect(cb.x + cb.width).toBeGreaterThanOrEqual(hb.x + hb.width);
  expect(cb.y + cb.height).toBeGreaterThanOrEqual(hb.y + hb.height);
});

test('once the dots settle the drawing stops, and the cursor sweeping through wakes and moves them', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator(`${HERO} canvas[data-dots-canvas]`);
  await expect(canvas).toHaveAttribute('data-state', 'idle', { timeout: 15000 });
  const settled = await pixels(page, HERO);
  const box = (await page.locator(HERO).boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 20 });
  await expect(canvas).toHaveAttribute('data-state', 'running');
  expect(await pixels(page, HERO)).not.toBe(settled);
  await page.mouse.move(5, 890);
  await expect(canvas).toHaveAttribute('data-state', 'idle', { timeout: 15000 });
});

test('each case study title is drawn in dots too', async ({ page }) => {
  await page.goto('/work/flameburst');
  await expect(page.locator(`${CASE} canvas[data-dots-canvas]`)).toHaveCount(1);
  await expect(page.locator(CASE)).toHaveAccessibleName('FlameBurst');
});

test('leaving and coming back leaves exactly one dot canvas per heading', async ({ page }) => {
  await page.goto('/');
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('canvas[data-dots-canvas]')).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('canvas[data-dots-canvas]')).toHaveCount(1);
});

test('without JS the headings are ordinary type', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('canvas[data-dots-canvas]')).toHaveCount(0);
  await expect(page.locator(HERO)).toHaveCSS('color', 'rgb(233, 237, 243)');
  await context.close();
});
