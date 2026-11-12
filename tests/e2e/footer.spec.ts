import { expect, test, type Page } from '@playwright/test';

const EMAIL = 'anishguptaa18@gmail.com';
const EMAIL_LINK = 'footer [data-copy-email]';

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

test('the email is the footer headline, on one line, inside the viewport', async ({ page }) => {
  await page.goto('/');
  const email = page.locator(EMAIL_LINK);
  await expect(email).toHaveText(EMAIL);
  await expect(email).toHaveAttribute('href', `mailto:${EMAIL}`);
  const box = (await email.boundingBox())!;
  const size = await email.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThan(60);
  expect(box.height).toBeLessThan(size * 1.6);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1440);
  await expect(page.locator('footer')).not.toContainText('Have a role');
  await expect(page.locator('[data-footer-curve]')).toHaveCount(0);
});

test('clicking the email copies it and says Copied, then the note clears', async ({ page }) => {
  await page.goto('/');
  await page.locator(EMAIL_LINK).click();
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
  await page.locator(EMAIL_LINK).click();
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
  await page.locator(EMAIL_LINK).click();
  await expect.poll(() => defaults(page)).toEqual([false]);
  expect(errors).toEqual([]);
});

test('a ctrl-click is left alone', async ({ page }) => {
  await recordClicks(page);
  await page.goto('/');
  await page.locator(EMAIL_LINK).click({ modifiers: ['Control'] });
  await expect.poll(() => defaults(page)).toEqual([false]);
  await expect(page.locator('[data-copy-status]')).toHaveText('');
});

test('without JS the email is an ordinary mailto link and the note is empty', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator(EMAIL_LINK)).toHaveAttribute('href', `mailto:${EMAIL}`);
  await expect(page.locator('[data-copy-status]')).toHaveText('');
  await expect(page.locator('footer').getByRole('link', { name: 'Open in your mail app' })).toHaveAttribute(
    'href',
    `mailto:${EMAIL}`,
  );
  await context.close();
});
