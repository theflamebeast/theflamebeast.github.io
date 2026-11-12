# Ink Signature (Round 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry the ink through the whole site (live colour, header project picker, ink page
transitions, email-headline footer) and replace the generic effects around it, then ship.

**Architecture:** Same static Astro site. One new shared value, the CSS colour `--ink-live`, is driven
from the same page clock as the hero's ink and read by everything decorative. Each new behaviour is one
module in `src/motion/` returning its own teardown, started from the single `onPage` in `Base.astro`;
the page-transition cover is the one persistent piece and registers once. Every feature is complete
without JavaScript, without hover, and under reduced motion.

**Tech Stack:** Astro 7.4.2, TypeScript 6.0.3, GSAP 3.15.0 (ScrollTrigger, SplitText), Lenis 1.3.27,
Vitest 4.1.12, Playwright 1.64.1. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-ink-signature-design.md`, which amends
`docs/superpowers/specs/2026-11-10-portfolio-redesign-design.md`. Read both; the newer wins.

**Supersedes:** Tasks 8 to 15 of `docs/superpowers/plans/2026-11-10-portfolio-redesign.md`. Its Tasks 1
to 7 are done (`redesign` at `35b8259`).

## Global Constraints

- Branch `redesign`. Push after every task. Nothing merges to `main` until Task 11.
- No new dependencies and no version changes.
- Motion mounts and tears down only through `onPage` (`src/motion/lifecycle.ts`). The one exception is
  the page-transition cover (Task 7), which listens to navigation itself and registers once.
- The page is complete without JS, without WebGL and under reduced motion. Nothing hides content at
  load unless it also removes itself without JS's help.
- Nothing trails the cursor as a floating preview card. Project previews sit in a fixed place.
- `--ink-live` is for fills, lines and glows only, never text colour. Text on an `--ink-live` fill is
  `var(--bg)`.
- Never the interpunct U+00B7 in any built file. No phone number. No "FlameBeast", YouTube, Twitch or
  guns.lol. Never name the owner's other private projects. External links are only the ones
  `tests/e2e/guards.spec.ts` already allows.
- Media queries for motion come from `src/motion/prefs.ts`, never written inline in a module.
- `npm test` only through `npm test` (never `npx vitest`); dependency changes, if ever needed, through
  `npx -y npm@11.21.1`.
- A removal is not done until everything that existed only for the removed thing is gone: styles,
  attributes, tests, tokens, doc lines. Grep for the name before committing.
- Every task updates `CLAUDE.md` in the same commit when it adds or removes a file area, a
  convention, a command or a danger zone.
- Each task ends with `npm run verify` green, a commit staged by path, a push, and `gh run list
  --limit 1` showing the build job succeeded. Commit messages end with the attribution line the
  session supplies.

## Review Focus

1. **Page scripts never arrive** (blocked, offline, a syntax error) on a first visit: the preloader
   cover must lift on its own and the page must be readable. Test owned by Task 7.
2. **Keyboard-only visitor:** the Work picker opens, every row is reachable, Escape closes it and
   returns focus, and the header never slides away while focus is inside it. Test owned by Task 6.
3. **Copying is unavailable or refused** (no clipboard API, permission denied): the email click
   opens the mail app, with no console error and no dead click. Test owned by Task 4.
4. **Back, forward, and a second click while the cover is moving:** the cover ends idle, the page
   scrolls, and the live ScrollTrigger count equals a fresh load of that page. Test owned by Task 7.
5. **Touch screen at 390 px:** the picker opens on tap with no hover, a row tap navigates, nothing
   overflows sideways with the panel open, and the spotlight and next-project hover states do not
   hide anything. Tests owned by Tasks 3, 5 and 6.

---

## File Structure

```
src/ink/palette.ts            + liveInkHue, liveInkRgb, rgbToCss
src/ink/fluid.ts              hue clock moves to the page clock
src/styles/tokens.css         + --ink-live (resting value)
src/lib/format.ts             + formatCount
src/lib/projects.ts           NEW  loadProjects(): the one reader of the projects collection
src/motion/prefs.ts           + HOVER, canHover
src/motion/accent.ts          NEW  initLiveAccent
src/motion/scroll.ts          + initScrollProgress, Lenis anchors; getLenis removed
src/motion/scrub.ts           rows and parallax only
src/motion/copy.ts            NEW  initCopyEmail
src/motion/spotlight.ts       NEW  initSpotlight
src/motion/header.ts          NEW  initHeader
src/motion/picker.ts          NEW  initWorkPicker
src/motion/wipe.ts            NEW  initInkWipe (registers once)
src/components/ScrollProgress.astro  NEW
src/components/Button.astro          renamed from MagneticButton.astro
src/components/WorkPicker.astro      NEW  rows and fixed previews
src/components/InkWipe.astro         NEW  the persistent cover
src/components/Nav.astro             fixed header holding the picker
src/components/Footer.astro          email headline, horizon
src/components/Arrow.astro           DELETED
src/components/MenuPanel.astro       DELETED
scripts/shots.mjs             NEW  12 screenshots
tests/e2e/{accent,footer,interact,header,transitions}*.spec.ts  NEW
```

---

### Task 1: Live ink colour and the scroll-progress line

**Files:**
- Create: `src/motion/accent.ts`, `src/components/ScrollProgress.astro`, `tests/e2e/accent.spec.ts`,
  `tests/e2e/accent.reduced.spec.ts`
- Modify: `src/ink/palette.ts`, `src/ink/fluid.ts` (lines 145 to 146, the `born` clock),
  `src/motion/scroll.ts`, `src/styles/tokens.css`, `src/layouts/Base.astro`,
  `tests/unit/palette.test.ts`, `CLAUDE.md`

**Interfaces:**
- Produces in `src/ink/palette.ts`:
  - `liveInkHue(pageMs: number): number` = `inkHue(pageMs + INK_HUE_START_MS, 0)`
  - `liveInkRgb(pageMs: number): Rgb` = `hsvToRgb(liveInkHue(pageMs), 0.6, 1)`
  - `rgbToCss(rgb: Rgb): string`, channels rounded to 0..255, space-separated: `rgb(255 102 0)`
- `src/ink/fluid.ts`: `hueTime(now)` becomes `now + INK_HUE_START_MS` (`now` is already
  `performance.now()`); delete `born`. Strokes, idle and ring splats then share the page clock with
  `--ink-live`.
- `src/styles/tokens.css`: `--ink-live: rgb(151 102 255);` (hue 0.72, the middle of the range).
- Produces `initLiveAccent(): () => void` in `src/motion/accent.ts`: every 200 ms sets `--ink-live`
  on `<html>` to `rgbToCss(liveInkRgb(performance.now()))`; no-op under reduced motion; the teardown
  clears the timer and leaves the property (so a page swap does not flash the resting colour).
- Produces `initScrollProgress(): () => void` in `src/motion/scroll.ts`: one `ScrollTrigger`
  (`start: 0`, `end: 'max'`) writing `scaleX = progress` on `[data-progress]`.
- `ScrollProgress.astro`: `<div class="progress" data-progress aria-hidden="true">`, fixed to the
  top, 2 px tall, `transform-origin: left`, `scale: 0 1` at rest, `background: var(--ink-live)`,
  `z-index: 30`. Placed first in `<body>` by `Base.astro`.

- [ ] **Step 1: Failing unit tests** in `tests/unit/palette.test.ts`

```ts
const BG: Rgb = [6 / 255, 7 / 255, 12 / 255];
const luminance = ([r, g, b]: Rgb) => {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: Rgb, b: Rgb) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

