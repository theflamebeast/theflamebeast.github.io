import { expect, test } from '@playwright/test';

const SITE = 'https://theflamebeast.github.io';

test('/sitemap.xml lists the home page and each case study, and every address resolves', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/xml/);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual([`${SITE}/`, `${SITE}/work/stashout/`, `${SITE}/work/flameburst/`]);
  for (const loc of locs) expect((await request.get(new URL(loc).pathname)).status(), loc).toBe(200);
  // The 404 page is not an address and must not be listed.
  expect(xml).not.toContain('404');
});

test('/robots.txt allows everything and points crawlers at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/text\/plain/);
  const text = await res.text();
  expect(text).toMatch(/^User-agent: \*$/m);
  expect(text).toMatch(/^Allow: \/$/m);
  expect(text).not.toMatch(/^Disallow: \S/m);
  expect(text).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

test('the home page carries Person structured data that parses and matches the site', async ({ page }) => {
  await page.goto('/');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks).toHaveLength(1);
  const data = JSON.parse(blocks[0]);
  expect(data['@context']).toBe('https://schema.org');
  expect(data['@type']).toBe('Person');
  expect(data.name).toBe('Anish Gupta');
  expect(data.url).toBe(`${SITE}/`);
  expect(data.sameAs).toEqual(['https://github.com/theflamebeast', 'https://www.linkedin.com/in/anishgupta25']);
  expect(data.jobTitle).toMatch(/developer/i);
});

test('control: a case study has no Person data of its own', async ({ page }) => {
  await page.goto('/work/stashout');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});
