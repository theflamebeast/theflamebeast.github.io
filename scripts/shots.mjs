// Full-page screenshots of every page for the visual review, from the current `dist/` build:
//   shots/<page>-<desktop|phone>-<motion|reduced>.png  /, /work/stashout, /work/flameburst (12)
//   shots/picker-<desktop|phone>.png                    the open Work picker on / (2)
// Usage: npm run build && node scripts/shots.mjs   (shots/ is gitignored; look at every file)
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import { chromium } from '@playwright/test';

const ROOT = new URL('..', import.meta.url);
const OUT = fileURLToPath(new URL('shots/', ROOT));
const PORT = 4396;
const PAGES = [
  ['home', '/'],
  ['stashout', '/work/stashout'],
  ['flameburst', '/work/flameburst'],
];
const SIZES = [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
];

// Reveals run on scroll, so walk each page top to bottom once before the shot, then back up.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await pause(120);
    }
    window.scrollTo(0, 0);
    await pause(400);
  });
}

async function open(browser, viewport, reducedMotion) {
  return browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion });
}

mkdirSync(OUT, { recursive: true });
const server = await preview({ root: fileURLToPath(ROOT), server: { port: PORT }, logLevel: 'error' });
const browser = await chromium.launch();
try {
  for (const [size, viewport] of SIZES) {
    for (const reduced of [false, true]) {
      const context = await open(browser, viewport, reduced ? 'reduce' : 'no-preference');
      const page = await context.newPage();
      for (const [name, path] of PAGES) {
        await page.goto(`http://localhost:${PORT}${path}`);
        await page.evaluate(() => document.fonts.ready);
        await scrollThrough(page);
        await page.waitForTimeout(1500);
        const file = `${name}-${size}-${reduced ? 'reduced' : 'motion'}.png`;
        await page.screenshot({ path: OUT + file, fullPage: true });
        console.log(`wrote shots/${file}`);
      }
      await context.close();
    }

    const context = await open(browser, viewport, 'no-preference');
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/`);
    await page.locator('[data-work-toggle]').click();
    await page.locator('[data-work-panel]').waitFor();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}picker-${size}.png` });
    console.log(`wrote shots/picker-${size}.png`);
    await context.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
