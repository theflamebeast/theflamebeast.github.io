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
      // The next-project cover repeats the link beside it, so it is decorative and must stay empty.
      const decorative = await img.evaluate((el) => el.closest('[data-next-cover]') !== null);
      await expect(img).toHaveAttribute('alt', decorative ? '' : /\S/);
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

test('the next-project cover is always shown, with no hover or focus needed', async ({ page }) => {
  await page.goto('/work/stashout');
  const cover = page.locator('[data-next-cover]');
  await cover.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(cover).toHaveCSS('clip-path', 'none');
  await expect(cover.locator('img')).toBeVisible();
  const box = (await cover.boundingBox())!;
  expect(box.width).toBeGreaterThan(200);
  expect(box.height).toBeGreaterThan(100);
});

test('Stashout has no Play link and no link to its private repo', async ({ page }) => {
  await page.goto('/work/stashout');
  await expect(page.getByRole('link', { name: /play/i })).toHaveCount(0);
  await expect(page.locator('a[href^="https://github.com/theflamebeast/stashout"]:not([href$="-showcase"])')).toHaveCount(0);
  await expect(page.locator('a[href="https://github.com/theflamebeast/stashout-showcase"]')).toHaveCount(1);
});

test('Stashout page has a muted, looping, inline video with a poster and mp4 and webm sources', async ({ page }) => {
  await page.goto('/work/stashout');
  const video = page.locator('main video');
  await expect(video).toHaveCount(1);
  expect(await video.evaluate((v: HTMLVideoElement) => [v.muted, v.loop, v.playsInline])).toEqual([true, true, true]);
  await expect(video).toHaveAttribute('poster', /\S/);
  await expect(video.locator('source[type="video/webm"]')).toHaveAttribute('src', /\.webm$/);
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute('src', /\.mp4$/);
  for (const type of ['video/webm', 'video/mp4']) {
    const src = await video.locator(`source[type="${type}"]`).getAttribute('src');
    expect((await page.request.get(src!)).status(), src!).toBe(200);
  }
});

test('FlameBurst links to its site by name, with no status note (the site says it)', async ({ page }) => {
  await page.goto('/work/flameburst');
  await expect(page.locator('.case-links a[href="https://www.flameburst.net"] .btn-text')).toHaveText('flameburst.net');
  await expect(page.locator('.case-links')).not.toContainText(/hiatus/i);
});

test('the FlameBurst gallery is one wide image then two rows of two, like Stashout', async ({ page }) => {
  await page.goto('/work/flameburst');
  const shots = page.locator('.gallery .shot');
  await expect(shots).toHaveCount(5);
  const boxes = await shots.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => [Math.round(r.top), Math.round(r.width)]));
  const rows = new Set(boxes.map(([top]) => top));
  expect(rows.size).toBe(3);
  expect(boxes[0][1]).toBeGreaterThan(boxes[1][1] * 1.8);
  // The wide lead is the courtyard, and neither dropped image is on the page.
  await expect(shots.first().locator('img')).toHaveAttribute('alt', /courtyard/i);
  await expect(page.locator('main img[alt*="lake"]')).toHaveCount(0);
  await expect(page.locator('main img[alt*="wiki"]')).toHaveCount(0);
});

test('the FlameBurst lead image loads straight away, not lazily', async ({ page }) => {
  await page.goto('/work/flameburst');
  const img = page.locator('.case-cover img');
  await expect(img).toHaveAttribute('fetchpriority', 'high');
  await expect(img).not.toHaveAttribute('loading', 'lazy');
});

test('the 404 page asks not to be indexed and claims no canonical address', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
});

test('control: a real page keeps its canonical address and is indexable', async ({ page }) => {
  await page.goto('/work/flameburst');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://theflamebeast.github.io/work/flameburst/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('FlameBurst links to its architecture write-up', async ({ page }) => {
  await page.goto('/work/flameburst');
  await expect(page.locator('.case-links a[href="https://www.flameburst.net/architecture"] .btn-text')).toHaveText('Architecture');
});

test('Stashout links to stashout.io by name, first, and to its architecture showcase', async ({ page }) => {
  await page.goto('/work/stashout');
  const links = page.locator('.case-links a');
  await expect(links.locator('.btn-text')).toHaveText(['stashout.io', 'Architecture']);
  await expect(links.first()).toHaveAttribute('href', 'https://stashout.io');
  await expect(links.last()).toHaveAttribute('href', 'https://github.com/theflamebeast/stashout-showcase');
});

test('both architecture buttons use the same label', async ({ page }) => {
  for (const path of ['/work/stashout', '/work/flameburst']) {
    await page.goto(path);
    await expect(page.locator('.case-links .btn-text').getByText('Architecture', { exact: true })).toHaveCount(1);
    await expect(page.locator('.case-links')).not.toContainText('Architecture tour');
  }
});

test('an unknown path responds 404 with a link home', async ({ page }) => {
  const res = await page.goto('/nope');
  expect(res!.status()).toBe(404);
  await expect(page.locator('main a[href="/"]')).toBeVisible();
});
