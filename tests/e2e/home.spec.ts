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

test('Server Insight card shows "Fabric mod", a download count and Modrinth + GitHub links', async ({ page }) => {
  const card = page.locator('[data-compact-card]');
  await expect(card.getByRole('heading')).toHaveText('Server Insight');
  await expect(card).toContainText('Fabric mod');
  await expect(card).toContainText(/\d{1,3}(,\d{3})+ downloads/);
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
