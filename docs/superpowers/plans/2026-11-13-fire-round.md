# Round 3 plan: fire, frame, dots and a contact block

Design: `docs/superpowers/specs/2026-11-13-fire-round-design.md`. Branch `redesign`. Runs before
Task 8 of `2026-11-11-ink-signature.md`, whose Tasks 8 to 13 then continue unchanged (Task 8's
screenshots and Lighthouse cover this round too).

Every task: failing test first and seen failing, `npm run verify` green, look at the result in a
screenshot, commit by path, push, CI green. Same rules as round 2: no new dependencies, motion only
through `onPage`, `--ink-live` and the accent are fills, lines or glows and never text.

## Task R1: Fire colours

- `src/ink/palette.ts`: the hue arc becomes deep red to amber (`HUE_START` just below 0, wrapping,
  `HUE_SPAN` about 0.13); `hsvToRgb` already wraps negative hues. Rename the constants and comments
  that say cyan or pink (`INK_HUE_START_MS` is "the red end of the cycle").
- `--ink-live` resting value in `tokens.css` becomes the new arc's midpoint at saturation 0.6.
- `--accent` becomes an ember orange and `--accent-ink` dark (`--bg`); global focus ring, skip
  link, case-study active states and both diagrams follow the tokens.
- Unit: the arc stays inside red to amber for any time and rand; dark text on the live colour
  stays at least 4.5:1 across 1000 points (existing test, new range); dark text on the accent at
  least 4.5:1.
- Recapture `src/assets/ink-still.webp` and `public/og.png` with `scripts/capture-stills.mjs`
  and look at both. The transition cover uses the still, so it turns fire with it.
- CLAUDE.md: the accent and `--ink-live` convention lines, `palette.ts` row.

## Task R2: Hold for bright ink

- `src/ink/fluid.ts`: `press(x, y)` and `release()`. While pressed, every frame splats bright ink
  (the click ring's intensity) at the pointer, moving or not; `pointer()` keeps the press position.
- `Hero.astro`: mouse `pointerdown` with the left button presses (the click ring still fires);
  `pointerup`, `pointercancel`, `pointerleave` and window `blur` release. Touch never presses.
- E2E: holding the button for 600 ms without moving makes the canvas brighter than a single click
  does (mean brightness of the canvas, sharp); a touch tap does not press.

## Task R3: Side lines

- `ScrollProgress.astro` gains two fixed 1 px vertical lines, left and right edges, in
  `var(--ink-live)` with a faint glow, `pointer-events: none`, under the header and cover.
- E2E: both lines exist at 1440 and 390, each at most 1 px wide, at the viewport edges, and the
  page still has no sideways overflow at 390.

## Task R4: Contact block

- `Footer.astro`: under the email headline, one short invitation line and a three-tile grid:
  Email (copy, and the mail link), LinkedIn, GitHub; inline SVG icons, mono uppercase labels,
  the handle as the value. Two columns from 720 px, one below. `copy.ts` handles both the
  headline and the Email tile (one implementation).
- E2E: three tiles with the right hrefs; clicking the Email tile copies and says Copied; no JS
  leaves mailto; the guards spec still passes (no phone number, no third-party hosts).

## Task R5: Dot type

- `src/motion/dots.ts` (`initDotType`): for every `[data-dots]` heading, a canvas over it draws
  the heading's text as a grid of dots in `--text`, swept aside by the pointer and springing back;
  fast dots take the live colour. Runs only while the heading is on screen and the pointer has
  moved recently; idle, it draws once and stops. Under reduced motion, without JS, or when the
  canvas cannot start, nothing is added and the heading is ordinary type.
- The heading text stays in the DOM (transparent while the dots are up), so its accessible name
  and layout never change. Hero name and case-study titles get `data-dots`.
- E2E: the canvas exists and covers the heading; the heading's accessible name is unchanged;
  moving the pointer across it changes the canvas pixels; reduced motion and no-JS show the text
  with no canvas; leaving and returning leaves exactly one canvas per heading.

## Task R6: Architecture link

- `src/content/projects/flameburst.md`: a link labelled "Architecture" to
  `https://www.flameburst.net/architecture`. Check it returns 200 before committing.
- E2E: the FlameBurst case study has that link.
