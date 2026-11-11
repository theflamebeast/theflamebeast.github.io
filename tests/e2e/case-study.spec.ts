import { expect, test } from '@playwright/test';

const PAGES = [
  { path: '/work/stashout', title: 'Stashout', next: '/work/flameburst' },
  { path: '/work/flameburst', title: 'FlameBurst', next: '/work/stashout' },
];

for (const p of PAGES) {
  test(`${p.path} responds 200 with h1 = ${p.title}`, async ({ page }) => {
    const res = await page.goto(p.path);
    expect(res!.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.title);
  });

  test(`${p.path}: every image has loaded and has alt text`, async ({ page }) => {
    await page.goto(p.path);
    const imgs = page.locator('main img');
    expect(await imgs.count()).toBeGreaterThan(3);
    for (const img of await imgs.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('alt', /\S/);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    }
  });

  test(`${p.path} ends with a next-project link to the other case study`, async ({ page }) => {
    await page.goto(p.path);
    const next = page.locator('[data-next-project] a');
    await expect(next).toHaveAttribute('href', p.next);
  });

  test(`${p.path} has one diagram with a title`, async ({ page }) => {
    await page.goto(p.path);
    const diagrams = page.locator('main svg[role="img"]');
    await expect(diagrams).toHaveCount(1);
    await expect(diagrams.locator('title')).not.toHaveText('');
  });
}

test('Stashout has no Play link and no link to its private repo', async ({ page }) => {
  await page.goto('/work/stashout');
  await expect(page.getByRole('link', { name: /play/i })).toHaveCount(0);
  await expect(page.locator('a[href^="https://github.com/theflamebeast/stashout"]:not([href$="-showcase"])')).toHaveCount(0);
  await expect(page.locator('a[href="https://github.com/theflamebeast/stashout-showcase"]')).toHaveCount(1);
});

test('FlameBurst outbound link says it is on hiatus', async ({ page }) => {
  await page.goto('/work/flameburst');
  await expect(page.locator('main a[href="https://www.flameburst.net"]')).toContainText('on hiatus');
});

test('an unknown path responds 404 with a link home', async ({ page }) => {
  const res = await page.goto('/nope');
  expect(res!.status()).toBe(404);
  await expect(page.locator('main a[href="/"]')).toBeVisible();
});
