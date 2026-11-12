export type Rgb = [number, number, number];

const HUE_START = 0.52;
const HUE_SPAN = 0.4;
const HUE_PERIOD_MS = 3500;
const SATURATION = 0.85;
const INTENSITY = 0.15;

/** How long the hue takes to travel from cyan to pink and back. */
export const INK_HUE_CYCLE_MS = 2 * Math.PI * HUE_PERIOD_MS;

/** The point in the cycle where the hue is cyan and about to climb through blue and violet to pink. */
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
