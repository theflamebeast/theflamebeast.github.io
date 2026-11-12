import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED_MOTION, wideQuery } from './prefs';

gsap.registerPlugin(ScrollTrigger);

const ROW_SHIFT_VW = 14;

const through = (trigger: Element) => ({
  trigger,
  start: 'top bottom',
  end: 'bottom top',
  scrub: true,
  invalidateOnRefresh: true,
});

// Scroll-scrubbed effects: off below 720 px and under reduced motion. gsap.matchMedia reverts every
// tween and inline style the moment the query stops matching, so a resize mid-session leaves the
// static layout behind, not a half-moved one.
export function initScrub(): () => void {
  const mm = gsap.matchMedia();
  mm.add(`${wideQuery(720)} and (not ${REDUCED_MOTION})`, () => {
    for (const row of document.querySelectorAll<HTMLElement>('[data-row]')) {
      const sign = row.dataset.direction === 'left' ? -1 : 1;
      gsap.fromTo(
        row,
        { x: () => (-sign * ROW_SHIFT_VW * innerWidth) / 200 },
        { x: () => (sign * ROW_SHIFT_VW * innerWidth) / 200, ease: 'none', scrollTrigger: through(row.parentElement ?? row) },
      );
    }

    for (const el of document.querySelectorAll<HTMLElement>('[data-parallax]')) {
      const travel = Number(el.dataset.parallax) || 10;
      // An element that fills a clipped frame grows just enough that its travel never shows an edge.
      const scale = 'parallaxFill' in el.dataset ? 1 + (2 * travel) / 100 : 1;
      gsap.fromTo(
        el,
        { yPercent: -travel, scale },
        { yPercent: travel, scale, ease: 'none', scrollTrigger: through(el.parentElement ?? el) },
      );
    }

    for (const curve of document.querySelectorAll<HTMLElement>('[data-footer-curve]')) {
      gsap.fromTo(
        curve,
        { scaleY: 1 },
        {
          scaleY: 0,
          transformOrigin: '50% 0%',
          ease: 'none',
          // The footer ends the page, so its own bottom reaching the viewport's is the furthest scroll.
          scrollTrigger: { trigger: curve.parentElement ?? curve, start: 'top bottom', end: 'bottom bottom', scrub: true },
        },
      );
    }
  });
  return () => mm.revert();
}
