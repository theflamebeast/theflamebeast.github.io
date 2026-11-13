import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

const INK = '[data-hero] canvas[data-ink]';
const STILL = '[data-hero] [data-ink-still] img';
const ONLY_THE_CANVAS = `
  [data-hero] > :not([data-ink]), [data-hero]::after, body > header, [data-ink-wipe] { visibility: hidden !important; }
`;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function maxStdev(png: Buffer): Promise<number> {
  const { channels } = await sharp(png).stats();
  return Math.max(...channels.slice(0, 3).map((c) => c.stdev));
}

test('the canvas runs, is not blank and logs no errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const canvas = page.locator(INK);
  await expect(canvas).toHaveAttribute('data-running', 'true');
  await page.addStyleTag({ content: ONLY_THE_CANVAS });
  await page.waitForTimeout(1500);
  await expect(canvas).toHaveCSS('opacity', '1');
  expect(await maxStdev(await canvas.screenshot())).toBeGreaterThan(8);
  expect(errors).toEqual([]);
});

test('the hint shows while the sim runs and fades after the first stir', async ({ page }) => {
  await page.goto('/');
  const hint = page.locator('[data-ink-hint]');
  await expect(page.locator(INK)).toHaveAttribute('data-running', 'true');
  await expect(hint).toBeVisible();
  // innerText, not textContent: the touch-screen wording is display: none here. It is uppercased by CSS.
  await expect(hint).toHaveText(/^move your cursor$/i, { useInnerText: true });
  await page.mouse.move(700, 400);
  await page.mouse.move(760, 430);
  await expect(hint).toHaveCSS('opacity', '0');
});

test('no rotating arrows anywhere', async ({ page }) => {
  for (const path of ['/', '/work/stashout']) {
    await page.goto(path);
    await expect(page.locator('[data-rotate]')).toHaveCount(0);
  }
});

test('the still is in the page before any script runs, sized to the hero', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator(INK)).toHaveCount(0);
  await expect(page.locator('[data-ink-hint]')).toBeHidden();
  const still = page.locator(STILL);
  await expect(still).toBeVisible();
  await expect(still).toHaveAttribute('fetchpriority', 'high');
  await expect.poll(() => still.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  const [hero, img] = await Promise.all([page.locator('[data-hero]').boundingBox(), still.boundingBox()]);
  expect(img).toEqual(hero);
  // addStyleTag waits on a page script, which never runs here; the screenshot's own style doesn't.
  const shot = await page.locator('[data-hero]').screenshot({
    style: ONLY_THE_CANVAS.replace(':not([data-ink])', ':not([data-ink-still])'),
  });
  expect(await maxStdev(shot)).toBeGreaterThan(8);
  await context.close();
});

test('the sim stops when the hero scrolls out of view and resumes on return', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator(INK);
  await expect(canvas).toHaveAttribute('data-running', 'true');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(canvas).toHaveAttribute('data-running', 'false');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(canvas).toHaveAttribute('data-running', 'true');
});

test('the sim stops when the tab is hidden and resumes when it is shown', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator(INK);
  await expect(canvas).toHaveAttribute('data-running', 'true');
  const setHidden = (hidden: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await setHidden(true);
  await expect(canvas).toHaveAttribute('data-running', 'false');
  await setHidden(false);
  await expect(canvas).toHaveAttribute('data-running', 'true');
});

test('no WebGL2: the still is visible, there is no canvas, zero console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type === 'webgl2' ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator(STILL)).toBeVisible();
  await expect(page.locator(INK)).toHaveCount(0);
  await expect(page.locator('[data-ink-hint]')).toBeHidden();
  await expect(page.locator('[data-hero] h1')).toHaveText('Anish Gupta');
  expect(errors).toEqual([]);
});

