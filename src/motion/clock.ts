import { formatLocalTime } from '../lib/clock';

export function initClock(): () => void {
  const clocks = document.querySelectorAll<HTMLElement>('[data-clock]');
  if (clocks.length === 0) return () => {};
  let timer = 0;
  const tick = () => {
    const now = new Date();
    for (const el of clocks) el.textContent = formatLocalTime(now);
    timer = window.setTimeout(tick, 60_000 - (now.getTime() % 60_000) + 50);
  };
  tick();
  return () => window.clearTimeout(timer);
}
