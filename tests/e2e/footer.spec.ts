import { expect, test, type Page } from '@playwright/test';

const EMAIL = 'anishguptaa18@gmail.com';
const TILES = 'footer [data-contact-tile]';
const EMAIL_TILE = 'footer [data-contact-tile][data-copy-email]';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

declare global {
  interface Window {
    __defaults: boolean[];
  }
}

// Records `defaultPrevented` for every click that reaches the document: true means the copy handler
// took the click, false means the browser was left to follow the mailto link.
async function recordClicks(page: Page) {
  await page.addInitScript(() => {
    window.__defaults = [];
    document.addEventListener('click', (e) => window.__defaults.push(e.defaultPrevented));
  });
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

const defaults = (page: Page) => page.evaluate(() => window.__defaults);

test('the footer headline is the word Contact, large, and not a link', async ({ page }) => {
  await page.goto('/');
  const heading = page.locator('footer').getByRole('heading', { name: 'Contact', exact: true });
  await expect(heading).toBeVisible();
  const size = await heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThan(60);
  await expect(heading.locator('a')).toHaveCount(0);
  // The small label above it and the separate mail link are gone: "Contact" appears once.
  await expect(page.locator('footer').getByText('Contact', { exact: true })).toHaveCount(1);
  await expect(page.locator('footer')).not.toContainText('Open in your mail app');
});

test('under the headline an invitation and three contact tiles: Email, LinkedIn, GitHub', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer [data-contact-invite]')).toBeVisible();
  const tiles = page.locator(TILES);
  await expect(tiles).toHaveCount(3);
  await expect(tiles.locator('.tile-label')).toHaveText([/email/i, /linkedin/i, /github/i]);
  await expect(tiles.locator('.tile-value')).toHaveText([EMAIL, 'anishgupta25', 'Code and projects']);
  const hrefs = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs).toEqual([`mailto:${EMAIL}`, 'https://www.linkedin.com/in/anishgupta25', 'https://github.com/theflamebeast']);
  for (const tile of await tiles.all()) await expect(tile.locator('svg')).toHaveCount(2);
});

test('the address appears once, in the Email tile, which is the only copy target and the only mail link', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('footer [data-copy-email]')).toHaveCount(1);
  await expect(page.locator(EMAIL_TILE)).toHaveCount(1);
  await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(1);
  await expect(page.locator('footer').getByText(EMAIL, { exact: true })).toHaveCount(1);
});

test('clicking the Email tile copies the address and says Copied, then the note clears', async ({ page }) => {
  await page.goto('/');
  await page.locator(EMAIL_TILE).click();
  await expect(page.locator('[data-copy-status]')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-copy-status]')).toHaveText('', { timeout: 3000 });
});

test('when copying is refused the click falls through to the mail app, with no error', async ({ page }) => {
  const errors = collectErrors(page);
  await recordClicks(page);
  await page.addInitScript(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
  });
  await page.goto('/');
  await page.locator(EMAIL_TILE).click();
  // One click the handler took and one it released to the browser. An already-rejected promise settles
  // before the outer click reaches the document, so the order is not the one a real denial would give.
  await expect.poll(async () => [...(await defaults(page))].sort()).toEqual([false, true]);
  await expect(page.locator('[data-copy-status]')).toHaveText('');
  expect(errors).toEqual([]);
});

test('with no clipboard API the click is never intercepted', async ({ page }) => {
  const errors = collectErrors(page);
  await recordClicks(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
  });
  await page.goto('/');
  await page.locator(EMAIL_TILE).click();
  await expect.poll(() => defaults(page)).toEqual([false]);
  expect(errors).toEqual([]);
});

test('a ctrl-click is left alone', async ({ page }) => {
  await recordClicks(page);
  await page.goto('/');
  await page.locator(EMAIL_TILE).click({ modifiers: ['Control'] });
  await expect.poll(() => defaults(page)).toEqual([false]);
  await expect(page.locator('[data-copy-status]')).toHaveText('');
});

test('without JS the Email tile is an ordinary mailto link and the note is empty', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator(EMAIL_TILE)).toHaveAttribute('href', `mailto:${EMAIL}`);
  await expect(page.locator('[data-copy-status]')).toHaveText('');
  await context.close();
});
