# Anish Gupta portfolio

The owner's portfolio site, `https://theflamebeast.github.io/`, a static Astro site served by GitHub
Pages from this **public** repo (`theflamebeast/theflamebeast.github.io`). Its readers are recruiters
and engineers.

It replaced the old hand-written page at the cutover on 2026-11-14 (Pages now builds through Actions,
from `main`). The rebuild followed:

- Design: `docs/superpowers/specs/2026-11-10-portfolio-redesign-design.md`, amended by
  `docs/superpowers/specs/2026-11-11-ink-signature-design.md` (round 2) and
  `docs/superpowers/specs/2026-11-13-fire-round-design.md` (round 3); where they disagree the newest
  wins
- Plan: `docs/superpowers/plans/2026-11-11-ink-signature.md` (13 tasks). Its Tasks 1 to 8 and
  Task 11 (the cutover) are done, and `2026-11-13-fire-round.md` (Tasks R1 to R6) is done; Tasks 9
  (owner copy review), 10 (Codex review), 12 and 13 remain. `2026-11-14-round-4.md` (Tasks R7 to
  R9: the next-project cover always shown, link labels and a `stashout.io` button, removing the ink
  cover from page changes and the first visit) is done too. The first plan,
  `2026-11-10-portfolio-redesign.md`, built Tasks 1 to 7 and is history from there on.

Shared workflow rules: ~/.claude/CLAUDE.md § Every repo. This file only holds what is local.

## Blast radius

Everything committed is world-readable, and anything on `main` is live within a minute. So:

- **Never name the owner's other private projects** in any file here. The site covers exactly three
  projects (Stashout, FlameBurst, Server Insight); that list is public, nothing else is.
- **No phone number, no secrets, no private repo links.** The resume holds a phone number; it never
  comes here. `tests/e2e/guards.spec.ts` scans every built file for phone-shaped strings, the old
  brand, gaming links, third-party font hosts and the interpunct.

## Tech stack

- **Astro 7.4.2**, static output. Needs **Node >= 22.23.4** (`.nvmrc`).
- **TypeScript 6.0.3**, not 7: `@astrojs/check` 0.9.12 accepts only TS 5 or 6.
- GSAP 3.15.0 (ScrollTrigger, SplitText ship in the package), Lenis 1.3.27, Fontsource Geist Sans
  and Geist Mono 5.3.0, sharp 0.35.5.
- Tests: Vitest 4.1.12 (unit), Playwright 1.64.1 (end to end, against `astro preview`).
- Every pin is exact and was the newest release at least two weeks old when chosen. The plan's
  Global Constraints record why each was picked.

## Architecture non-negotiables

- **Static output only.** No server, no runtime API calls (the Modrinth download count is fetched at
  build time, with a fallback).
- **The page is complete without JS, without WebGL and under reduced motion.** Effects layer on top
  of content that is already there; reveal start states are applied by JS only.
- **Motion mounts and tears down only through `onPage`** (`src/motion/lifecycle.ts`), because
  `ClientRouter` swaps pages without a reload and a module that listens for anything else leaks.
  No exceptions (the page-transition cover that once was one is gone).
- **Site facts live only in `src/data/site.ts`**; project facts only in the `projects` content
  collection, whose schema fails the build on broken data (a featured project without a cover stops
  `npm run build` with `featured projects need a cover`). Pages and components read it only through
  `loadProjects()` (`src/lib/projects.ts`), which also fetches the download count once per build.

## Layout

