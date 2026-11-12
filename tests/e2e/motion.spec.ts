import { expect, test, type Locator, type Page } from '@playwright/test';

const translate = (el: Locator) =>
  el.evaluate((node) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return { x: m.m41, y: m.m42 };
  });

async function settle(page: Page, ms = 400) {
  await page.waitForTimeout(ms);
}

test('html[data-smooth="on"] and a wheel scroll eases (scrollY keeps changing after the wheel event)', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-smooth', 'on');
  await page.mouse.move(720, 450);
  // Sample every frame in the page: Lenis damps by elapsed time, so a wall-clock read from the test
  // can land after a stalled frame that already reached the target, eased or not.
  await page.evaluate(() => {
    const w = window as unknown as { scrollSamples: number[] };
    w.scrollSamples = [];
    const start = performance.now();
    const tick = () => {
      w.scrollSamples.push(window.scrollY);
      if (performance.now() - start < 1500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.wheel(0, 800);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { scrollSamples: number[] }).scrollSamples.at(-1)))
    .toBeGreaterThan(700);
  const samples = await page.evaluate(() => (window as unknown as { scrollSamples: number[] }).scrollSamples);
  const between = samples.filter((y) => y > 0 && y < 790);
  expect(between.length).toBeGreaterThan(1);
});

test('a [data-reveal="lines"] heading below the fold is hidden before and visible after scrolling to it', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bjs-motion\b/);
  const line = page.locator('#about-title .reveal-line').first();
  await expect(line).toHaveCount(1);
  expect((await translate(line)).y).toBeGreaterThan(10);
  await page.locator('#about-title').scrollIntoViewIfNeeded();
  await expect.poll(async () => (await translate(line)).y, { timeout: 4000 }).toBeLessThan(0.5);
  await expect(line).toBeVisible();
});

test('a [data-reveal="fade"] block below the fold is transparent before and opaque after scrolling to it', async ({
  page,
}) => {
  await page.goto('/');
  const block = page.locator('#about [data-reveal="fade"]').first();
  await expect(block).toHaveCSS('opacity', '0');
  await block.scrollIntoViewIfNeeded();
  await expect(block).toHaveCSS('opacity', '1', { timeout: 4000 });
});

test('screenshot rows move in opposite directions while scrolling', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('[data-row]');
  await expect(rows).toHaveCount(2);
  await rows.first().scrollIntoViewIfNeeded();
  await settle(page);
  const before = await Promise.all([translate(rows.nth(0)), translate(rows.nth(1))]);
  await page.evaluate(() => window.scrollBy(0, 300));
  await settle(page, 700);
  const after = await Promise.all([translate(rows.nth(0)), translate(rows.nth(1))]);
  const moved = [after[0].x - before[0].x, after[1].x - before[1].x];
  expect(Math.abs(moved[0])).toBeGreaterThan(5);
  expect(Math.abs(moved[1])).toBeGreaterThan(5);
  expect(Math.sign(moved[0])).toBe(-Math.sign(moved[1]));
});

test('clock text matches h:mm AM/PM EST/EDT and updates', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T21:12:30Z') });
  await page.goto('/');
  const clock = page.locator('[data-clock]');
  await expect(clock).toHaveText(/^\d{1,2}:\d{2} (AM|PM) E[SD]T$/);
  await expect(clock).toHaveText('4:12 PM EST');
  // fastForward, not runFor: runFor steps every animation frame of the ink sim through the minute.
  await page.clock.fastForward(60_000);
  await expect(clock).toHaveText('4:13 PM EST');
});

test('resizing 1440 -> 390 leaves no horizontal scroll and resizes the ink canvas', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('[data-hero] canvas[data-ink]');
  await expect(canvas).toHaveAttribute('data-running', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page, 600);
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeLessThanOrEqual(390 * 2);
  for (const y of [0, 0.5, 1]) {
    await page.evaluate((f) => window.scrollTo(0, f * document.documentElement.scrollHeight), y);
    await settle(page, 300);
    // html and body clip overflow-x, so lift the clip to see what would overflow.
    const widest = await page.evaluate(() => {
      document.documentElement.style.overflowX = 'visible';
      document.body.style.overflowX = 'visible';
      const w = document.documentElement.scrollWidth;
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
      return w;
    });
    expect(widest).toBeLessThanOrEqual(390);
  }
});

test('the case-study video plays, and its pause button stops it and starts it again', async ({ page }) => {
  await page.goto('/work/stashout');
  const video = page.locator('[data-case-video]');
  const toggle = page.locator('[data-video-toggle]');
  await expect(video).not.toHaveAttribute('controls', '');
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await expect(toggle).toHaveAccessibleName('Pause video');
  await toggle.click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(toggle).toHaveAccessibleName('Play video');
  await toggle.click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
});

test('without JS the case-study video does not autoplay and has native controls', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/work/stashout');
  const video = page.locator('[data-case-video]');
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).not.toHaveAttribute('autoplay', '');
  await expect(page.locator('[data-video-toggle]')).toBeHidden();
  await context.close();
});
