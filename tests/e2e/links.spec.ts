import { expect, test } from '@playwright/test';

const PAGES = ['/', '/work/stashout', '/work/flameburst', '/no-such-page'];

// Every anchor in the page (the Work picker's rows included, though the panel is closed), split into
// links that leave the site and links that stay on it.
const anchors = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((a) => ({
      href: a.getAttribute('href')!,
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel') ?? '',
      text: a.textContent ?? '',
      leaves: /^https?:\/\//i.test(a.getAttribute('href')!) && a.origin !== location.origin && !a.href.startsWith('https://theflamebeast.github.io'),
    })),
  );

for (const path of PAGES) {
  test(`${path}: every link that leaves the site opens a new tab, safely, and says so to assistive tech`, async ({
    page,
  }) => {
    await page.goto(path);
    const out = (await anchors(page)).filter((a) => a.leaves);
    if (path !== '/no-such-page') expect(out.length).toBeGreaterThan(0);
    for (const a of out) {
      expect(a.target, a.href).toBe('_blank');
      expect(a.rel, a.href).toContain('noopener');
      expect(a.text, a.href).toContain('opens in a new tab');
    }
  });

  test(`control: ${path}: links within the site and mail links stay in the same tab`, async ({ page }) => {
    await page.goto(path);
    const stay = (await anchors(page)).filter((a) => !a.leaves);
    expect(stay.length).toBeGreaterThan(0);
    for (const a of stay) {
      expect(a.target, a.href).toBeNull();
      expect(a.text, a.href).not.toContain('opens in a new tab');
    }
  });
}

test('the new-tab note is read by assistive tech but not shown', async ({ page }) => {
  await page.goto('/work/stashout');
  const link = page.locator('.case-links a').first();
  await expect(link).toHaveAccessibleName(/stashout\.io.*opens in a new tab/);
  const note = link.getByText('opens in a new tab');
  const box = await note.boundingBox();
  expect(box === null || box.width <= 1).toBe(true);
});
