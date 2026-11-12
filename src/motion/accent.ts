import { liveInkRgb, rgbToCss } from '../ink/palette';
import { prefersReducedMotion } from './prefs';

const STEP_MS = 200;

export function initLiveAccent(): () => void {
  if (prefersReducedMotion()) return () => {};
  const root = document.documentElement;
  const paint = () => root.style.setProperty('--ink-live', rgbToCss(liveInkRgb(performance.now())));
  paint();
  const timer = window.setInterval(paint, STEP_MS);
  return () => window.clearInterval(timer);
}
