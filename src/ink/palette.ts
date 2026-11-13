export type Rgb = [number, number, number];

// Deep red (just below 0, which hsvToRgb wraps) to amber: neighbouring hues, so the fluid mixes
// them cleanly instead of into brown.
const HUE_START = -0.01;
const HUE_SPAN = 0.12;
const HUE_PERIOD_MS = 3500;
const SATURATION = 0.85;
const INTENSITY = 0.15;

/** How long the hue takes to travel from deep red to amber and back. */
export const INK_HUE_CYCLE_MS = 2 * Math.PI * HUE_PERIOD_MS;

/** The point in the cycle where the hue is deep red and about to climb through orange to amber. */
export const INK_HUE_START_MS = -INK_HUE_CYCLE_MS / 4;

export function hsvToRgb(h: number, s: number, v: number): Rgb {
  const sector = Math.floor(h * 6);
  const f = h * 6 - sector;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (((sector % 6) + 6) % 6) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    default:
      return [v, p, q];
  }
}

export function hexToRgb(hex: string): Rgb | undefined {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!match) return undefined;
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
}

export function inkHue(timeMs: number, rand: number): number {
  return HUE_START + HUE_SPAN * (0.5 + 0.5 * Math.sin(timeMs / HUE_PERIOD_MS + rand * 0.8));
}

export function inkColor(timeMs: number, rand: number, mult = 1): Rgb {
  const [r, g, b] = hsvToRgb(inkHue(timeMs, rand), SATURATION, 1);
  const m = INTENSITY * mult;
  return [r * m, g * m, b * m];
}

const LIVE_SATURATION = 0.6;

/** The hue of the page's live accent, on the same clock as the hero's ink (`performance.now()`). */
export function liveInkHue(pageMs: number): number {
  return inkHue(pageMs + INK_HUE_START_MS, 0);
}

/** Lighter than the ink itself, so dark text on it always clears WCAG AA. */
export function liveInkRgb(pageMs: number): Rgb {
  return hsvToRgb(liveInkHue(pageMs), LIVE_SATURATION, 1);
}

export function rgbToCss([r, g, b]: Rgb): string {
  const channel = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255);
  return `rgb(${channel(r)} ${channel(g)} ${channel(b)})`;
}
