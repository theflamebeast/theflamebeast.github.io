import { prefersReducedMotion } from './prefs';

// Big headings drawn as a grid of dots that the pointer sweeps aside and that spring back home.
// The heading's own text stays in the page (transparent while the dots are up), so its accessible
// name, layout and the no-JS and reduced-motion pages never change.

const MAX_DOTS = 9000;
// Grid steps per em of the heading's font size, but never closer than MIN_STEP_CSS_PX: on a phone
// 1/40 em is 2 px and the dots blur into grey type.
const DOTS_PER_EM = 40;
const MIN_STEP_CSS_PX = 3;
const SPRING = 0.016;
const SPRING_SPREAD = 0.0011;
const DAMP = 0.86;
const PUSH = 6.5;
const SWIRL = 2.8;
const DRAG = 0.16;
const SPLASH = 42;
const FRAME_S = 1 / 60;
// A frame can stand in for at most this many sixtieths, so a stall cannot fling the dots. Five keeps
// the springs stable and lets a 12 fps device keep real time.
const MAX_STEPS = 5;
// Squared speed in device pixels per sixtieth: below this a dot counts as at rest.
const REST_SPEED2 = 0.01;
// Within this many device pixels of home a dot counts as home: the last fraction of the spring's
// approach is invisible and took seconds on a slow device. Settled dots are snapped exactly home.
const HOME_PX = 1.5;
const IDLE_AFTER_MS = 500;
const COLOUR_EVERY_MS = 200;

type Rgb = [number, number, number];

export function initDotType(): () => void {
  if (prefersReducedMotion()) return () => {};
  const stops = [...document.querySelectorAll<HTMLElement>('[data-dots]')].map(mount);
  return () => {
    for (const stop of stops) stop();
  };
}

