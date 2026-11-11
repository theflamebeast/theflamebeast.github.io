export function formatSpan(start: string, end: string | null): string {
  return `${start} to ${end ?? 'present'}`;
}
