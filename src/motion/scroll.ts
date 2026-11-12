import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion } from './prefs';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenis;
}

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
  lenis = instance;
  document.documentElement.dataset.smooth = 'on';

  return () => {
    ScrollTrigger.removeEventListener('refresh', countTriggers);
    gsap.ticker.remove(raf);
    instance.destroy();
    if (lenis === instance) lenis = null;
    delete document.documentElement.dataset.smooth;
  };
}