// Resolves any CSS colour, custom properties included, to RGB numbers.
function readColour(probe: HTMLElement, value: string): Rgb {
  probe.style.color = value;
  const match = getComputedStyle(probe).color.match(/[\d.]+/g) ?? ['0', '0', '0'];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

const mix = (a: Rgb, b: Rgb, t: number) =>
  `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(' ')})`;

function mount(heading: HTMLElement): () => void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  canvas.dataset.dotsCanvas = '';
  canvas.dataset.state = 'idle';
  canvas.setAttribute('aria-hidden', 'true');
  heading.append(canvas);

  const probe = document.createElement('span');
  probe.hidden = true;
  heading.append(probe);

  let scale = 1;
  let width = 0;
  let height = 0;
  // Per dot: x, y, vx, vy, home x, home y.
  let dots = new Float32Array(0);
  let speed = new Uint8Array(0);
  let count = 0;
  let size = 2;
  // The heading's font size in device pixels, read once per build: reading styles every frame
  // forced a style recalculation per frame and made the smooth scroll stutter.
  let fontPx = 0;
  let raf = 0;
  let last = 0;
  let quietSince = 0;
  let inView = false;
  let built = false;
  // True when the loop stopped (scrolled away) before the dots were home.
  let unsettled = false;
  let colours: string[] = [];
  let coloursAt = -Infinity;
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, near: false };

  const refreshColours = (now: number) => {
    if (now - coloursAt < COLOUR_EVERY_MS) return;
    coloursAt = now;
    const text = readColour(probe, 'var(--text)');
    const live = readColour(probe, 'var(--ink-live)');
    colours = [0, 0.35, 0.7, 1].map((t) => mix(text, live, t));
  };

  // Lays every visible character out exactly where the page put it, then samples it into dots.
  const build = () => {
    const box = canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    scale = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.width = Math.round(box.width * scale);
    height = canvas.height = Math.round(box.height * scale);

    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const o = off.getContext('2d', { willReadFrequently: true });
    if (!o) return;
    const style = getComputedStyle(heading);
    o.font = `${style.fontWeight} ${parseFloat(style.fontSize) * scale}px ${style.fontFamily}`;
    o.fillStyle = '#fff';
    o.textBaseline = 'alphabetic';

    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i++) {
        if (!text[i].trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        const ascent = o.measureText(text[i]).fontBoundingBoxAscent;
        o.fillText(text[i], (r.left - box.left) * scale, (r.top - box.top) * scale + ascent);
      }
    }

    const data = o.getImageData(0, 0, width, height).data;
    let filled = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 127) filled++;
    // Coarse enough that each dot reads as a dot (finer grids blur into grey type), and never more
    // than MAX_DOTS of them.
    fontPx = parseFloat(style.fontSize) * scale;
    const step = Math.max(
      Math.round(MIN_STEP_CSS_PX * scale),
      Math.round(fontPx / DOTS_PER_EM),
      Math.round(Math.sqrt(filled / MAX_DOTS)),
    );
    const homes: number[] = [];
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) if (data[(y * width + x) * 4 + 3] > 127) homes.push(x, y);
    }

    const old = dots;
    const oldCount = count;
    count = homes.length / 2;
    dots = new Float32Array(count * 6);
    speed = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const j = i * 6;
      if (i < oldCount) {
        dots[j] = old[j];
        dots[j + 1] = old[j + 1];
        dots[j + 2] = old[j + 2];
        dots[j + 3] = old[j + 3];
      } else {
        // New dots start at home. An assembly from a scatter ran thousands of dots every frame for
        // seconds while the page loaded (most of the blocking time Lighthouse measured), for motion
        // nobody asked for; the dots move only when the pointer does.
        dots[j] = homes[i * 2];
        dots[j + 1] = homes[i * 2 + 1];
      }
      dots[j + 4] = homes[i * 2];
      dots[j + 5] = homes[i * 2 + 1];
    }
    size = Math.max(1.5 * scale, step * 0.62);
    built = true;
    heading.dataset.dotsOn = '';
    // Resizing a canvas clears it, and the loop that would repaint may not be running (the
    // visibility observer has not reported yet at startup, or the dots are already home).
    draw();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    const half = size / 2;
    for (let bucket = 0; bucket < colours.length; bucket++) {
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        if (speed[i] !== bucket) continue;
        const j = i * 6;
        ctx.rect(dots[j] - half, dots[j + 1] - half, size, size);
      }
      ctx.fillStyle = colours[bucket];
      ctx.fill();
    }
  };

  const frame = (now: number) => {
    raf = 0;
    const steps = Math.min((now - last) / 1000 / FRAME_S, MAX_STEPS);
    last = now;
    refreshColours(now);

    const radius = 0.9 * fontPx;
    const radius2 = radius * radius;
    const damp = DAMP ** steps;
    let restless = false;
    for (let i = 0; i < count; i++) {
      const j = i * 6;
      let x = dots[j];
      let y = dots[j + 1];
      let vx = dots[j + 2];
      let vy = dots[j + 3];
      const k = (SPRING + (i % 9) * SPRING_SPREAD) * steps;
      vx += (dots[j + 4] - x) * k;
      vy += (dots[j + 5] - y) * k;
      if (pointer.near) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius2) {
          const d = Math.sqrt(d2) + 0.01;
          const f = 1 - d / radius;
          const nx = dx / d;
          const ny = dy / d;
          vx += ((nx * PUSH - ny * SWIRL) * f * f * scale + pointer.vx * f * DRAG) * steps;
          vy += ((ny * PUSH + nx * SWIRL) * f * f * scale + pointer.vy * f * DRAG) * steps;
        }
      }
      vx *= damp;
      vy *= damp;
      x += vx * steps;
      y += vy * steps;
      dots[j] = x;
      dots[j + 1] = y;
      dots[j + 2] = vx;
      dots[j + 3] = vy;
      const s = (vx * vx + vy * vy) / (scale * scale);
      speed[i] = s < 0.3 ? 0 : s < 3 ? 1 : s < 14 ? 2 : 3;
      if (s > REST_SPEED2 || Math.abs(dots[j + 4] - x) > HOME_PX || Math.abs(dots[j + 5] - y) > HOME_PX) restless = true;
    }
    pointer.vx *= 0.82 ** steps;
    pointer.vy *= 0.82 ** steps;
    draw();

    if (restless || pointer.near) quietSince = now;
    if (now - quietSince > IDLE_AFTER_MS || !inView) {
      unsettled = restless;
      if (!restless) settle();
      canvas.dataset.state = 'idle';
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const settle = () => {
    for (let i = 0; i < count; i++) {
      const j = i * 6;
      dots[j] = dots[j + 4];
      dots[j + 1] = dots[j + 5];
      dots[j + 2] = 0;
      dots[j + 3] = 0;
      speed[i] = 0;
    }
    draw();
  };

  const wake = () => {
    if (!built || !inView || raf) return;
    canvas.dataset.state = 'running';
    last = performance.now();
    quietSince = last;
    raf = requestAnimationFrame(frame);
  };

  const toCanvas = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) * scale,
      y: (event.clientY - box.top) * scale,
      inside:
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom,
    };
  };

  const limit = (v: number) => Math.max(-90 * scale, Math.min(90 * scale, v));
  const listeners = new AbortController();
  window.addEventListener(
    'pointermove',
    (event) => {
      const p = toCanvas(event);
      if (!p.inside) {
        pointer.near = false;
        return;
      }
      if (pointer.near) {
        pointer.vx = limit(pointer.vx + p.x - pointer.x);
        pointer.vy = limit(pointer.vy + p.y - pointer.y);
      }
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.near = true;
      wake();
    },
    { passive: true, signal: listeners.signal },
  );
  window.addEventListener(
    'pointerdown',
    (event) => {
      const p = toCanvas(event);
      if (!p.inside || !built) return;
      const reach = 2.2 * fontPx;
      for (let i = 0; i < count; i++) {
        const j = i * 6;
        const dx = dots[j] - p.x;
        const dy = dots[j + 1] - p.y;
        const d = Math.hypot(dx, dy) + 0.01;
        if (d >= reach) continue;
        const f = (1 - d / reach) * SPLASH * scale;
        dots[j + 2] += (dx / d) * f;
        dots[j + 3] += (dy / d) * f;
      }
      wake();
    },
    { passive: true, signal: listeners.signal },
  );
  document.addEventListener('pointerleave', () => (pointer.near = false), { signal: listeners.signal });
  // A finger that lifts is gone; a mouse stays where it is. Not every engine sends the document-level
  // pointerleave above for a touch, and without it the dots keep pushing away from a finger that left.
  const fingerLifted = (event: PointerEvent) => {
    if (event.pointerType === 'touch') pointer.near = false;
  };
  window.addEventListener('pointerup', fingerLifted, { passive: true, signal: listeners.signal });
  window.addEventListener('pointercancel', fingerLifted, { passive: true, signal: listeners.signal });

  const visibility = new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView && unsettled) wake();
  });
  const resize = new ResizeObserver(() => {
    if (!built) return;
    build();
    wake();
  });

  let alive = true;
  void document.fonts.ready.then(() => {
    if (!alive) return;
    refreshColours(performance.now());
    build();
    visibility.observe(canvas);
    resize.observe(heading);
  });

  return () => {
    alive = false;
    listeners.abort();
    visibility.disconnect();
    resize.disconnect();
    if (raf) cancelAnimationFrame(raf);
    canvas.remove();
    probe.remove();
    delete heading.dataset.dotsOn;
  };
}
