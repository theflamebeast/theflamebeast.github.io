import { describe, expect, it } from 'vitest';
import { formatSpan } from '../../src/lib/format';

describe('formatSpan', () => {
  it('shows an open project as running to the present', () => {
    expect(formatSpan('Jul 2026', null)).toBe('Jul 2026 to present');
  });

  it('shows a finished project with both ends', () => {
    expect(formatSpan('Sep 2020', 'Sep 2025')).toBe('Sep 2020 to Sep 2025');
  });
});
