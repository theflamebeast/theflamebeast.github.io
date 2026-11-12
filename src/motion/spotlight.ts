import { canHover } from './prefs';

// Where hovering exists a card's screenshot is dimmed and the cursor lights the area around it.
// Without hover (or without this script) the screenshot is simply at full brightness.
export function initSpotlight(): () => void {
  if (!canHover()) return () => {};

  const listeners = new AbortController();
  const targets = [...document.querySelectorAll<HTMLElement>('[data-spotlight-target]')];

  for (const target of targets) {
    target.dataset.spotlight = 'on';
    const card = target.closest<HTMLElement>('[data-project-card]') ?? target;
    card.addEventListener(
      'pointermove',
      (event) => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        target.style.setProperty('--my', `${event.clientY - rect.top}px`);
      },
      { passive: true, signal: listeners.signal },
    );
    card.addEventListener(
      'pointerleave',
      () => {
        target.style.removeProperty('--mx');
        target.style.removeProperty('--my');
      },
      { signal: listeners.signal },
    );
  }

  return () => {
    listeners.abort();
    for (const target of targets) {
      delete target.dataset.spotlight;
      target.style.removeProperty('--mx');
      target.style.removeProperty('--my');
    }
  };
}
