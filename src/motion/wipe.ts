import { gsap } from 'gsap';
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import { prefersReducedMotion } from './prefs';

type State = 'idle' | 'covering' | 'covered' | 'opening';

const INTRO_KEY = 'ag:intro';
const FONT_WAIT_MS = 600;
const FAILSAFE_MS = 4000;
// The intro's CSS failsafe starts fading the cover at 2.2 s. Opening it after that would bring
// the ink back, so past this point the script just lets the CSS finish.
const INTRO_LATE_MS = 2100;
// A pointerdown older than this did not start the navigation; cover from the centre instead.
const POINTER_FRESH_MS = 1500;
const LABEL_HOLD_MS = 350;

let started = false;

// Registered once for the whole visit, not through onPage: the cover persists across page swaps
// and has to keep animating while the page under it is torn down and replaced.
export function initInkWipe(): void {
  if (started) return;
  started = true;

  const root = document.documentElement;
  const radius = { r: 0 };
  let tween: gsap.core.Tween | null = null;
  let failsafe = 0;
  let origin = { x: 0, y: 0 };
  let pointer = { x: 0, y: 0, t: -Infinity };
  let keyT = -Infinity;
  let firstLoad = true;

  const wipe = () => document.querySelector<HTMLElement>('[data-ink-wipe]');
  const state = () => (wipe()?.dataset.state ?? 'idle') as State;

  const setState = (next: State) => {
    const el = wipe();
    if (!el) return;
    el.dataset.state = next;
    window.clearTimeout(failsafe);
    if (next === 'idle') {
      tween?.kill();
      tween = null;
      radius.r = 0;
      el.style.setProperty('--wipe-r', '0px');
      return;
    }
    failsafe = window.setTimeout(() => setState('idle'), FAILSAFE_MS);
  };

  const setOrigin = (x: number, y: number) => {
    origin = { x, y };
    wipe()?.style.setProperty('--wipe-x', `${x}px`);
    wipe()?.style.setProperty('--wipe-y', `${y}px`);
  };

  const centre = () => setOrigin(window.innerWidth / 2, window.innerHeight / 2);

  // From the origin to the farthest corner, plus the feather so the soft edge clears it too.
  const fullRadius = () => {
    const { x, y } = origin;
    const w = window.innerWidth;
    const h = window.innerHeight;
    return Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y)) + 0.14 * Math.max(w, h);
  };

  // Resolves true when the tween finished, false when a newer one killed it.
  const animate = (next: 'covering' | 'opening', duration: number, ease: string, from: number) =>
    new Promise<boolean>((resolve) => {
      const el = wipe();
      tween?.kill();
      radius.r = from;
      setState(next);
      tween = gsap.to(radius, {
        r: fullRadius(),
        duration,
        ease,
        onUpdate: () => el?.style.setProperty('--wipe-r', `${radius.r}px`),
        onComplete: () => {
          tween = null;
          resolve(true);
        },
        onInterrupt: () => resolve(false),
      });
    });

  // Once covered, stay long enough for the destination's name to be read, however fast it loads.
  const cover = async () => {
    if (!(await animate('covering', 0.55, 'power2.inOut', tween ? radius.r : 0))) return;
    setState('covered');
    await new Promise((r) => setTimeout(r, LABEL_HOLD_MS));
  };

  const open = async () => {
    if (await animate('opening', 0.7, 'power2.out', 0)) setState('idle');
  };

  const intro = async () => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // Storage blocked: the intro may play again on the next load, which is harmless.
    }
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, FONT_WAIT_MS))]);
    if (performance.now() > INTRO_LATE_MS) {
      delete root.dataset.intro;
      return;
    }
    centre();
    const opening = open();
    // The intro rule only applies while idle; the cover is now in the opening state.
    delete root.dataset.intro;
    await opening;
  };

  document.addEventListener(
    'pointerdown',
    (event) => {
      pointer = { x: event.clientX, y: event.clientY, t: performance.now() };
    },
    { capture: true, passive: true },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') keyT = performance.now();
    },
    { capture: true },
  );

  document.addEventListener('astro:before-preparation', (event) => {
    if (prefersReducedMotion()) return;
    const e = event as TransitionBeforePreparationEvent;

    const titles: Record<string, string> = JSON.parse(document.getElementById('route-titles')?.textContent ?? '{}');
    const path = e.to.pathname.length > 1 ? e.to.pathname.replace(/\/$/, '') : e.to.pathname;
    const label = wipe()?.querySelector('[data-wipe-label]');
    if (label) label.textContent = titles[path] ?? '';

    const fromPointer =
      e.navigationType !== 'traverse' && pointer.t > keyT && performance.now() - pointer.t < POINTER_FRESH_MS;
    if (fromPointer) setOrigin(pointer.x, pointer.y);
    else centre();

    const load = e.loader;
    e.loader = async () => {
      await Promise.all([cover(), load()]);
    };
  });

  document.addEventListener('astro:page-load', () => {
    if (firstLoad) {
      firstLoad = false;
      if ('intro' in root.dataset) void intro();
      return;
    }
    const current = state();
    if (current === 'covering' || current === 'covered') void open();
  });
}
