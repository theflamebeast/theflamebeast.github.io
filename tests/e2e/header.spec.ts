import { expect, test, type Page } from '@playwright/test';

const HEADER = '[data-header]';
const TOGGLE = '[data-work-toggle]';
const PANEL = '[data-work-panel]';

async function scrollBy(page: Page, dy: number) {
  await page.mouse.move(720, 600);
  await page.mouse.wheel(0, dy);
}

function headerState(page: Page) {
  return page.evaluate(() => document.documentElement.hasAttribute('data-header-hidden'));
}

test('the header hides after scrolling down past 30% of the viewport and returns on scrolling up', async ({ page }) => {
  await page.goto('/');
  const header = page.locator(HEADER);
  await expect(header).toHaveCSS('position', 'fixed');
  await scrollBy(page, 700);
  await expect.poll(() => headerState(page)).toBe(true);
  // Measure once the slide has finished: CI once read 0.0054 px mid-transition. A slide that never
  // finishes still fails, as a timeout.
  await header.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  const box = (await header.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(0);
  await scrollBy(page, -120);
  await expect.poll(() => headerState(page)).toBe(false);
  await expect.poll(async () => (await header.boundingBox())!.y).toBe(0);
  await expect(header).toHaveAttribute('data-solid', '');
});

test('a scroll jitter of a couple of pixels upward does not bring the header back', async ({ page }) => {
  await page.goto('/');
  await scrollBy(page, 700);
  await expect.poll(() => headerState(page)).toBe(true);
  await expect.poll(() => page.evaluate(() => (document.documentElement.dataset.smooth ? window.scrollY : 0))).toBeGreaterThan(600);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, window.scrollY - 2));
  await page.waitForTimeout(300);
  expect(await headerState(page)).toBe(true);
});

test('hovering Work opens the picker with three rows', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).hover();
  await expect(page.locator(PANEL)).toBeVisible();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-work-item] .work-title')).toHaveText(['Stashout', 'FlameBurst', 'Server Insight']);
  const hrefs = await page.locator('[data-work-item]').evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs).toEqual(['/work/stashout', '/work/flameburst', 'https://modrinth.com/mod/server-insight']);
});

test('pointing at a row shows its preview in a fixed place', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).hover();
  const row = page.locator('[data-work-item="flameburst"]');
  const preview = page.locator('[data-work-preview="flameburst"]');
  const rowBox = (await row.boundingBox())!;

  await page.mouse.move(rowBox.x + 20, rowBox.y + rowBox.height / 2);
  await expect(preview).toHaveAttribute('data-active', '');
  await expect(preview).toHaveCSS('opacity', '1');
  const first = await preview.boundingBox();

  await page.mouse.move(rowBox.x + rowBox.width - 20, rowBox.y + rowBox.height / 2, { steps: 5 });
  await expect(preview).toHaveCSS('opacity', '1');
  expect(await preview.boundingBox()).toEqual(first);
  await expect(page.locator('[data-work-preview][data-active]')).toHaveCount(1);
  await expect(page.locator('[data-work-preview="stashout"]')).toHaveCSS('opacity', '0');
});

test('Server Insight previews its download figure', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).hover();
  await page.locator('[data-work-item="server-insight"]').hover();
  const preview = page.locator('[data-work-preview="server-insight"]');
  await expect(preview).toHaveAttribute('data-active', '');
  await expect(preview).toContainText(/\d+(\.\d)?k\+/);
  await expect(preview).toContainText('downloads on Modrinth');
});