test('no float render targets: the same fallback', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function (this: WebGL2RenderingContext, name: string) {
      return /^EXT_color_buffer_(half_)?float$/.test(name) ? null : original.call(this, name as never);
    } as typeof original;
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator(STILL)).toBeVisible();
  await expect(page.locator(INK)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a lost WebGL context falls back to the still, and the sim returns when it is restored', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const canvas = page.locator(INK);
  await expect(canvas).toHaveAttribute('data-running', 'true');
  await expect(canvas).toHaveCSS('opacity', '1');
  await canvas.evaluate((c: HTMLCanvasElement) => {
    const ext = c.getContext('webgl2')!.getExtension('WEBGL_lose_context')!;
    (window as unknown as { loseContext: WEBGL_lose_context }).loseContext = ext;
    ext.loseContext();
  });
  await expect(canvas).toHaveAttribute('data-running', 'false');
  await expect(canvas).toHaveCSS('opacity', '0');
  await expect(page.locator(STILL)).toBeVisible();
  await page.evaluate(() => (window as unknown as { loseContext: WEBGL_lose_context }).loseContext.restoreContext());
  await expect(canvas).toHaveAttribute('data-running', 'true');
  await expect(canvas).toHaveCSS('opacity', '1');
  await page.addStyleTag({ content: ONLY_THE_CANVAS });
  await page.waitForTimeout(1000);
  expect(await maxStdev(await canvas.screenshot())).toBeGreaterThan(8);
  expect(errors).toEqual([]);
});

test('leaving for a case study and coming back leaves exactly one canvas, paused until the hero is back in view', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator(INK)).toHaveAttribute('data-running', 'true');
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('canvas[data-ink]')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('canvas[data-ink]')).toHaveCount(1);
  // Back restores the scroll position the link was clicked from, which leaves the hero off screen.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.locator(INK)).toHaveAttribute('data-running', 'false');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(INK)).toHaveAttribute('data-running', 'true');
  expect(errors).toEqual([]);
});

// How much brighter a 160 px square around (x, y) got after `act`, as the mean of its channels.
async function brightening(page: Page, x: number, y: number, act: () => Promise<void>): Promise<number> {
  const mean = async () => {
    const png = await page.screenshot({ clip: { x: x - 80, y: y - 80, width: 160, height: 160 } });
    const { channels } = await sharp(png).stats();
    return channels.slice(0, 3).reduce((sum, c) => sum + c.mean, 0) / 3;
  };
  const before = await mean();
  await act();
  return (await mean()) - before;
}

test('holding the mouse button keeps pouring bright ink, far more than one click', async ({ page }) => {
  const [x, y] = [260, 720];
  const open = async () => {
    await page.addInitScript(() => sessionStorage.setItem('ag:intro', '1'));
    await page.goto('/');
    await expect(page.locator(INK)).toHaveAttribute('data-running', 'true');
    await page.addStyleTag({ content: ONLY_THE_CANVAS });
    await page.mouse.move(x, y);
    await page.waitForTimeout(300);
  };

  await open();
  const click = await brightening(page, x, y, async () => {
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(2000);
  });

  await open();
  const hold = await brightening(page, x, y, async () => {
    await page.mouse.down();
    await page.waitForTimeout(2000);
  });
  await page.mouse.up();

  expect(hold).toBeGreaterThan(click * 1.5);
  expect(hold).toBeGreaterThan(15);
});

test('the canvas follows the hero when the window is resized from desktop to phone width', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator(INK);
  await expect(canvas).toHaveAttribute('data-running', 'true');
  const size = () => canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height]);
  expect(await size()).toEqual([1440, 900]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(size).toEqual([390, 844]);
  await page.addStyleTag({ content: ONLY_THE_CANVAS });
  await page.waitForTimeout(500);
  expect(await maxStdev(await canvas.screenshot())).toBeGreaterThan(8);
});

test.describe('on a 2560 x 1440 screen at pixel ratio 2', () => {
  test.use({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });

  test('the canvas stays at or under 2.4 million pixels', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator(INK);
    await expect(canvas).toHaveAttribute('data-running', 'true');
    const [w, h] = await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height]);
    expect(w * h).toBeLessThanOrEqual(2.4e6);
    expect(w * h).toBeGreaterThan(2.3e6);
    expect(w / h).toBeCloseTo(2560 / 1440, 2);
  });
});
