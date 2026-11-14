import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion } from './prefs';

gsap.registerPlugin(ScrollTrigger, SplitText);

const START = 'top 88%';

// The page is complete without this: nothing is hidden until GSAP sets an element's start state,
// right as its trigger is made, so a script that never runs leaves everything visible.
export function initReveals(): () => void {
  if (prefersReducedMotion()) return () => {};
  const root = document.documentElement;
  root.classList.add('js-motion');

  const ctx = gsap.context(() => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal="lines"]')) {
      SplitText.create(el, {
        type: 'lines',
        // Auto adds an aria-label, which only suits elements that can carry one: a heading, not a <p>.
        aria: el.matches('h1, h2, h3, h4, h5, h6') ? 'auto' : 'none',
        mask: 'lines',
        linesClass: 'reveal-line',
        autoSplit: true,
        onSplit: (split) =>
          gsap.from(split.lines, {
            yPercent: 100,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: START, once: true },
          }),
      });
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal="fade"]')) {
      gsap.from(el, {
        y: '2em',
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: START, once: true },
      });
    }
  });

  return () => {
    ctx.revert();
    root.classList.remove('js-motion');
  };
}
