import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../src');
const TOKENS = readFileSync(join(SRC, 'styles/tokens.css'), 'utf8');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(astro|css)$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

// Colour literals in styles and markup. `#000` inside a mask is an alpha stencil, not a colour.
const COLOUR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi;
const strip = (src: string) => src.replace(/mask-image:[^;]*;/g, '');

describe('colour tokens', () => {
  it('no colour literals outside tokens.css', () => {
    const found = files(SRC)
      .filter((f) => !f.endsWith('tokens.css'))
      .flatMap((f) => (strip(readFileSync(f, 'utf8')).match(COLOUR) ?? []).map((m) => `${f.slice(SRC.length + 1)}: ${m}`))
      .filter((hit) => !hit.includes('Base.astro: #'));
    expect(found).toEqual([]);
  });

  it('control: the scan sees a literal when there is one', () => {
    expect('color: #c9d0db; background: rgb(6 7 12 / 0.5);'.match(COLOUR)).toHaveLength(2);
    expect(strip('mask-image: linear-gradient(#000, transparent);').match(COLOUR)).toBeNull();
  });

  it('the theme-color meta matches --bg (a meta tag cannot read a CSS variable)', () => {
    const bg = TOKENS.match(/--bg:\s*(#[0-9a-f]{6})/i)![1];
    const meta = readFileSync(join(SRC, 'layouts/Base.astro'), 'utf8').match(/name="theme-color" content="([^"]+)"/)![1];
    expect(meta.toLowerCase()).toBe(bg.toLowerCase());
    expect(readFileSync(join(SRC, 'layouts/Base.astro'), 'utf8').match(COLOUR)).toEqual([meta]);
  });
});
