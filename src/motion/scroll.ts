import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion } from './prefs';

gsap.registerPlugin(ScrollTrigger);

// The one test hook in production code: Task 9's back/forward test compares this count with a
// fresh load to catch triggers that a page swap leaked.
function countTriggers() {
  document.documentElement.dataset.triggers = String(ScrollTrigger.getAll().length);
}

export function initScrollProgress(): () => void {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return () => {};
  const trigger = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      bar.style.transform = `scaleX(${self.progress})`;
    },
  });
  return () => {
    trigger.kill();
    bar.style.transform = '';
  };
}

export function initSmoothScroll(): () => void {
  ScrollTrigger.addEventListener('refresh', countTriggers);
  if (prefersReducedMotion()) {
    return () => ScrollTrigger.removeEventListener('refresh', countTriggers);
  }

  const instance = new Lenis({ autoRaf: false });
  const raf = (time: number) => instance.raf(time * 1000);
  instance.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  document.documentElement.dataset.smooth = 'on';
  const stopAnchors = initAnchorGlide(instance);

  return () => {
    stopAnchors();
    ScrollTrigger.removeEventListener('refresh', countTriggers);
    gsap.ticker.remove(raf);
    instance.destroy();
    delete document.documentElement.dataset.smooth;
  };
}

// Same-page "#" links glide with Lenis. Not Lenis's own `anchors` option: it ignores clicks other
// code has cancelled, so the Work toggle scrolled to #work as it opened the picker. And not the
// router: its same-page hash handling restores the old scroll position, fighting the glide, so
// the click is claimed here first. Listening on <body>, the bubble phase runs after a handler on
// the link itself and before the router's on document.
function initAnchorGlide(lenis: Lenis): () => void {
  const listeners = new AbortController();
  document.body.addEventListener(
    'click',
    (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      // Replace, not push: the router keys its own history entries and would read a pushed one as
      // a page to restore.
      history.replaceState(history.state, '', url.hash);
      lenis.scrollTo(target);
      // The browser would have moved the keyboard's starting point to the target; cancelling the
      // click meant it didn't, so the next Tab would land back in the header after "Skip to content".
      if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    },
    { signal: listeners.signal },
  );
  return () => listeners.abort();
}
