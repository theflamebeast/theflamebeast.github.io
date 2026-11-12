import { expect, test, type Page } from '@playwright/test';

const wipe = (page: Page) => page.locator('[data-ink-wipe]');

async function atRest(page: Page) {
  await expect(wipe(page)).toHaveAttribute('data-state', 'idle');
  await expect(wipe(page)).toBeHidden();
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

// Records every data-state the persistent cover passes through from now on.
async function recordStates(page: Page): Promise<string[]> {
  const states: string[] = [];
  await page.exposeFunction('reportWipeState', (s: string) => states.push(s));
  await page.evaluate(() => {
    const el = document.querySelector('[data-ink-wipe]')!;
    new MutationObserver(() => (window as unknown as { reportWipeState: (s: string) => void }).reportWipeState(el.getAttribute('data-state')!)).observe(el, {
      attributes: true,
      attributeFilter: ['data-state'],
    });
  });
  return states;
}

test('first load starts under the ink and opens within 1500 ms', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('html')).toHaveAttribute('data-intro', '');
  await page.waitForLoadState('load');
  await expect(wipe(page)).toHaveAttribute('data-state', 'idle', { timeout: 1500 });
  await expect(wipe(page)).toBeHidden();
  await expect(page.locator('[data-hero] h1')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
});

test('a reload in the same session does not show it again', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  await page.reload({ waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  await atRest(page);
});

test('a first visit straight to /work/flameburst also plays it once', async ({ page }) => {
  await page.goto('/work/flameburst', { waitUntil: 'commit' });
  await expect(page.locator('html')).toHaveAttribute('data-intro', '');
  await page.waitForLoadState('load');
  await expect(wipe(page)).toHaveAttribute('data-state', 'idle', { timeout: 1500 });
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
});

test('if the page scripts never load, the cover still lifts and the page is readable', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('html')).toHaveAttribute('data-intro', '');
  await expect(wipe(page)).toBeHidden({ timeout: 3500 });
  await expect(page.locator('[data-hero] h1')).toBeVisible();
});

test('clicking the Stashout card covers the screen from the click, labelled "Stashout", then opens the Stashout page', async ({
  page,
}) => {
  await page.goto('/');
  await atRest(page);
  const link = page.locator('#work a[href="/work/stashout"]').first();
  await link.scrollIntoViewIfNeeded();
  const box = (await link.boundingBox())!;
  const states = await recordStates(page);
  await page.mouse.click(box.x + 20, box.y + 20);
  await expect(page.locator('[data-wipe-label]')).toHaveText('Stashout');
  expect(await wipe(page).evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue('--wipe-x')))).toBeCloseTo(
    box.x + 20,
    0,
  );
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await atRest(page);
  expect(states).toEqual(expect.arrayContaining(['covering', 'covered', 'opening', 'idle']));
  expect(states.indexOf('covering')).toBeLessThan(states.indexOf('opening'));
});

test('a keyboard-activated link covers from the centre', async ({ page }) => {
  await page.goto('/');
  await atRest(page);
  await page.mouse.click(30, 450);
  const link = page.locator('#work a[href="/work/stashout"]').first();
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-wipe-label]')).toHaveText('Stashout');
  const x = await wipe(page).evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue('--wipe-x')));
  expect(x).toBeCloseTo(720, 0);
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await atRest(page);
});

test('back then forward: cover at rest, the page scrolls, the trigger count equals a fresh load, no console errors', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/work/stashout');
  await expect(page.locator('html')).toHaveAttribute('data-triggers', /\d+/);
  const fresh = await page.locator('html').getAttribute('data-triggers');

  await page.goto('/');
  await atRest(page);
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await atRest(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await atRest(page);
  await page.goForward();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await atRest(page);
  await expect(page.locator('html')).toHaveAttribute('data-triggers', fresh!);

  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('a second click while the cover is moving still ends on a page with the cover at rest', async ({ page }) => {
  // Start on a case study and reach home client-side, so Back has a page of this site to return to.
  await page.goto('/work/flameburst');
  await atRest(page);
  await page.locator('.nav-name').click();
  await expect(page).toHaveURL(/\/$/);
  await atRest(page);
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(wipe(page)).toHaveAttribute('data-state', 'covering');
  await page.goBack();
  await atRest(page);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page).toHaveURL(/\/work\/(flameburst|stashout)$/);
});

test('going back to the home page labels the cover "Home"', async ({ page }) => {
  await page.goto('/');
  await atRest(page);
  await page.locator('#work a[href="/work/stashout"]').first().click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await atRest(page);
  await page.goBack();
  await expect(page.locator('[data-wipe-label]')).toHaveText('Home');
  await expect(page).toHaveURL(/\/$/);
  await atRest(page);
});
