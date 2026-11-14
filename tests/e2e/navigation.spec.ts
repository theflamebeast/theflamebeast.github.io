import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

// A cover could come and go faster than a test can poll, so each document records whether <html>
// ever carried data-intro, however briefly. Init scripts run before <html> exists: watch the document.
async function watchIntro(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { introSeen: boolean };
    w.introSeen = false;
    new MutationObserver(() => {
      if (document.documentElement?.hasAttribute('data-intro')) w.introSeen = true;
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-intro'] });
  });
}

const introSeen = (page: Page) => page.evaluate(() => (window as unknown as { introSeen: boolean }).introSeen);

// Any visible fixed element that covers most of the viewport is a cover, whatever it is called.
const covers = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('body *')].filter((el) => {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed' || s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width * r.height > innerWidth * innerHeight * 0.9;
    }).length,
  );

test('nothing covers the page on a first visit: no intro, no cover element, no route titles', async ({ page }) => {
  await watchIntro(page);
  await page.goto('/');
  expect(await introSeen(page)).toBe(false);
  await expect(page.locator('[data-ink-wipe]')).toHaveCount(0);
  await expect(page.locator('#route-titles')).toHaveCount(0);
  expect(await covers(page)).toBe(0);
});

test('with every script blocked, nothing covers the page as it loads', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(await covers(page)).toBe(0);
  await expect(page.locator('[data-hero] h1')).toBeVisible();
});

test('clicking the Stashout card swaps to it at once', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('#work a[href="/work/stashout"]').first();
  await link.scrollIntoViewIfNeeded();
  // Timed in the page, from the click to the router's swap, so test round trips do not count.
  await page.evaluate(() => {
    const w = window as unknown as { clickAt: number; swapAt: number };
    document.addEventListener('click', () => (w.clickAt = performance.now()), { capture: true, once: true });
    document.addEventListener('astro:after-swap', () => (w.swapAt = performance.now()), { once: true });
  });
  await link.click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('main h1')).toHaveText('Stashout');
  const ms = await page.evaluate(() => {
    const w = window as unknown as { clickAt: number; swapAt: number };
    return w.swapAt - w.clickAt;
  });
  // The cover alone took over 900 ms: 0.55 s to cover and a 0.35 s label hold before the swap.
  expect(ms).toBeLessThan(500);
  expect(await covers(page)).toBe(0);
});

test('the router never crossfades between pages', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const w = window as unknown as { fades: number };
    w.fades = 0;
    const sample = () => {
      w.fades += document
        .getAnimations()
        .filter((a) => ((a.effect as KeyframeEffect | null)?.pseudoElement ?? '').startsWith('::view-transition')).length;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { fades: number }).fades)).toBe(0);
});

test('a keyboard-activated link navigates', async ({ page }) => {
  await page.goto('/');
  // The title link, the one a keyboard reaches (the card's image link is out of the tab order).
  const link = page.locator('#work').getByRole('link', { name: 'Stashout', exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('main h1')).toHaveText('Stashout');
});

test('back then forward: the page scrolls, the trigger count equals a fresh load, no console errors', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/work/stashout');
  await expect(page.locator('html')).toHaveAttribute('data-triggers', /\d+/);
  const fresh = await page.locator('html').getAttribute('data-triggers');

  await page.goto('/');
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator('html')).toHaveAttribute('data-triggers', fresh!);

  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('going back straight after a click still ends on a working page', async ({ page }) => {
  // Start on a case study and reach home client-side, so Back has a page of this site to return to.
  await page.goto('/work/flameburst');
  await page.locator('.nav-name').click();
  await expect(page).toHaveURL(/\/$/);
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await page.goBack();
  await expect(page).toHaveURL(/\/($|work\/(flameburst|stashout)$)/);
  await expect(page.locator('main h1')).toBeVisible();
  expect(await covers(page)).toBe(0);
});
