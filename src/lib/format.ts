export function formatSpan(start: string, end: string | null): string {
  return `${start} to ${end ?? 'present'}`;
}

/** Rounded down, never above the real count: 1999 reads "1.9k+", 2000 reads "2k+". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const [unit, suffix] = n < 1_000_000 ? [1000, 'k+'] : [1_000_000, 'M+'];
  return `${Math.floor(n / (unit / 10)) / 10}${suffix}`;
}