it('liveInkHue starts at cyan on the page clock and reaches pink half a cycle later', () => {
  expect(liveInkHue(0)).toBeCloseTo(0.52, 9);
  expect(liveInkHue(INK_HUE_CYCLE_MS / 2)).toBeCloseTo(0.92, 9);
});
it('dark text on the live colour meets WCAG AA at every point in the cycle', () => {
  for (let i = 0; i < 1000; i++) expect(contrast(liveInkRgb((i / 1000) * INK_HUE_CYCLE_MS), BG)).toBeGreaterThanOrEqual(4.5);
});
it('rgbToCss writes whole channels, space separated', () => {
  expect(rgbToCss([1, 0.4, 0])).toBe('rgb(255 102 0)');
});
```

- [ ] **Step 2:** `npm test tests/unit/palette.test.ts` → FAIL, `liveInkHue is not a function`.
- [ ] **Step 3:** Implement the three palette functions. `npm test tests/unit/palette.test.ts` → PASS.
  If the contrast test fails at saturation 0.6, lower the saturation until it passes and record the
  value in `CLAUDE.md`; do not weaken the test.
- [ ] **Step 4: Failing e2e tests**

```ts
// accent.spec.ts
const live = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink-live').trim());
test('--ink-live changes as the page clock runs', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--ink-live'))).not.toBe('');
  const before = await live(page);
  await page.clock.fastForward(6000);
  await expect.poll(() => live(page)).not.toBe(before);
});
test('the progress line is empty at the top and full at the bottom', async ({ page }) => {
  await page.goto('/');
  const scaleX = () => page.locator('[data-progress]').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
  expect(await scaleX()).toBeLessThan(0.02);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(scaleX).toBeGreaterThan(0.98);
});
// accent.reduced.spec.ts
test('under reduced motion the live colour holds still at its resting value', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--ink-live'))).toBe('');
});
```

- [ ] **Step 5:** `npm run build && npx playwright test accent` → FAIL (no `[data-progress]`, no
  inline `--ink-live`).
- [ ] **Step 6:** Implement `accent.ts`, `initScrollProgress`, `ScrollProgress.astro`, the token and
  the `fluid.ts` clock change; add both inits to the `onPage` list in `Base.astro`.
- [ ] **Step 7:** `npm run verify` → PASS. `CLAUDE.md`: add `accent.ts` and the `--ink-live` rule
  (fills only, never text) to Layout and Conventions. Commit, push, check CI.

---

### Task 2: Download figure and the weekly rebuild

**Files:**
- Modify: `src/lib/format.ts`, `tests/unit/format.test.ts`, `src/components/CompactCard.astro`
  (the `compact-count` line), `tests/e2e/home.spec.ts:28`, `.github/workflows/deploy.yml`, `CLAUDE.md`

**Interfaces:**
- Produces `formatCount(n: number): string` in `src/lib/format.ts`: below 1,000 the plain integer;
  from 1,000 a figure **rounded down** to one decimal in thousands with a trailing `.0` dropped,
  then `k+`; from 1,000,000 the same in millions with `M+`. Task 6 reuses it.

- [ ] **Step 1: Failing test**

```ts
it.each([
  [0, '0'], [999, '999'], [1000, '1k+'], [1831, '1.8k+'], [1999, '1.9k+'], [2000, '2k+'],
  [2050, '2k+'], [12345, '12.3k+'], [999_999, '999.9k+'], [1_250_000, '1.2M+'],
])('formatCount(%i) is %s, never above the real count', (n, out) => {
  expect(formatCount(n)).toBe(out);
});
```

- [ ] **Step 2:** `npm test tests/unit/format.test.ts` → FAIL, `formatCount is not a function`.
- [ ] **Step 3:** Implement with `Math.floor`, not `toFixed` (which rounds up). → PASS.
- [ ] **Step 4:** `CompactCard.astro` renders `{formatCount(downloads)} downloads`. Change
  `home.spec.ts:28` to `toContainText(/\b\d+(\.\d)?k\+ downloads/)`; run it before the component
  change to see it FAIL, after to see it PASS.
- [ ] **Step 5:** `deploy.yml`: add under `on:`

```yaml
  schedule:
    - cron: '23 10 * * 1'
