// Captures the two images made from the live ink hero, from the current `dist/` build:
//   src/assets/ink-still.webp  the canvas alone, 1920x1080: what the hero shows without the sim
//   public/og.png              the hero with its text, 1200x630: the Open Graph image
// Usage: npm run build && node scripts/capture-stills.mjs [--seed 3]
// Look at both files before committing; pass another seed for a different arrangement of ink.
import { fileURLToPath } from 'node:url';
import { preview } from 'astro';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url);
const PORT = 4399;
const CHROME = 'body > header';
const SWEEP_MS = 1500;
const SETTLE_MS = 300;
// Brightest-channel means measured over 6 seeds: a stirred still 40 to 47, one the stir missed
// 16 to 20; the OG image (dimmed by the text scrim) 41 to 47 against 29 to 31.
const MIN_BRIGHTEST_MEAN = { still: 28, og: 36 };

const seedFlag = process.argv.indexOf('--seed');
const seed = seedFlag === -1 ? 1 : Number(process.argv[seedFlag + 1]);
if (!Number.isInteger(seed)) throw new Error('--seed takes a whole number');

// The sim places its first splats with Math.random; a fixed seed makes a retake repeatable.
function seedRandom(start) {
  let state = start >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Untouched, the ink is a handful of separate blobs. One S-shaped pass of the cursor each way
// marbles them, which is the frame worth keeping. The pointer moves are dispatched in the page,
// once per frame: driven from here, each move is a round trip, and when those stretch past the
// sim's pointer gap it drops every stroke and the capture comes out nearly black.
async function stir(page) {
  await page.evaluate(
    ({ sweepMs, settleMs }) =>
      new Promise((done) => {
        const hero = document.querySelector('[data-hero]');
        const { width, height } = hero.getBoundingClientRect();
        let direction = 1;
        let start = performance.now();
        const frame = (now) => {
          const t = Math.min((now - start) / sweepMs, 1);
          hero.dispatchEvent(
            new PointerEvent('pointermove', {
              pointerType: 'mouse',
              bubbles: true,
              clientX: width / 2 + direction * width * 0.4 * Math.cos(Math.PI * (1 - t)),
              clientY: height / 2 + direction * height * 0.28 * Math.sin(Math.PI * 2 * t),
            }),
          );
          if (t < 1) return requestAnimationFrame(frame);
          if (direction === 1) {
            direction = -1;
            start = now;
            return requestAnimationFrame(frame);
          }
          setTimeout(done, settleMs);
        };
        requestAnimationFrame(frame);
      }),
    { sweepMs: SWEEP_MS, settleMs: SETTLE_MS },
  );
}

async function assertStirred(image, kind) {
  const { channels } = await sharp(image).stats();
  const brightest = Math.max(...channels.slice(0, 3).map((c) => c.mean));
  if (brightest < MIN_BRIGHTEST_MEAN[kind]) {
    throw new Error(
      `the ${kind} came out dark (brightest channel mean ${brightest.toFixed(1)}, ` +
        `needs ${MIN_BRIGHTEST_MEAN[kind]}); nothing written`,
    );
  }
}

async function openStirredHero(browser, viewport, hide) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(seedRandom, seed);
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/`);
  await page.locator('canvas[data-ink][data-running="true"]').waitFor();
  // The stir's pointer moves would scatter the dot type, so captures show the heading as plain text.
  await page.addStyleTag({
    content: `${hide} { visibility: hidden !important; } [data-dots-canvas] { display: none !important; } [data-dots] { color: var(--text) !important; }`,
  });
  await page.evaluate(() => document.fonts.ready);
  await stir(page);
  return page;
}

const server = await preview({ root: fileURLToPath(ROOT), server: { port: PORT }, logLevel: 'error' });
const browser = await chromium.launch();
try {
  const still = await openStirredHero(
    browser,
    { width: 1920, height: 1080 },
    `[data-hero] > :not([data-ink]), [data-hero]::after, ${CHROME}`,
  );
  const stillShot = await still.locator('canvas[data-ink]').screenshot();
  await assertStirred(stillShot, 'still');

  const og = await openStirredHero(browser, { width: 1200, height: 630 }, CHROME);
  const ogShot = await og.screenshot();
  await assertStirred(ogShot, 'og');

  await sharp(stillShot).webp({ quality: 82 }).toFile(fileURLToPath(new URL('src/assets/ink-still.webp', ROOT)));
  await sharp(ogShot).png({ compressionLevel: 9 }).toFile(fileURLToPath(new URL('public/og.png', ROOT)));

  console.log(`captured src/assets/ink-still.webp and public/og.png (seed ${seed})`);
} finally {
  await browser.close();
  await server.stop();
}
