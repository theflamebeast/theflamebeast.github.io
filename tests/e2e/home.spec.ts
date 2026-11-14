import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('hero shows name, role, school and tagline', async ({ page }) => {
  const hero = page.locator('[data-hero]');
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Anish Gupta');
  await expect(hero).toContainText('Software developer');
  await expect(hero).toContainText('CS at the University of Georgia');
  await expect(hero).toContainText('I build multiplayer games, game servers and the tools around them.');
});

test('selected work lists Stashout then FlameBurst linking their case studies', async ({ page }) => {
  const cards = page.locator('#work [data-project-card]');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).getByRole('heading')).toHaveText('Stashout');
  await expect(cards.nth(1).getByRole('heading')).toHaveText('FlameBurst');
  await expect(cards.nth(0).locator('a[href="/work/stashout"]').first()).toBeVisible();
  await expect(cards.nth(1).locator('a[href="/work/flameburst"]').first()).toBeVisible();
});

test('each featured project is a named link a keyboard reaches, with a whole focus ring', async ({ page }) => {
  const work = page.locator('#work');
  for (const [name, href] of [
    ['Stashout', '/work/stashout'],
    ['FlameBurst', '/work/flameburst'],
  ]) {
    const link = work.getByRole('link', { name, exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', href);
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await expect(link).toBeFocused();
    // The ring must not be clipped down to a sliver by a reveal mask around the link.
    const clipped = await link.evaluate((el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflow;
        if (o.includes('clip') || o.includes('hidden')) return p.className;
      }
      return '';
    });
    expect(clipped).toBe('');
  }
});

test('nothing a keyboard can reach sits inside an aria-hidden ancestor', async ({ page }) => {
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(800);
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
      .filter((el) => el.tabIndex >= 0 && !el.hasAttribute('disabled'))
      .filter((el) => el.closest('[aria-hidden="true"]'))
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(hidden).toEqual([]);
});

test('Server Insight card shows "Fabric mod", a download count and Modrinth + GitHub links', async ({ page }) => {
  const card = page.locator('[data-compact-card]');
  await expect(card.getByRole('heading')).toHaveText('Server Insight');
  await expect(card).toContainText('Fabric mod');
  await expect(card).toContainText(/\b\d+(\.\d)?k\+ downloads/);
  await expect(card.locator('a[href="https://modrinth.com/mod/server-insight"]')).toHaveCount(1);
  await expect(card.locator('a[href="https://github.com/theflamebeast/server-insight"]')).toHaveCount(1);
});

test('Server Insight has no case-study page', async ({ request }) => {
  expect((await request.get('/work/server-insight')).status()).toBe(404);
});

test('About lists exactly the three certs and no Georgia State', async ({ page }) => {
  const about = page.locator('#about');
  await expect(about.locator('[data-certs] li')).toHaveCount(3);
  await expect(about).toContainText('GFACT');
  await expect(about).toContainText('IT Specialist: Software Development');
  await expect(about).toContainText('Unity Certified Associate');
  await expect(about).not.toContainText('Georgia State');
});

test('footer links: GitHub, LinkedIn, mailto; nothing else external', async ({ page }) => {
  const hrefs = await page.locator('footer a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  const external = [...new Set(hrefs.filter((h) => !h.startsWith('/') && !h.startsWith('#')))].sort();
  expect(external).toEqual([
    'https://github.com/theflamebeast',
    'https://www.linkedin.com/in/anishgupta25',
    'mailto:anishguptaa18@gmail.com',
  ]);
});

test('no request leaves localhost', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', (r) => hosts.add(new URL(r.url()).hostname));
  await page.reload();
  await page.mouse.wheel(0, 20000);
  await page.waitForLoadState('networkidle');
  expect([...hosts]).toEqual(['localhost']);
});