test('keyboard: Enter opens, Tab reaches each row, Escape closes and returns focus to Work', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator(TOGGLE);
  await expect(toggle).toHaveAttribute('role', 'button');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(PANEL)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  for (const id of ['stashout', 'flameburst', 'server-insight']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`[data-work-item="${id}"]`)).toBeFocused();
    await expect(page.locator(`[data-work-preview="${id}"]`)).toHaveAttribute('data-active', '');
  }

  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(PANEL)).toBeHidden();
  await expect(toggle).toBeFocused();

  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('focus leaving the header closes the picker', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator(TOGGLE);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-work-item="server-insight"]').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-header]'))).toBe(false);
  await expect(page.locator(PANEL)).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('the header does not hide while the picker is open or focus is inside it', async ({ page }) => {
  await page.goto('/');
  const header = page.locator(HEADER);

  // Open by hover and keep the pointer over the panel while the wheel scrolls the page.
  await page.locator(TOGGLE).hover();
  const panelBox = (await page.locator(PANEL).boundingBox())!;
  await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + panelBox.height / 2);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await page.waitForTimeout(600);
  expect(await headerState(page)).toBe(false);
  expect((await header.boundingBox())!.y).toBe(0);

  // Focus inside the header with the picker closed.
  await page.goto('/');
  await page.locator('.nav-name').focus();
  await scrollBy(page, 700);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await page.waitForTimeout(600);
  expect(await headerState(page)).toBe(false);
  expect((await header.boundingBox())!.y).toBe(0);
});

test('after a mouse opens and closes Work, the header still hides on scrolling down', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).click();
  await expect(page.locator(PANEL)).toBeVisible();
  await page.locator(TOGGLE).click();
  await expect(page.locator(PANEL)).toBeHidden();
  // The click left focus on the toggle, but no keyboard user is in the header.
  await scrollBy(page, 900);
  await expect.poll(() => headerState(page)).toBe(true);
});

test('a hidden header comes back when focus enters it', async ({ page }) => {
  await page.goto('/');
  await scrollBy(page, 700);
  await expect.poll(() => headerState(page)).toBe(true);
  await page.locator('.nav-name').focus();
  await expect.poll(() => headerState(page)).toBe(false);
});

test('clicking a row opens its case study with the picker closed, and the picker works there too', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).hover();
  await page.locator('[data-work-item="stashout"]').click();
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await expect(page.locator(PANEL)).toBeHidden();
  await expect(page.locator(TOGGLE)).toHaveAttribute('aria-expanded', 'false');

  await page.mouse.move(720, 600);
  await page.locator(TOGGLE).hover();
  await expect(page.locator(PANEL)).toBeVisible();
  await page.locator('[data-work-item="flameburst"]').click();
  await expect(page).toHaveURL(/\/work\/flameburst$/);
});

test('a hover-opened picker closes shortly after the pointer leaves the header, a click pins it', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator(PANEL);
  await page.locator(TOGGLE).hover();
  await expect(panel).toBeVisible();
  await page.mouse.move(720, 850);
  await expect(panel).toBeHidden();

  await page.locator(TOGGLE).hover();
  await page.locator(TOGGLE).click();
  await page.mouse.move(720, 850);
  await page.waitForTimeout(400);
  await expect(panel).toBeVisible();
  await page.locator(TOGGLE).click();
  await expect(panel).toBeHidden();
});

test('a click outside the header closes the picker', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).click();
  await expect(page.locator(PANEL)).toBeVisible();
  await page.mouse.click(720, 860);
  await expect(page.locator(PANEL)).toBeHidden();
});

test('without JS Work is a link to /#work and the panel stays hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/work/stashout');
  const toggle = page.locator(TOGGLE);
  await expect(toggle).toHaveAttribute('href', '/#work');
  await expect(toggle).not.toHaveAttribute('role', /.*/);
  await toggle.hover();
  await expect(page.locator(PANEL)).toBeHidden();
  await toggle.click();
  await expect(page).toHaveURL(/\/#work$/);
  await context.close();
});

test('no floating menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-menu-button], [data-menu-panel]')).toHaveCount(0);
});

test('resizing 1440 -> 390 with the picker open keeps the panel inside the viewport', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).click();
  await expect(page.locator(PANEL)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.work-previews')).toBeHidden();
  const box = (await page.locator(PANEL).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  for (const row of await page.locator('[data-work-item]').all()) {
    const r = (await row.boundingBox())!;
    expect(r.x + r.width).toBeLessThanOrEqual(390);
  }
});

test('opening the picker with a click on the home page leaves the page where it is', async ({ page }) => {
  await page.goto('/');
  await page.locator(TOGGLE).click();
  await expect(page.locator(PANEL)).toBeVisible();
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('an ordinary same-page link still glides to its section', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-links a[href="/#about"]').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  await expect
    .poll(async () => (await page.locator('#about').boundingBox())!.y)
    .toBeLessThan(200);
});
