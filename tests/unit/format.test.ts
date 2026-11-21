import { describe, expect, it } from 'vitest';
import { formatCount, formatSpan } from '../../src/lib/format';

describe('formatSpan', () => {
  it('shows an open project as running to the present', () => {
    expect(formatSpan('Jul 2026', null)).toBe('Jul 2026 to present');
  });

  it('shows a finished project with both ends', () => {
    expect(formatSpan('Sep 2020', 'Sep 2025')).toBe('Sep 2020 to Sep 2025');
  });
});

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1K'],
    [1831, '1.8K'],
    [1966, '2K'],
    [2050, '2.1K'],
    [12345, '12.3K'],
    [999_999, '1M'],
    [1_250_000, '1.3M'],
  ])('formatCount(%i) is %s, rounded to the nearest like Modrinth', (n, out) => {
    expect(formatCount(n)).toBe(out);
  });
});
