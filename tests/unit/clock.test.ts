import { describe, expect, it } from 'vitest';
import { formatLocalTime } from '../../src/lib/clock';

describe('formatLocalTime', () => {
  it('gives Eastern time with its standard or daylight abbreviation', () => {
    expect(formatLocalTime(new Date('2026-11-10T21:12:00Z'))).toBe('4:12 PM EST');
    expect(formatLocalTime(new Date('2026-07-01T16:05:00Z'))).toBe('12:05 PM EDT');
  });

  it('separates the time from AM or PM with a plain space, never U+202F', () => {
    expect(formatLocalTime(new Date('2026-11-10T14:03:00Z'))).not.toMatch(/ /);
    expect(formatLocalTime(new Date('2026-11-10T14:03:00Z'))).toBe('9:03 AM EST');
  });

  it('takes another time zone', () => {
    expect(formatLocalTime(new Date('2026-11-10T21:12:00Z'), 'UTC')).toBe('9:12 PM UTC');
  });
});
