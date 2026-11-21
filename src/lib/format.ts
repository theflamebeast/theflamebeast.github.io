export function formatSpan(start: string, end: string | null): string {
  return `${start} to ${end ?? 'present'}`;
}

/** Rounded to the nearest tenth, as Modrinth shows it: 1966 reads "2K", 2340 reads "2.3K". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const tenthsOfK = Math.round(n / 100);
  if (tenthsOfK < 10_000) return `${tenthsOfK / 10}K`;
  return `${Math.round(n / 100_000) / 10}M`;
}