| Path | What it is |
|---|---|
| `src/pages/` | routes: `index.astro`, `work/[slug].astro` (one case study per featured project), `404.astro` |
| `src/assets/projects/<id>/` | case-study images, only ever written by `scripts/import-image.mjs` |
| `src/content/`, `src/content.config.ts` | the `projects` collection; `schema.ts` holds `makeProjectSchema`, testable without Astro |
| `src/data/site.ts` | name, links, education, skills, certs |
| `src/lib/` | helpers: `projects.ts` (`loadProjects`, the one reader of the collection, sorted and split into featured and compact, with download counts; cached per build), `modrinth.ts` (build-time download count with a fallback), `format.ts` (`formatSpan`, `formatCount`), `clock.ts` (`formatLocalTime`, Eastern by default) |
| `src/ink/` | the WebGL2 fluid simulation: `fluid.ts` (solver, start/stop, context loss, `press`/`release`: holding the mouse button pours bright ink), `shaders.ts`, `palette.ts` (the fire hue, red through orange to amber, and `liveInkRgb` for the page accent), `size.ts` (canvas pixel cap, grid size) |
| `src/assets/ink-still.webp` | the hero's still: shown without JS or WebGL, under reduced motion, and under the canvas until it fades in |
| `src/motion/` | every scroll, hover and navigation effect: `lifecycle.ts` (`onPage`), `prefs.ts` (reduced motion, `isWide`, `HOVER`, `canHover`), `scroll.ts` (Lenis on the GSAP ticker; same-page `#` links glide through its own `<body>` click handler, `html[data-triggers]`), `header.ts` (`initHeader`: `data-solid` past 40 px, `html[data-header-hidden]` on scrolling down past 30% of the viewport, never while the picker is open, focus is inside or under reduced motion), `picker.ts` (`initWorkPicker`: opens on hover at 720 px and up, click, tap, Enter or Space; Escape returns focus to Work), `accent.ts` (`--ink-live`, the page accent), `reveal.ts`, `dots.ts` (`initDotType`: every `[data-dots]` heading, the hero name and case-study titles, drawn as a dot grid the pointer sweeps aside; the real text stays in the page, transparent while the dots are up; stops drawing once settled; nothing under reduced motion), `scrub.ts` (rows and `[data-parallax]`; 720 px and up only), `copy.ts` (click the footer's Email tile to copy the address), `spotlight.ts` (the project cards' cursor light; hover screens only), `clock.ts`, `video.ts` (the case-study clip's pause button); all started from one `onPage` in `Base.astro` |
| `src/components/Button.astro` | the one button: ink-wash hover, no lean; `.btn`, `.btn-fill`, `.btn-text` |
| `src/components/Footer.astro` | the "Contact" headline with its ink sweep on hover, an invitation line, three contact tiles (Email copies the address and says "Copied", LinkedIn, GitHub; inline outline icons; the address appears only in the Email tile), and the glowing top edge |
| `src/components/Frame.astro` | the frame drawn in the live colour: 1 px lines down both viewport edges with a faint inward glow (no line along the top) |
| `src/components/Nav.astro` | the fixed header; "Work" is a link to `/#work` until `picker.ts` upgrades it to the picker's toggle |
| `src/components/WorkPicker.astro` | the panel under the header: one row per project (featured to its case study, compact to its first link) and a fixed preview area beside them, hidden below 720 px |
| `src/layouts/Base.astro` | every page's shell: meta, `ClientRouter` (pages swap instantly, no cover and no animation), the frame, header with the Work picker, footer |
| `src/components/` | one `.astro` file per section or widget; DOM hooks for motion are `data-*` attributes only |
| `src/styles/` | `tokens.css` (the only colour, type and spacing values) and `global.css` (fonts, reset) |
| `public/favicon.svg` | the "AG" monogram |
| `public/og.png` | the Open Graph image, 1200x630, captured from the live hero |
| `public/media/` | the Stashout raid clip, 12 s, no audio, as `.webm` (VP9) and `.mp4` (H.264); its poster lives in `src/assets/projects/stashout/` |
| `scripts/` | `vitest.mjs` (drive-letter launcher), `import-image.mjs` + `media-rules.mjs` (guarded image import), `capture-stills.mjs` (rewrites `ink-still.webp` and `og.png` from a fresh build: `npm run build && node scripts/capture-stills.mjs --seed N`, then look at both), `shots.mjs` (`npm run build && node scripts/shots.mjs`: full-page screenshots of every page at 1440 and 390, with and without reduced motion, plus the open Work picker, 14 files in the gitignored `shots/`; look at every one) |
| `tests/unit/` | Vitest |
| `tests/e2e/` | Playwright: `*.spec.ts` desktop, `*.phone.spec.ts` phone, `*.reduced.spec.ts` reduced motion |
| `.github/workflows/deploy.yml` | CI on every push, and every Monday to refresh the download figure; deploys to Pages only from `main` |
| `docs/superpowers/` | the design, the plan, and the approved ink prototype |

## Conventions

- **Identity:** the owner's name is the brand. No "FlameBeast" logo, name or handle in the UI, and
  no YouTube, Twitch or guns.lol links. Contact links are GitHub, LinkedIn and email only.
  `theflamebeast` appears only inside the `github.com/theflamebeast` and `theflamebeast.github.io`
  URLs.
- **Project buttons** (`links` in the project's front matter): the project's own site first, named
  by its domain with no status note (`stashout.io`, `flameburst.net`), then `Architecture` (the same
  label on both case studies). `liveUrl` renders a "Play" button; leave it unset until the game can
  be played. Any new outside host goes on the allowed list in `tests/e2e/guards.spec.ts`.
- **Projects shown are exactly three:** Stashout and FlameBurst as case studies, Server Insight as a
  compact card. Adding one is a design decision for the owner, not an edit.
- **`--ink-live` is a fill, line or glow, never text.** `initLiveAccent` writes it on `<html>` every 200 ms from the ink's hue (saturation 0.6, value 1), on the same clock as the hero's ink; under reduced motion the token keeps its resting value. Dark text on it measures at least 4.5:1 through the whole cycle (a unit test checks 1000 points).
- **The accent `#f06a2a` (ember) is a fill, focus ring or line, never text.** Anything on it is
  dark: `--accent-ink` is `--bg`, 6.52:1 (a unit test reads the token and checks at least 4.5:1).
  White on it is only 3.09:1, so never put white on the accent. Muted text (`#8a93a3`) is 6.5:1 on
  `--bg`.
- **Media rules** (`scripts/media-rules.mjs`, enforced by `import-image.mjs`): nothing AI-generated
  (`Whisk`, `Gemini`) is ever presented as real footage, nothing from a `Technical` folder (admin,
  console, DNS), no `admin-*` or `auth` screens. Beyond what the script can check, **look at every
  image before importing it**: no readable player names (FlameBurst's leaderboard holograms, Stashout's
  leaderboard, which also shows the old handle) and no third-party usernames. Every cover and gallery
  image needs alt text; the schema refuses an empty one.
- **Geist Mono, small and uppercase, is for metadata only** (the hero line, years, stack). Section
  headings are sentence-case Geist Sans. Never the interpunct; separate items with spacing.

### One implementation per thing

| Concern | The only place |
|---|---|
| Fluid simulation | `src/ink/fluid.ts` |
| Mount and teardown of any client script | `onPage` in `src/motion/lifecycle.ts` |
| Smooth scroll and the Lenis instance | `src/motion/scroll.ts` (never a second `new Lenis`) |
| Media queries for motion | `src/motion/prefs.ts` (`REDUCED_MOTION`, `wideQuery`, `isWide`) |
| Project data | the `projects` collection, read only through `loadProjects()` in `src/lib/projects.ts` |
| Site facts | `src/data/site.ts` |
| Importing an image into `src/assets` | `scripts/import-image.mjs` (enforces the media rules) |

## Danger zones

Each one happened.

- **npm 10 can't add or upgrade a dependency here.** npm 10.9.9 crashes with `Cannot read properties
  of null (reading 'edgesOut')` while resolving Vitest's optional browser-runner peers. Use
  `npx -y npm@11.21.1 install ...` to change dependencies. `npm ci` on npm 10 works from the
  lockfile, so CI and fresh clones are fine.
- **Vitest crashes from a lowercase drive letter.** With the cwd at `c:\...` (this happens in VS Code
  terminals and in Claude Code's shell), Vite loads Vitest's runner twice and every `describe()`
  throws `Cannot read properties of undefined (reading 'config')`, even for `expect(1).toBe(1)`.
  Setting `root` in `vitest.config.ts` does not help. `npm test` therefore runs
  `scripts/vitest.mjs`, which upper-cases the drive before starting Vitest; never call `npx vitest`
  directly here.
- **Pages used to run Jekyll over the root of `main`** (the legacy build), which published every
  Markdown file as a page. The cutover set the Pages build type to `workflow` and deleted
  `_config.yml`, so Actions deploys `dist/` and Jekyll never runs. Keep the build type on
  `workflow`: switching it back would publish `CLAUDE.md` and `docs/` as pages again.
- **Verification links can carry personal data.** The old site's Badgr certificate link had
  `?identity__email=<the owner's email>` on it. Strip query strings from any credential link.
- **A link to a path that never existed** sat on the old site for months: `/ohresources`, while the
  Once Human site actually lived at `/oh-resources/`. Check every internal link returns 200.
- **The headless browser (Playwright MCP) writes `.playwright-mcp/` into the repo root** whenever a
  session drives a browser from here. It happened twice on 2026-11-10; it is now gitignored.
- **An overflow test can't see overflow on its own here.** `html` and `body` clip `overflow-x`, so
  `scrollWidth` hides a too-wide element, and Playwright's mobile emulation zooms out to fit
  overflow, so `innerWidth` grows with it. The footer's curved edge made the page 429 px wide at a
  390 px viewport while the first version of the phone test passed. `home.phone.spec.ts` lifts the
  clip and compares against the configured viewport width; keep it that way.
- **Stirring the ink from Playwright's mouse came out black 4 times in 6.** Each `mouse.move` is a
  round trip; when they stretched past the sim's 120 ms pointer gap, every stroke was dropped. The
  capture now dispatches the strokes in the page once per frame, and refuses to write a still whose
  brightest channel averages under 28 (stirred 40 to 47, missed 16 to 20).
- **`page.clock.runFor` on the home page times out.** It steps every animation frame, and the ink
  sim renders WebGL on each, so a simulated minute outlasts the 30 s test timeout; the failure then
  reads as an empty element, not a timeout. Use `page.clock.fastForward` to move time.
- **The router crossfades unless told not to.** `ClientRouter` animates every swap with the
  browser's view transition; mid-swap it once blended a snapshot of the new page through the old
  ink cover. `global.css` sets every `::view-transition-*` animation to `none`, so the swap is
  instant; keep it there (`navigation.spec.ts` samples the animations through a navigation, and
  fails without the rule). Not `skipTransition()`: that leaves the router's promises rejecting with
  an unhandled `AbortError` on every navigation.
- **Anything that covers content at load must lift without JS.** The old ink preloader was set by an
  inline `<head>` script and only a CSS animation could lift it when the page's scripts never
  arrived. It is gone (round 4); `navigation.spec.ts` blocks every `.js` file and checks nothing
  covers the page.
- **Same-page `#` links broke two ways at once.** Lenis's `anchors` option scrolls on any matching
  click even when other code cancelled it (the Work toggle scrolled to `#work` while opening the
  picker), and the router's own same-page hash handling restores the old scroll position, so
  "About" changed the URL and stayed at the top. `scroll.ts` claims those clicks on `<body>`
  instead: after handlers on the link itself, before the router on `document`. Cancelling the click
  also cancelled the browser's focus move, so "Skip to content" left the next Tab in the header;
  the handler now focuses the target (`tabindex="-1"` where it isn't focusable).
- **The hero name was invisible for a day, live.** While the dots are up the real heading is
  transparent, so a blank dot canvas means no name at all. Resizing a canvas clears it, and the
  start-up `ResizeObserver` callback rebuilt the dots before anything was awake to repaint them; the
  tests only asked that a canvas existed. `build()` in `dots.ts` now paints its own result, and
  `dots.spec.ts` counts painted pixels. Look at the hero in a screenshot after any change there.
- **Playwright waits forever on a 404 home page.** Its `webServer` only counts the server as ready on
  a non-404 status, so a build with no `/` shows up as a 60 s timeout, not a test failure.

## Workflow

### Build, test, run

| Command | What it proves |
|---|---|
| `npm ci` | install from the lockfile |
| `npm run dev` | local dev server |
| `npm run check` | `astro check`: types across `.astro` and `.ts` |
| `npm test` | Vitest unit tests, through `scripts/vitest.mjs` (see Danger zones); pass a file path to run one |
| `npm run build` | static build into `dist/` |
| `npm run e2e` | Playwright against `npm run preview` on `:4321`; needs a fresh `dist/` and `npx playwright install chromium` once |
| `npm run verify` | all four above, in order |
| `node scripts/shots.mjs` | the visual gate: 14 screenshots in `shots/` (build first) |
| `CHROME_PATH=<playwright's chromium> npx -y lighthouse@13.6.0 http://localhost:4321/ --form-factor=mobile --only-categories=performance,accessibility --output=json --output-path=shots/lh.json --chrome-flags="--headless=new"` | the Lighthouse gate, against `npm run preview`; repeat for `/work/stashout/`. Not a dependency: `npx` fetches it |

### Done-checklist gates

**Typecheck, Unit, Build, E2E**, plus **Visual** (`node scripts/shots.mjs`, every shot looked at)
and **Lighthouse** (mobile; accessibility at least 95 everywhere, performance at least 90 on the case
studies) for a change to what a page looks like or loads, then the standard tail: Review, Committed,
Pushed, CI (the `deploy` workflow run for that commit), and **Live** (the site returns 200).

Lighthouse on `/` is the exception to 90: headless Chrome renders the ink in software GL, which
costs about 1.9 s of blocking time that a real GPU does not pay (home scored 72, ink off 81, a much
cheaper sim 80; 76 once the ink cover was removed in round 4; the case studies score 97 to 100). Judge home by the ink-off number and the audits,
not the headline.

```
✅ Typecheck — npm run check, 0 errors
✅ Unit — npm test, 69 passed
✅ Build — npm run build, 4 pages
✅ E2E — npm run e2e, 124 passed (after round 4)
✅ Visual — node scripts/shots.mjs, 14 shots looked at
✅ Lighthouse — mobile: /work/stashout 97 performance, 100 accessibility
⏳ Review — owner-run; self-reviewed the diff
✅ Committed — <sha>
✅ Pushed — origin/main
✅ CI — deploy workflow, build job success
✅ Live — https://theflamebeast.github.io/ returns 200
```

### Review

The gate itself is `# The review gate` in `~/.claude/CLAUDE.md`. Local facts:

- The marker in `.claude/last-reviewed` is the sha last reviewed (it began at `50f65ff`, a baseline).
  Codex has reviewed five times and found every real bug a review caught here (6); the `# OPEN:`
  blocks are findings not yet fixed.
- Default `/code-review medium`. The areas worth naming are `src/ink`, `src/motion`, `src/content`
  and `.github/workflows`; `.md` files and `docs/` rarely repay a billed run.
- Branch `main`, committed straight to it (the `redesign` branch was fast-forwarded into `main` at
  the cutover). A push to `main` deploys once the build job passes.
