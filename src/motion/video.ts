import { prefersReducedMotion } from './prefs';

// The markup ships with native controls and no autoplay, which is the whole experience without JS.
// With JS the clip plays only while on screen, never under reduced motion until asked, and a
// single button pauses it for good: looping motion needs a way to stop it (WCAG 2.2.2).
export function initCaseVideo(): () => void {
  const video = document.querySelector<HTMLVideoElement>('[data-case-video]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-video-toggle]');
  if (!video || !toggle) return () => {};

  let wanted = !prefersReducedMotion();
  let inView = false;
  const label = () => {
    toggle.setAttribute('aria-label', wanted ? 'Pause video' : 'Play video');
    toggle.dataset.state = wanted ? 'playing' : 'paused';
  };
  const sync = () => {
    if (!wanted || !inView) {
      video.pause();
      return;
    }
    video.play().catch((error: unknown) => {
      // An autoplay policy refused it: show Play, so the first click is the gesture that starts
      // it. An AbortError only means a pause (scrolled away) cut the request short; ignore that.
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        wanted = false;
        label();
      }
    });
  };

  video.removeAttribute('controls');
  toggle.hidden = false;
  label();

  const visibility = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    sync();
  });
  visibility.observe(video);

  const listeners = new AbortController();
  toggle.addEventListener(
    'click',
    () => {
      wanted = !wanted;
      label();
      sync();
    },
    { signal: listeners.signal },
  );

  return () => {
    listeners.abort();
    visibility.disconnect();
    video.pause();
  };
}
