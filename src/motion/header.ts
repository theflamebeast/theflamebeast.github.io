import { prefersReducedMotion } from './prefs';

const SOLID_AFTER_PX = 40;
const HIDE_AFTER_VIEWPORTS = 0.3;
const DEAD_ZONE_PX = 6;

export function initHeader(): () => void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return () => {};

  const root = document.documentElement;
  const listeners = new AbortController();
  const canHide = !prefersReducedMotion();
  let lastY = window.scrollY;

  const show = () => root.removeAttribute('data-header-hidden');
  const busy = () => header.hasAttribute('data-picker-open') || header.contains(document.activeElement);

  const update = () => {
    const y = window.scrollY;
    header.toggleAttribute('data-solid', y > SOLID_AFTER_PX);
    const moved = y - lastY;
    // Movement inside the dead zone is jitter (a trackpad, or smooth scroll settling a sub-pixel
    // back), not a change of direction; lastY stays put so slow scrolling still adds up past it.
    if (y > 0 && Math.abs(moved) < DEAD_ZONE_PX) return;
    if (moved < 0 || y <= 0) show();
    else if (canHide && y > HIDE_AFTER_VIEWPORTS * window.innerHeight && !busy()) {
      root.setAttribute('data-header-hidden', '');
    }
    lastY = y;
  };

  update();
  window.addEventListener('scroll', update, { passive: true, signal: listeners.signal });
  header.addEventListener('focusin', show, { signal: listeners.signal });
  const pickerWatch = new MutationObserver(() => {
    if (header.hasAttribute('data-picker-open')) show();
  });
  pickerWatch.observe(header, { attributes: true, attributeFilter: ['data-picker-open'] });

  return () => {
    listeners.abort();
    pickerWatch.disconnect();
    show();
    header.removeAttribute('data-solid');
  };
}
