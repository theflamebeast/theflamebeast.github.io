import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { expect, test } from '@playwright/test';

const FORBIDDEN: [RegExp, string][] = [
  [/·/, 'interpunct'],
  [/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b|tel:/, 'phone-shaped string'],
  [/identity__email/, 'Badgr email param'],
  [/FlameBeast/, 'old brand'],
  [/guns\.lol|twitch\.tv|youtube\.com/, 'gaming links'],
  [/theflamebeast(?!\.github\.io)(?<!github\.com\/theflamebeast)/, 'handle outside allowed URLs'],
  [/fonts\.(googleapis|gstatic)\.com/, 'third-party font host'],
  [
    /<a[^>]+href="https?:\/\/(?!localhost|theflamebeast\.github\.io|github\.com\/theflamebeast|www\.linkedin\.com\/in\/anishgupta25|modrinth\.com\/mod\/server-insight|api\.badgr\.io|www\.flameburst\.net)/,
    'unexpected external link',
  ],
];

const TEXT = new Set(['.html', '.css', '.js', '.xml', '.txt', '.json', '.svg']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : TEXT.has(extname(p)) ? [p] : [];
  });
}

test('every pattern catches its bad sample and spares the allowed URLs', () => {
  const bad: Record<string, string> = {
    interpunct: 'Work · About',
    'phone-shaped string': 'call (555) 010-0199',
    'Badgr email param': '?identity__email=a%40b.c',
    'old brand': 'FlameBeast',
    'gaming links': 'https://twitch.tv/x',
    'handle outside allowed URLs': 'theflamebeast',
    'third-party font host': 'https://fonts.googleapis.com/css2',
    'unexpected external link': '<a class="x" href="https://example.com/">',
  };
  for (const [re, why] of FORBIDDEN) expect(bad[why], why).toMatch(re);

  const allowed =
    'https://github.com/theflamebeast/server-insight https://theflamebeast.github.io/work ' +
    '<a href="https://www.linkedin.com/in/anishgupta25"> <a href="https://modrinth.com/mod/server-insight">';
  for (const [re, why] of FORBIDDEN) expect(allowed.match(re), why).toBeNull();
});

test('no built file contains a forbidden string', () => {
  const files = walk('dist');
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const [re, why] of FORBIDDEN) expect(text.match(re), `${why} in ${file}`).toBeNull();
  }
});
