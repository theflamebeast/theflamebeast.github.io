import { describe, expect, it } from 'vitest';
import { isExternal } from '../../src/lib/links';

describe('isExternal', () => {
  it('is true for an http or https address on another site', () => {
    expect(isExternal('https://github.com/theflamebeast')).toBe(true);
    expect(isExternal('https://www.flameburst.net/architecture')).toBe(true);
    expect(isExternal('HTTP://EXAMPLE.COM/')).toBe(true);
  });

  it('is false for this site, in-site paths, fragments and mail links', () => {
    expect(isExternal('https://theflamebeast.github.io/work/stashout')).toBe(false);
    expect(isExternal('/work/stashout')).toBe(false);
    expect(isExternal('/#work')).toBe(false);
    expect(isExternal('#contact')).toBe(false);
    expect(isExternal('mailto:someone@example.com')).toBe(false);
  });
});
