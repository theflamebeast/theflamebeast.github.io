export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function wideQuery(minPx: number): string {
  return `(min-width: ${minPx}px)`;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches;
}

export function isWide(minPx: number): boolean {
  return window.matchMedia(wideQuery(minPx)).matches;
}
