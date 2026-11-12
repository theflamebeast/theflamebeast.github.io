import { describe, expect, it } from 'vitest';
import {
  INK_HUE_CYCLE_MS,
  INK_HUE_START_MS,
  hexToRgb,
  hsvToRgb,
  inkColor,
  inkHue,
  liveInkHue,
  liveInkRgb,
  rgbToCss,
  type Rgb,
} from '../../src/ink/palette';

const SAMPLES = 10_000;
const sample = (i: number) => ({ timeMs: i * 137.31, rand: (i * 0.6180339887) % 1 });

describe('hsvToRgb', () => {
  it('maps the primaries', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual([1, 0, 0]);
    expect(hsvToRgb(1 / 3, 1, 1)).toEqual([0, 1, 0]);
    expect(hsvToRgb(2 / 3, 1, 1)).toEqual([0, 0, 1]);
  });

  it('gives grey when saturation is zero and wraps a hue of 1 back to red', () => {
    expect(hsvToRgb(0.4, 0, 0.5)).toEqual([0.5, 0.5, 0.5]);
    expect(hsvToRgb(1, 1, 1)).toEqual([1, 0, 0]);
  });
});

describe('hexToRgb', () => {
  it('reads a six-digit colour token, with the padding a computed style adds', () => {
    expect(hexToRgb('#06070c')).toEqual([6 / 255, 7 / 255, 12 / 255]);
    expect(hexToRgb('  #FFFFFF ')).toEqual([1, 1, 1]);
  });

  it('returns undefined for anything else', () => {
    expect(hexToRgb('')).toBeUndefined();
    expect(hexToRgb('#fff')).toBeUndefined();
    expect(hexToRgb('rgb(6, 7, 12)')).toBeUndefined();
  });
});

describe('inkHue', () => {
  it('stays between cyan (0.52) and pink (0.92) for any time and rand', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const { timeMs, rand } = sample(i);
      const hue = inkHue(timeMs, rand);
      min = Math.min(min, hue);
      max = Math.max(max, hue);
    }
    expect(min).toBeGreaterThanOrEqual(0.52);
    expect(max).toBeLessThanOrEqual(0.92);
    expect(max - min).toBeGreaterThan(0.35);
  });
});

describe('INK_HUE_CYCLE_MS', () => {
  it('is one full trip through the hues: the hue repeats after it and covers the whole range within it', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 1000; i++) {
      const timeMs = (i / 1000) * INK_HUE_CYCLE_MS;
      const hue = inkHue(timeMs, 0);
      min = Math.min(min, hue);
      max = Math.max(max, hue);
      expect(inkHue(timeMs + INK_HUE_CYCLE_MS, 0)).toBeCloseTo(hue, 9);
    }
    expect(min).toBeCloseTo(0.52, 3);
    expect(max).toBeCloseTo(0.92, 3);
  });
});

describe('INK_HUE_START_MS', () => {
  it('is the cyan end of the cycle, and the hue climbs from there through blue to pink', () => {
    expect(inkHue(INK_HUE_START_MS, 0)).toBeCloseTo(0.52, 9);
    expect(inkHue(INK_HUE_START_MS + INK_HUE_CYCLE_MS / 4, 0)).toBeCloseTo(0.72, 9);
    expect(inkHue(INK_HUE_START_MS + INK_HUE_CYCLE_MS / 2, 0)).toBeCloseTo(0.92, 9);
  });
});

describe('inkColor', () => {
  it.each([1, 5, 8])('keeps every channel within 0..0.15 x %d', (mult) => {
    let peak = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const { timeMs, rand } = sample(i);
      for (const channel of inkColor(timeMs, rand, mult)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(0.15 * mult + 1e-12);
        peak = Math.max(peak, channel);
      }
    }
    expect(peak).toBeCloseTo(0.15 * mult, 6);
  });

  it('defaults the multiplier to 1', () => {
    expect(inkColor(1234, 0.5)).toEqual(inkColor(1234, 0.5, 1));
  });
});

describe('the live colour', () => {
  const BG: Rgb = [6 / 255, 7 / 255, 12 / 255];
  const luminance = ([r, g, b]: Rgb) => {
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (a: Rgb, b: Rgb) =>
    (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

  it('liveInkHue starts at cyan on the page clock and reaches pink half a cycle later', () => {
    expect(liveInkHue(0)).toBeCloseTo(0.52, 9);
    expect(liveInkHue(INK_HUE_CYCLE_MS / 2)).toBeCloseTo(0.92, 9);
  });

  it('dark text on the live colour meets WCAG AA at every point in the cycle', () => {
    for (let i = 0; i < 1000; i++) {
      expect(contrast(liveInkRgb((i / 1000) * INK_HUE_CYCLE_MS), BG)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('rgbToCss writes whole channels, space separated', () => {
    expect(rgbToCss([1, 0.4, 0])).toBe('rgb(255 102 0)');
  });
});