```

  Scheduled runs use the default branch, so this starts working after the Task 11 cutover; the
  `deploy` job's `main` condition already holds for it.
- [ ] **Step 6:** `npm run verify` → PASS. `CLAUDE.md`: the workflow row gains "and every Monday,
  to refresh the download figure". Commit, push, check CI.

---

### Task 3: Arrows out, hero hint, next-project cover

**Files:**
- Delete: `src/components/Arrow.astro`
- Modify: `src/components/Hero.astro`, `src/pages/work/[slug].astro`, `src/motion/scrub.ts`,
  `src/motion/prefs.ts`, `tests/e2e/hero.spec.ts`, `tests/e2e/hero.phone.spec.ts`,
  `tests/e2e/hero.reduced.spec.ts`, `tests/e2e/case-study.spec.ts`,
  `tests/e2e/motion.phone.spec.ts`, `CLAUDE.md`

**Interfaces:**
- Produces in `src/motion/prefs.ts`: `export const HOVER = '(hover: hover)'` and
  `canHover(): boolean`. Tasks 5 and 6 use both.
- `Hero.astro`: `.hero-cue` and its styles go. In its place
  `<p class="hero-hint meta" data-ink-hint hidden><span class="hint-mouse">Move your cursor</span><span class="hint-touch">Tap to splash</span></p>`,
  bottom-left inside the wrap, `aria-hidden="true"`; CSS shows `.hint-touch` and hides `.hint-mouse`
  under `(hover: none)`. The hero script unhides it only after `createInkFluid` returns a fluid, sets
  `data-used` on the first non-touch `pointermove` or the first tap `splatRing`, and re-hides it in
  the teardown. `[data-used]` fades it to opacity 0 over 0.6 s.
- `scrub.ts`: the `[data-rotate]` loop and `ROTATE_DEG` go.
- `[slug].astro`: the `Arrow` goes from `.next-link`. `[data-next-project]` becomes a two-column
  block: the title link, and `<div class="next-cover" data-next-cover>` holding the next project's
  cover (`Image`, `alt=""`, `widths={[480, 960]}`), width `clamp(14rem, 28vw, 26rem)`, ratio 16/10.
  Under `HOVER` the cover is `clip-path: inset(100% 0 0 0)` and becomes `inset(0)` on
  `.next:hover` and `.next:focus-within`, 0.7 s `var(--ease-out)`, no transition under reduced
  motion. Under `(hover: none)` it is always `inset(0)`. Pure CSS, no script.

- [ ] **Step 1: Failing tests**

```ts
// hero.spec.ts
test('the hint shows while the sim runs and fades after the first stir', async ({ page }) => {
  await page.goto('/');
  const hint = page.locator('[data-ink-hint]');
  await expect(page.locator(INK)).toHaveAttribute('data-running', 'true');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText('Move your cursor');   // innerText: the touch span is display: none
  await page.mouse.move(700, 400); await page.mouse.move(760, 430);
  await expect(hint).toHaveCSS('opacity', '0');
});
// add to the existing no-WebGL2 test and the JS-off test:
await expect(page.locator('[data-ink-hint]')).toBeHidden();
test('no rotating arrows anywhere', async ({ page }) => {
  for (const path of ['/', '/work/stashout']) { await page.goto(path); await expect(page.locator('[data-rotate]')).toHaveCount(0); }
});
// hero.phone.spec.ts
test('the hint says "Tap to splash" and fades after a tap', ...)   // page.tap on the hero; opacity 0
// hero.reduced.spec.ts: the hint is hidden
// case-study.spec.ts
test('the next-project cover is clipped until the link is hovered or focused', async ({ page }) => {
  await page.goto('/work/stashout');
  const cover = page.locator('[data-next-cover]');
  await cover.scrollIntoViewIfNeeded();
  await expect(cover).toHaveCSS('clip-path', 'inset(100% 0px 0px)');
  await page.locator('[data-next-project] a').hover();
  await expect(cover).toHaveCSS('clip-path', 'inset(0px)');
  await page.mouse.move(0, 0);
  await page.locator('[data-next-project] a').focus();
  await expect(cover).toHaveCSS('clip-path', 'inset(0px)');
});
// motion.phone.spec.ts: drop [data-rotate] from SCRUBBED; add
test('on a touch screen the next-project cover is always shown', ...)  // /work/stashout, clip-path inset(0px), image visible
```

- [ ] **Step 2:** `npm run build && npx playwright test hero case-study motion.phone` → the new tests
  FAIL (no `[data-ink-hint]`, `[data-rotate]` present, no `[data-next-cover]`).
- [ ] **Step 3:** Implement. `grep -rn "Arrow\|data-rotate\|hero-cue\|next-arrow" src tests` → no
  output.
- [ ] **Step 4:** `npm run verify` → PASS. `CLAUDE.md`: `scrub.ts` no longer lists `[data-rotate]`;
  `prefs.ts` lists `HOVER`. Commit, push, check CI.

---

### Task 4: Footer: the email headline, copy, horizon

**Files:**
- Create: `src/motion/copy.ts`, `tests/e2e/footer.spec.ts`, `tests/e2e/footer.phone.spec.ts`
- Modify: `src/components/Footer.astro`, `src/motion/scrub.ts` (the footer-curve loop goes),
  `src/layouts/Base.astro`, `tests/e2e/motion.phone.spec.ts` (drop `[data-footer-curve]`), `CLAUDE.md`

**Interfaces:**
- Consumes: `--ink-live` (Task 1).
- `Footer.astro` (keeps `id="contact"`, `[data-clock]`, the GitHub and LinkedIn links, place,
  copyright): `<div class="footer-horizon" aria-hidden="true">` (a 1 px line in `var(--ink-live)`
  with a soft glow of the same colour above it; static CSS); a mono label `Contact`;
  `<a class="footer-email" href={SITE.links.email} data-copy-email={SITE.email}>{SITE.email}</a>`,
  `white-space: nowrap`, `font-size: clamp(1.25rem, 6.3vw, 7.5rem)`, weight 500;
  `<p class="meta" data-copy-status role="status" aria-live="polite"></p>`; a small mono link
  `Open in your mail app` to the same `mailto:`. The headline, the round button, `.footer-curve`,
  the `MagneticButton` import and their styles all go.
- Sweep: at rest the email is `var(--text)`. On `:hover` and `:focus-visible` a band of
  `var(--ink-live)` about a third of the width crosses the letters left to right once, 0.9 s
  (`background-clip: text`, animated `background-position`). Under reduced motion there is no
  sweep; the address is underlined instead.
- Produces `initCopyEmail(): () => void` in `src/motion/copy.ts`. For each `[data-copy-email]`, on
  a plain primary click (no modifier keys):
  - no `navigator.clipboard?.writeText`: do nothing, the `mailto:` proceeds;
  - otherwise `preventDefault()`, then `writeText(address)`. Resolved: the `[data-copy-status]`
    text becomes `Copied` and clears after 2000 ms. Rejected: click the link again with the
    handler bypassed, so the `mailto:` proceeds.
  The teardown aborts the listener and clears the status and its timer.

- [ ] **Step 1: Failing tests**

```ts
// footer.spec.ts
const EMAIL = 'anishguptaa18@gmail.com';
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('the email is the footer headline, on one line, inside the viewport', async ({ page }) => {
  await page.goto('/');
  const email = page.locator('footer [data-copy-email]');
  await expect(email).toHaveText(EMAIL);
  await expect(email).toHaveAttribute('href', `mailto:${EMAIL}`);
  const box = (await email.boundingBox())!;
  const size = await email.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThan(60);
  expect(box.height).toBeLessThan(size * 1.6);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1440);
  await expect(page.locator('footer')).not.toContainText('Have a role');
  await expect(page.locator('[data-footer-curve]')).toHaveCount(0);
});
test('clicking the email copies it and says Copied, then the note clears', async ({ page }) => {
  await page.goto('/');
  await page.locator('footer [data-copy-email]').click();
  await expect(page.locator('[data-copy-status]')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-copy-status]')).toHaveText('', { timeout: 3000 });
});
// Review Focus 3. `defaults` records event.defaultPrevented for every click that reaches document.
test('when copying is refused the click falls through to the mail app, with no error', ...)
//   addInitScript: navigator.clipboard.writeText = () => Promise.reject(new Error('denied'))
//   expect defaults toEqual([true, false]); collected console and page errors toEqual([])
test('with no clipboard API the click is never intercepted', ...)
//   addInitScript: Object.defineProperty(navigator, 'clipboard', { value: undefined }); defaults toEqual([false])
test('a ctrl-click is left alone', ...)                 // defaults toEqual([false])
test('without JS the email is an ordinary mailto link and the note is empty', ...)
// footer.phone.spec.ts
test('at 390 px the email stays on one line and nothing overflows sideways', ...)
//   scroll to the bottom; lift the overflow-x clip as home.phone.spec.ts does; scrollWidth <= 390
```

- [ ] **Step 2:** `npm run build && npx playwright test footer` → FAIL (no `[data-copy-email]`).
- [ ] **Step 3:** Implement. `grep -rn "footer-curve\|Get in touch\|mbtn-round\|shape=" src tests` →
  no output (the `round` variant lost its last user; delete its styles and the `shape` prop here).
- [ ] **Step 4:** `npm run verify` → PASS (the existing "footer links" test in `home.spec.ts` must
  still pass unchanged). `CLAUDE.md`: `copy.ts` in Layout; `scrub.ts` is now rows and parallax.
  Commit, push, check CI.

---

### Task 5: Buttons and spotlight cards

**Files:**
- Rename: `src/components/MagneticButton.astro` → `src/components/Button.astro` (`git mv`)
- Create: `src/motion/spotlight.ts`, `tests/e2e/interact.spec.ts`, `tests/e2e/interact.phone.spec.ts`
- Modify: `src/pages/work/[slug].astro` (import and two usages), `src/components/ProjectCard.astro`,
  `src/layouts/Base.astro`, `CLAUDE.md`

**Interfaces:**
- Consumes: `--ink-live` (Task 1), `canHover` (Task 3).
- `Button.astro`: props `{ href: string; label: string }`. Classes `btn`, `btn-fill`, `btn-text`.
  No `data-magnetic`, `data-strength`, `data-strength-text`. Rest: border `--line-strong`,
  background `--surface`, text `--text`. On `:hover` and `:focus-visible` `.btn-fill`
  (`background: var(--ink-live)`) rises from `translate: 0 101%` to `0 0` in 0.5 s
  `var(--ease-out)` and the label becomes `var(--bg)`. The button itself never moves.
- `ProjectCard.astro`: `.card-media` gains `data-spotlight-target`. CSS: when it carries
  `data-spotlight="on"`, an `::after` covers it with `rgb(6 7 12 / 0.4)`, masked by
  `radial-gradient(circle 18rem at var(--mx, -100rem) var(--my, -100rem), transparent, #000)`,
  `pointer-events: none`.
- Produces `initSpotlight(): () => void`: returns a no-op unless `canHover()`. Otherwise sets
  `data-spotlight="on"` on every `[data-spotlight-target]`, writes `--mx` and `--my` (px, relative
  to the target's box) on `pointermove` over its card, removes both on `pointerleave`. The teardown
  removes the attribute, the properties and the listeners.

- [ ] **Step 1: Failing tests**

```ts
// interact.spec.ts
test('a button fills with the live colour on hover, its label turns dark, and it does not lean', async ({ page }) => {
  await page.goto('/work/stashout');
  const btn = page.locator('.case-links .btn').first();
  await expect(btn).not.toHaveAttribute('data-magnetic', /.*/);
  const box = (await btn.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3);
  await expect(btn.locator('.btn-text')).toHaveCSS('color', 'rgb(6, 7, 12)');
  await expect.poll(async () => Math.abs((await btn.locator('.btn-fill').boundingBox())!.y - box.y)).toBeLessThan(2);   // the fill has risen to cover the button
  await expect(btn).toHaveCSS('transform', 'none');
  expect(await btn.boundingBox()).toEqual(box);
});
test('a project card dims its screenshot and the cursor lights the area around it', async ({ page }) => {
  await page.goto('/');
  const media = page.locator('[data-project-card] [data-spotlight-target]').first();
  await media.scrollIntoViewIfNeeded();
  await expect(media).toHaveAttribute('data-spotlight', 'on');
  const box = (await media.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => media.evaluate((el) => parseFloat(el.style.getPropertyValue('--mx')))).toBeCloseTo(box.width / 2, -1);
  await page.mouse.move(2, 2);
  await expect.poll(() => media.evaluate((el) => el.style.getPropertyValue('--mx'))).toBe('');
});
// interact.phone.spec.ts
test('on a touch screen cards are fully lit: no spotlight attribute', ...)   // not.toHaveAttribute('data-spotlight', /.*/)
```

- [ ] **Step 2:** `npm run build && npx playwright test interact` → FAIL (no `.btn`, no
  `data-spotlight-target`).
- [ ] **Step 3:** Implement. `grep -rn "MagneticButton\|mbtn\|data-magnetic\|data-strength" src tests
  CLAUDE.md` → no output.
- [ ] **Step 4:** `npm run verify` → PASS. `CLAUDE.md`: `Button.astro` and `spotlight.ts` in Layout.
  Commit, push, check CI.

---

### Task 6: Fixed header and the Work picker

**Files:**
- Create: `src/lib/projects.ts`, `src/components/WorkPicker.astro`, `src/motion/header.ts`,
  `src/motion/picker.ts`, `tests/e2e/header.spec.ts`, `tests/e2e/header.phone.spec.ts`,
  `tests/e2e/header.reduced.spec.ts`
- Delete: `src/components/MenuPanel.astro`
- Modify: `src/components/Nav.astro`, `src/layouts/Base.astro`, `src/pages/index.astro`,
  `src/pages/work/[slug].astro`, `src/motion/scroll.ts`, `scripts/capture-stills.mjs` (`CHROME`),
  `tests/e2e/hero.spec.ts` (`ONLY_THE_CANVAS`), `.claude/last-reviewed`, `CLAUDE.md`

**Interfaces:**
- Consumes: `formatCount` (Task 2), `canHover` (Task 3), `isWide`, `prefersReducedMotion`.
- Produces `src/lib/projects.ts`:

```ts
export type Project = CollectionEntry<'projects'>;
export function loadProjects(): Promise<{ featured: Project[]; compact: Project[]; downloads: Record<string, number> }>;
```

  Sorted by `order`; `downloads[id]` from `getModrinthDownloads` for entries with a `modrinthSlug`.
  Memoised in module scope so one build makes one Modrinth request. `index.astro`, `Base.astro`
  (route titles), `[slug].astro` and `WorkPicker.astro` all read through it; no other file calls
  `getCollection('projects')`.
- `Nav.astro`: `<header class="nav" data-header>`, `position: fixed`. `html[data-header='hidden']`
  translates it `0 -100%` (0.45 s `var(--ease-out)`). `[data-header][data-solid]` gets a
  `rgb(6 7 12 / 0.72)` backing with `backdrop-filter: blur(10px)` and a `--line` bottom border.
  "Work" becomes `<a href="/#work" data-work-toggle aria-controls="work-panel">Work</a>`, followed
  in the header by `<WorkPicker />`.
- `WorkPicker.astro`: `<div class="work-panel" id="work-panel" data-work-panel hidden>` holding
  `<ul>` rows, one `<a data-work-item={id} href=...>` per project (featured then compact) with the
  title large and a mono line of `kind ?? formatSpan(start, end)`; the href is `/work/{id}` for
  featured and `links[0].href` (Modrinth) for compact. Beside the rows
  `<div class="work-previews" aria-hidden="true">` with one `[data-work-preview={id}]` each: the
  cover `Image` for featured, and for compact the figure `formatCount(downloads[id])` large with the
  mono line `downloads on Modrinth`. Exactly one preview carries `data-active` (opacity 1, the
  others 0, 0.35 s crossfade). The preview area never moves with the pointer. Below 720 px
  `.work-previews` is `display: none`. The panel spans the header's width directly under it.
- Produces `initHeader(): () => void`: `data-solid` once `scrollY > 40`. `html[data-header=
  'hidden']` when scrolling down, `scrollY > 0.3 * innerHeight`, no focus inside the header and the
  picker closed; cleared on any upward scroll, on focus entering the header, and when the picker
  opens. Never hides under reduced motion. Teardown removes both attributes.
- Produces `initWorkPicker(): () => void`: upgrades the toggle (`role="button"`,
  `aria-expanded="false"`). Opens on toggle click, Enter or Space; on `pointerenter` of the toggle
  when `canHover() && isWide(720)`. Closes on a second toggle click, Escape (focus returns to the
  toggle), a click outside the header, focus leaving the header, any row click, and 180 ms after the
  pointer leaves the header when it was opened by hover. Open state: `panel.hidden = false`,
  `aria-expanded="true"`, `data-picker-open` on the header. `pointerenter` or `focus` on a row moves
  `data-active` to its preview; the first row is active on open. Teardown closes it and removes
  `role` and `aria-expanded`.
- `scroll.ts`: Lenis gets `anchors: true`; `getLenis` and the module-level `lenis` variable go (the
  menu and curtain that would have read them no longer exist).
- `.claude/last-reviewed`: delete the `# OPEN:` menu block; the menu it describes is gone.

- [ ] **Step 1: Failing tests**

```ts
// header.spec.ts
test('the header hides after scrolling down past 30% of the viewport and returns on scrolling up', ...)
//   mouse.wheel(0, 700) → html[data-header="hidden"], header box bottom <= 0 (poll)
//   mouse.wheel(0, -120) → no data-header, header box y === 0 (poll); [data-header] has data-solid
test('hovering Work opens the picker with three rows', ...)
//   rows toHaveText(['Stashout', 'FlameBurst', 'Server Insight']) by their title elements
//   hrefs ['/work/stashout', '/work/flameburst', 'https://modrinth.com/mod/server-insight']
test('pointing at a row shows its preview in a fixed place', ...)
//   hover FlameBurst row at two different x positions: [data-work-preview="flameburst"] has data-active
//   and opacity 1, and its boundingBox is identical both times; exactly one [data-active]
test('Server Insight previews its download figure', ...)   // preview text matches /\d+(\.\d)?k\+/ and 'downloads on Modrinth'
// Review Focus 2
test('keyboard: Enter opens, Tab reaches each row, Escape closes and returns focus to Work', ...)
//   toggle aria-expanded false → true → false; focused element after Escape is the toggle
test('the header does not hide while the picker is open or focus is inside it', ...)
test('clicking a row opens its case study with the picker closed, and the picker works there too', ...)
test('without JS Work is a link to /#work and the panel stays hidden', ...)
test('no floating menu', ...)   // [data-menu-button], [data-menu-panel] toHaveCount(0)
test('resizing 1440 -> 390 with the picker open keeps the panel inside the viewport', ...)
// header.phone.spec.ts   (Review Focus 5)
test('tapping Work opens the rows with no preview area; tapping Stashout opens its case study', ...)
test('nothing overflows sideways with the panel open', ...)   // lifted-clip scrollWidth <= 390
// header.reduced.spec.ts
test('under reduced motion the header stays put while scrolling', ...)
```

- [ ] **Step 2:** `npm run build && npx playwright test header` → FAIL (no `[data-work-toggle]`).
- [ ] **Step 3:** Implement `loadProjects` and move the three existing readers onto it; `npm run
  build` → 4 pages, and `npm run e2e` still green before any header work (a pure refactor).
- [ ] **Step 4:** Implement the header, picker and scroll changes; delete `MenuPanel.astro`.
  `grep -rn "MenuPanel\|data-menu\|menu-button\|getLenis\|getCollection('projects')" src scripts
  tests` → only the one `getCollection` in `src/lib/projects.ts`.
- [ ] **Step 5:** `npm run verify` → PASS. `CLAUDE.md`: Layout (`projects.ts`, `header.ts`,
  `picker.ts`, `WorkPicker.astro`, `Base.astro`'s row), the one-implementation table (project data
  is read only through `loadProjects`; drop the `getLenis` row). Commit, push, check CI.

---

### Task 7: Ink page transitions and the preloader

**Files:**
- Create: `src/components/InkWipe.astro`, `src/motion/wipe.ts`, `tests/e2e/transitions.spec.ts`,
  `tests/e2e/transitions.reduced.spec.ts`
- Modify: `src/layouts/Base.astro`, `scripts/capture-stills.mjs` (`CHROME`), `tests/e2e/hero.spec.ts`
  (`ONLY_THE_CANVAS`), `CLAUDE.md`

**Interfaces:**
- Consumes: `#route-titles` (already in `Base.astro`), `prefersReducedMotion`, `REDUCED_MOTION`,
  `html[data-triggers]` (from `scroll.ts`).
- `InkWipe.astro`: `<div class="wipe" data-ink-wipe data-state="idle" aria-hidden="true"
  transition:persist>` with the ink still as its background (`getImage`, width 1280, webp) over
  `var(--bg)`, and `<p class="wipe-label" data-wipe-label></p>` centred in the hero type style.
  `position: fixed; inset: 0; z-index: 90; pointer-events: none`. Custom properties `--wipe-x`,
  `--wipe-y`, `--wipe-r` (px) and a fixed feather of `14vmax`.
  - `idle`: `visibility: hidden`.
  - `covering`, `covered`: mask `radial-gradient(circle at var(--wipe-x) var(--wipe-y), #000
    calc(var(--wipe-r) - 14vmax), transparent var(--wipe-r))`. Ink grows from the point.
  - `opening`: mask `radial-gradient(circle at var(--wipe-x) var(--wipe-y), transparent
    calc(var(--wipe-r) - 14vmax), #000 var(--wipe-r))`. A clear hole grows from the point.
  - The label is visible only in `covered`.
- Preloader, in `Base.astro`'s `<head>`, an `is:inline` script, wrapped in `try`:
  `if (!sessionStorage.getItem('ag:intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.dataset.intro = ''`.
  CSS: `html[data-intro] [data-ink-wipe]` is visible with no mask and runs
  `animation: intro-failsafe 0.3s 2.2s forwards` (to `opacity: 0; visibility: hidden`). That
  animation is the only thing that lifts the cover when scripts never run.
- Produces `initInkWipe(): void` in `src/motion/wipe.ts`, called once at module load from
  `Base.astro`'s script, outside `onPage`, guarded so a second call does nothing:
  - remembers the last `pointerdown` position (capture phase, on `document`);
  - **intro:** on the first `astro:page-load`, if `'intro' in html.dataset`: store `ag:intro`,
    wait for `document.fonts.ready` but never longer than 600 ms, open from the viewport centre,
    then `delete html.dataset.intro` and go `idle`;
  - **navigation:** on `astro:before-preparation`, unless reduced motion: label = the
    `#route-titles` entry for `event.to.pathname` with any trailing slash removed (`''` when
    absent); origin = the remembered pointer position, or the viewport centre when
    `event.navigationType === 'traverse'` or the link was activated from the keyboard; then
    `const load = event.loader; event.loader = async () => { await Promise.all([cover(), load()]); }`;
  - on `astro:page-load`, when the state is `covering` or `covered`: `open()`, then `idle`;
  - `cover()`: state `covering`, tween `--wipe-r` 0 to the distance to the farthest corner plus the
    feather, 0.55 s `power2.inOut`, then `covered`. `open()`: state `opening`, same range, 0.7 s
    `power2.out`. A navigation that starts while a tween is running kills it and starts from the
    current radius;
  - **failsafe:** whenever the state leaves `idle` a 4000 ms timer forces `idle`.
- `CHROME` in `capture-stills.mjs` and `ONLY_THE_CANVAS` in `hero.spec.ts` gain `[data-ink-wipe]`,
  so the intro never lands in a captured still or a not-blank assertion.

- [ ] **Step 1: Failing tests**

```ts
// transitions.spec.ts
const wipe = (page: Page) => page.locator('[data-ink-wipe]');
const atRest = async (page: Page) => { await expect(wipe(page)).toHaveAttribute('data-state', 'idle'); await expect(wipe(page)).toBeHidden(); };

test('first load starts under the ink and opens within 1500 ms', async ({ page }) => {
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('html')).toHaveAttribute('data-intro', '');
  await page.waitForLoadState('load');
  await expect(wipe(page)).toHaveAttribute('data-state', 'idle', { timeout: 1500 });
  await expect(wipe(page)).toBeHidden();
  await expect(page.locator('[data-hero] h1')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
});
test('a reload in the same session does not show it again', ...)          // after reload at 'commit': no data-intro
test('a first visit straight to /work/flameburst also plays it once', ...)
// Review Focus 1
test('if the page scripts never load, the cover still lifts and the page is readable', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/');
  await expect(wipe(page)).toBeHidden({ timeout: 3500 });
  await expect(page.locator('[data-hero] h1')).toBeVisible();
});
test('clicking the Stashout card covers the screen from the click, labelled "Stashout", then opens the Stashout page', async ({ page }) => {
  await page.goto('/'); await atRest(page);
  const link = page.locator('#work a[href="/work/stashout"]').first();
  await link.scrollIntoViewIfNeeded();
  const box = (await link.boundingBox())!;
  const states: string[] = [];   // filled by an exposed function from a MutationObserver on data-state
  await page.mouse.click(box.x + 20, box.y + 20);
  await expect(page.locator('[data-wipe-label]')).toHaveText('Stashout');
  expect(await wipe(page).evaluate((el) => parseFloat(el.style.getPropertyValue('--wipe-x')))).toBeCloseTo(box.x + 20, 0);
  await expect(page).toHaveURL(/\/work\/stashout$/);
  await atRest(page);
  expect(states).toEqual(expect.arrayContaining(['covering', 'covered', 'opening', 'idle']));
});
// Review Focus 4
test('back then forward: cover at rest, the page scrolls, the trigger count equals a fresh load, no console errors', ...)
//   fresh = html[data-triggers] after a direct load of /work/stashout (wait for the attribute)
//   then / → click Stashout → goBack → goForward → atRest; data-triggers toBe(fresh);
//   mouse.wheel(0, 500) → scrollY > 0; collected errors toEqual([])
test('a second click while the cover is moving still ends on a page with the cover at rest', ...)
//   click the Stashout card, immediately goBack(); eventually atRest and h1 visible on whichever page is current
test('going back to the home page labels the cover "Home"', ...)
// transitions.reduced.spec.ts
test('no preloader, and navigation swaps without the cover ever leaving idle', ...)
```

- [ ] **Step 2:** `npm run build && npx playwright test transitions` → FAIL (no `[data-ink-wipe]`).
- [ ] **Step 3:** Implement `InkWipe.astro`, the inline head script and `wipe.ts`.
- [ ] **Step 4:** `npm run verify` → PASS. Every older spec now loads under the intro; a failure
  there is a real finding (the cover blocking something), not a reason to edit the older test,
  except the two hide-lists named above.
- [ ] **Step 5:** `CLAUDE.md`: the one-implementation row "Page-transition curtain |
  `src/motion/curtain.ts`" becomes "Page-transition and preloader cover | `src/motion/wipe.ts`"; the
  `onPage` non-negotiable names the wipe as the single exception and why; Danger zones gains the
  failsafe rule (a cover must lift without JS). Commit, push, check CI.

---

### Task 8: Gates: visual review, Lighthouse, docs

**Files:**
- Create: `scripts/shots.mjs`
- Modify: `.gitignore` (`shots/`), `CLAUDE.md`, `README.md`, whatever the review finds

- [ ] **Step 1: `scripts/shots.mjs`** starts `astro preview` on port 4396 (as
  `capture-stills.mjs` does), sets `sessionStorage['ag:intro']` through an init script so the intro
  does not cover the shot, and writes full-page screenshots of `/`, `/work/stashout`,
  `/work/flameburst` at 1440x900 and 390x844, each with motion and with reduced motion, to
  `shots/` (12 files), plus one of the open Work picker at each size (2 more). Scroll each page
  top to bottom once before the shot so reveals have run. Run it and look at all 14 images. Fix
  anything broken, cramped, overlapping or low-contrast; re-run until clean.
- [ ] **Step 2:** Invoke the `frontend-design` skill over the round-2 diff
  (`git diff 35b8259..HEAD -- src`). Apply what it finds that the spec allows; anything that would
  change an approved decision goes to the owner as a question, not into the code.
- [ ] **Step 3: Lighthouse** against `npm run preview`:
  `CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") npx -y
  lighthouse@13.6.0 http://localhost:4321/ --form-factor=mobile
  --only-categories=performance,accessibility --output=json --output-path=shots/lighthouse.json
  --chrome-flags="--headless=new"`. Expected: performance ≥ 90, accessibility ≥ 95. Below target:
  fix the top audit and re-run. Repeat for `/work/stashout`.
- [ ] **Step 4: Re-derive `CLAUDE.md`** against the tree: every path, script, pin, count and
  "(Task N)" marker it names is true of the tree now; the done-checklist gates include Visual and
  Lighthouse with the commands above. Update `README.md` to match.
- [ ] **Step 5:** `npm run verify` → PASS. Commit, push, check CI.

---

### Task 9: Owner copy review

- [ ] **Step 1:** Hand over, quoted in chat: the hero line, both card one-liners, Server Insight's
  line, the About paragraph, both case-study bodies, the hint and footer microcopy ("Move your
  cursor", "Tap to splash", "Contact", "Copied", "Open in your mail app"), and where the 14
  screenshots are. ⏳ until the owner answers.
- [ ] **Step 2:** Apply their edits; `npm run verify`; commit and push.

---

### Task 10: Review handoff

- [ ] **Step 1:** Report the backlog (`s=$(grep -m1 -E '^[0-9a-f]{7,40}$' .claude/last-reviewed);
  git log --oneline "$s..HEAD"`) and hand over `/codex:review --base <that sha>` with the areas to
  name: `src/motion` (teardown on page swap, the wipe's state machine and failsafe, the picker's
  focus handling), `src/ink`, `src/lib/projects.ts`, `.github/workflows`. ⏳ until the owner runs it.
- [ ] **Step 2:** Fix every real finding (see it fail first where it is a bug), `npm run verify`,
  commit, push; record the result and the reviewed-up-to sha in `.claude/last-reviewed`.

---

### Task 11: Cutover

Confirm with the owner immediately before Step 2; it changes a GitHub setting and the live site.

- [ ] **Step 1:** On `redesign`: `npm run verify` green; CI green on the branch head.
- [ ] **Step 2:** `gh api -X PUT repos/theflamebeast/theflamebeast.github.io/pages -f
  build_type=workflow`; verify with `gh api repos/theflamebeast/theflamebeast.github.io/pages --jq
  .build_type` → `workflow`.
- [ ] **Step 3:** `git checkout main && git pull --ff-only && git merge --ff-only redesign && git push
  origin main`; `gh run watch` → build and deploy jobs success.
- [ ] **Step 4: Live checks.** `curl -sI https://theflamebeast.github.io/` → 200 and the body
  contains `Anish Gupta`; `/work/stashout` and `/work/flameburst` → 200; `/CLAUDE.html` and
  `/docs/superpowers/specs/2026-11-10-portfolio-redesign-design.html` → 404 (Jekyll is gone). Open
  the live site in a headless browser: no console errors, ink running, the intro lifts. `gh workflow
  view deploy --yaml` shows the Monday `schedule`.
- [ ] **Step 5:** Update `CLAUDE.md` § Review branch to `main` and § Danger zones (the Jekyll one is
  now history); commit and push to `main`.

---

### Task 12: Archive Once Human Resources

Confirm with the owner immediately before Step 1. In this order, because an archived repo rejects
settings changes:

- [ ] **Step 1:** `gh api -X DELETE repos/theflamebeast/oh-resources/pages`
- [ ] **Step 2:** `gh repo edit theflamebeast/oh-resources --homepage ""`
- [ ] **Step 3:** `gh repo archive theflamebeast/oh-resources --yes`
- [ ] **Step 4:** `curl -s -o /dev/null -w "%{http_code}" https://theflamebeast.github.io/oh-resources/`
  → 404 (allow a few minutes for the CDN), and `gh repo view theflamebeast/oh-resources --json
  visibility,isArchived` → `PRIVATE`, `true`. No commit in this repo.

---

### Task 13: GitHub profile README

Repo `theflamebeast/theflamebeast`, local folder `C:\Users\anish\Documents\GitHub\FlameBeast`; its own
commit.

- [ ] **Step 1:** `git pull --ff-only`, then rewrite `README.md` per the first spec's "GitHub profile
  README" section: name and one line, portfolio link, Stashout and FlameBurst lines linking the
  showcase repo and the case studies, Server Insight linking Modrinth, contact GitHub, LinkedIn,
  email. Remove the view counter, the Discord badge and line, and the top-languages card. No
  interpuncts.
- [ ] **Step 2:** Every link in it returns 200 (`curl -sI`). Commit, push, view
  `https://github.com/theflamebeast` in a headless browser.
- [ ] **Step 3:** Ask the owner to pin `server-insight` next to `stashout-showcase` (no API exists). ⏳.
