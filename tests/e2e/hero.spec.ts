import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

const INK = '[data-hero] canvas[data-ink]';
const STILL = '[data-hero] [data-ink-still] img';
const ONLY_THE_CANVAS = `
  [data-hero] > :not([data-ink]), [data-hero]::after, body > header { visibility: hidden !important; }
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

const opacity = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => parseFloat(getComputedStyle(el).opacity));

test('on load the static still and the plain-text name never show; the live hero fades in', async ({ page }) => {
  // Every frame from the first paint: is the still showing, or the name as plain (not dot) type?
  await page.addInitScript(() => {
    const w = window as unknown as { frames: number; staticFrames: number };
    w.frames = 0;
    w.staticFrames = 0;
    const tick = () => {
      const still = document.querySelector('[data-hero] [data-ink-still]');
      const name = document.querySelector('[data-hero] h1');
      if (still && name) {
        w.frames++;
        const s = getComputedStyle(name);
        const plainName = parseFloat(s.opacity) > 0.05 && s.color !== 'rgba(0, 0, 0, 0)';
        if (parseFloat(getComputedStyle(still).opacity) > 0.05 || plainName) w.staticFrames++;
      }
      if (performance.now() < 4000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await expect(page.locator(INK)).toHaveAttribute('data-running', 'true');
  await page.waitForTimeout(4200);
  const { frames, staticFrames } = await page.evaluate(() => {
    const w = window as unknown as { frames: number; staticFrames: number };
    return { frames: w.frames, staticFrames: w.staticFrames };
  });
  expect(frames).toBeGreaterThan(10);
  expect(staticFrames).toBe(0);
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-state', 'live');
  await expect.poll(() => opacity(page, '[data-hero] h1')).toBe(1);
});

test('if the page scripts never arrive, the static hero shows after a short wait', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-state', 'pending');
  await expect.poll(() => opacity(page, '[data-hero] [data-ink-still]'), { timeout: 5000 }).toBe(1);
  await expect.poll(() => opacity(page, '[data-hero] h1'), { timeout: 5000 }).toBe(1);
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
  // Straight away, not after the scripts-never-arrived fallback: the hero gives up on going live.
  await expect.poll(() => opacity(page, '[data-hero] [data-ink-still]'), { timeout: 1500 }).toBe(1);
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
  await expect.poll(() => opacity(page, '[data-hero] [data-ink-still]')).toBe(1);
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

// Mean channel value of a 160 px square around (x, y).
async function spot(page: Page, x: number, y: number): Promise<number> {
  const png = await page.screenshot({ clip: { x: x - 80, y: y - 80, width: 160, height: 160 } });
  const { channels } = await sharp(png).stats();
  return channels.slice(0, 3).reduce((sum, c) => sum + c.mean, 0) / 3;
}

/**
 * Presses at A, where the click ring fires, then moves to B and stays 2 s. Measured at B, so the
 * ring (whose brightness varies a lot from run to run) is out of the picture: the only difference
 * between holding and not is the pour. Returns the brightness at B with the button up and held.
 */
async function pourAtRest(page: Page): Promise<{ released: number; held: number }> {
  const a = { x: 260, y: 520 };
  const b = { x: 560, y: 760 };
  const run = async (hold: boolean) => {
    await page.goto('/');
    await expect(page.locator('[data-hero] canvas[data-ink]')).toHaveAttribute('data-running', 'true');
    await page.addStyleTag({ content: ONLY_THE_CANVAS });
    await page.mouse.move(a.x, a.y);
    await page.waitForTimeout(300);
    await page.mouse.down();
    if (!hold) await page.mouse.up();
    await page.mouse.move(b.x, b.y, { steps: 12 });
    await page.waitForTimeout(2000);
    const value = await spot(page, b.x, b.y);
    if (hold) await page.mouse.up();
    return value;
  };
  return { released: await run(false), held: await run(true) };
}

test('holding the mouse button pours bright ink where the cursor rests', async ({ page }) => {
  // Two full loads and two 2 s rests; a slow CI runner needs more than the default 30 s.
  test.setTimeout(60_000);
  const { released, held } = await pourAtRest(page);
  expect(held).toBeGreaterThan(released * 1.5);
  expect(held - released).toBeGreaterThan(25);
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
