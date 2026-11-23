import { expect, test } from '@playwright/test';

test('/llms.txt is plain text that summarises the site and links the three projects', async ({ request }) => {
  const res = await request.get('/llms.txt');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/text\/plain/);
  const text = await res.text();

  expect(text.startsWith('# Anish Gupta\n')).toBe(true);
  expect(text).toMatch(/^> .+/m);
  for (const name of ['Stashout', 'FlameBurst', 'Server Insight']) expect(text).toContain(name);
  expect(text).toContain('https://github.com/theflamebeast');
  expect(text).toContain('https://www.linkedin.com/in/anishgupta25');
});

test('every case-study link in /llms.txt resolves, and nothing links to a private project', async ({ request }) => {
  const text = await (await request.get('/llms.txt')).text();
  const own = [...text.matchAll(/\]\((https:\/\/theflamebeast\.github\.io\/[^)\s]*)\)/g)].map((m) => m[1]);
  expect(own).toContain('https://theflamebeast.github.io/work/stashout/');
  expect(own).toContain('https://theflamebeast.github.io/work/flameburst/');
  for (const url of own) {
    const path = new URL(url).pathname;
    expect((await request.get(path)).status(), path).toBe(200);
  }
  // Control: the same check fails for an address that does not exist.
  expect((await request.get('/work/not-a-project/')).status()).toBe(404);
});
