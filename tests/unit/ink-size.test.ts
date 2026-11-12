import { describe, expect, it } from 'vitest';
import { canvasSize, gridSize } from '../../src/ink/size';

const MAX = 2.4e6;

describe('canvasSize', () => {
  it('uses the CSS size times the pixel ratio when that fits under the cap', () => {
    expect(canvasSize(1440, 900, 1, MAX)).toEqual([1440, 900]);
    expect(canvasSize(390, 844, 2, MAX)).toEqual([780, 1688]);
  });

  it('never renders above a pixel ratio of 2', () => {
    expect(canvasSize(390, 844, 3, MAX)).toEqual([780, 1688]);
  });

  it.each([
    [2560, 1440, 2],
    [1920, 1080, 2],
    [3840, 2160, 1],
    [1179, 2556, 3],
  ])('keeps %d x %d at ratio %d under the cap without wasting it or bending the shape', (w, h, dpr) => {
    const [cw, ch] = canvasSize(w, h, dpr, MAX);
    expect(cw * ch).toBeLessThanOrEqual(MAX);
    expect(cw * ch).toBeGreaterThan(MAX * 0.99);
    expect(cw / ch).toBeCloseTo(w / h, 2);
  });

  it('never returns a zero-sized canvas for an element with no layout yet', () => {
    expect(canvasSize(0, 0, 1, MAX)).toEqual([2, 2]);
  });
});

describe('gridSize', () => {
  it('puts the resolution on the short side and scales the long side by the aspect', () => {
    expect(gridSize(128, 1440, 900)).toEqual([205, 128]);
    expect(gridSize(128, 780, 1688)).toEqual([128, 277]);
    expect(gridSize(128, 800, 800)).toEqual([128, 128]);
  });

  it('never makes the grid finer than the canvas it is drawn on', () => {
    expect(gridSize(1024, 1440, 900)).toEqual([1440, 900]);
    expect(gridSize(1024, 780, 1688)).toEqual([780, 1688]);
    expect(gridSize(1024, 2064, 1161)).toEqual([1820, 1024]);
  });
});
