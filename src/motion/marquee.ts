import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './prefs';

gsap.registerPlugin(ScrollTrigger);

const LOOP_S = 14;

// The track holds identical copies, so moving it left by one copy's share of its width and
// wrapping is seamless at any viewport width.
export function initMarquee(): () => void {
  if (prefersReducedMotion()) return () => {};
  const ctx = gsap.context(() => {
    for (const track of document.querySelectorAll<HTMLElement>('[data-marquee]')) {
      const copies = track.children.length || 1;
      const roll = gsap.to(track, { xPercent: -100 / copies, duration: LOOP_S, ease: 'none', repeat: -1, paused: true });
      // A repeating tween that runs backwards from time 0 stops dead; start it deep in its repeats.
      roll.totalTime(LOOP_S * 1000);
      ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => (self.isActive ? roll.play() : roll.pause()),
        onUpdate: (self) => roll.timeScale(self.direction),
      });
    }
  });
  return () => ctx.revert();
}
