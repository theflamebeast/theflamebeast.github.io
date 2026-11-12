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
    [1000, '1k+'],
    [1831, '1.8k+'],
    [1999, '1.9k+'],
    [2000, '2k+'],
    [2050, '2k+'],
    [12345, '12.3k+'],
    [999_999, '999.9k+'],
    [1_250_000, '1.2M+'],
  ])('formatCount(%i) is %s, never above the real count', (n, out) => {
    expect(formatCount(n)).toBe(out);
  });
});
