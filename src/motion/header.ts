import { prefersReducedMotion } from './prefs';

const SOLID_AFTER_PX = 40;
const HIDE_AFTER_VIEWPORTS = 0.3;

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
    if (y < lastY) show();
    else if (canHide && y > lastY && y > HIDE_AFTER_VIEWPORTS * window.innerHeight && !busy()) {
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
