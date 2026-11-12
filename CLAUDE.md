# Anish Gupta portfolio

The owner's portfolio site, `https://theflamebeast.github.io/`, a static Astro site served by GitHub
Pages from this **public** repo (`theflamebeast/theflamebeast.github.io`). Its readers are recruiters
and engineers.

It is being rebuilt from the old hand-written page on branch `redesign`, following:

- Design: `docs/superpowers/specs/2026-11-10-portfolio-redesign-design.md` (the authority)
- Plan: `docs/superpowers/plans/2026-11-10-portfolio-redesign.md` (15 tasks; `main` keeps the old
  site until the Task 13 cutover)

Paths below marked "(Task N)" don't exist yet; that task creates them.

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
- **Site facts live only in `src/data/site.ts`**; project facts only in the `projects` content
  collection, whose schema fails the build on broken data (a featured project without a cover stops
  `npm run build` with `featured projects need a cover`).

## Layout

| Path | What it is |
|---|---|
| `src/pages/` | routes: `index.astro`, `work/[slug].astro` (one case study per featured project), `404.astro` |
| `src/assets/projects/<id>/` | case-study images, only ever written by `scripts/import-image.mjs` |
| `src/content/`, `src/content.config.ts` | the `projects` collection; `schema.ts` holds `makeProjectSchema`, testable without Astro |
| `src/data/site.ts` | name, links, education, skills, certs |
| `src/lib/` | pure helpers: `modrinth.ts` (build-time download count with a fallback), `format.ts` (`formatSpan`), `clock.ts` (`formatLocalTime`, Eastern by default) |
| `src/ink/` | the WebGL2 fluid simulation: `fluid.ts` (solver, start/stop, context loss), `shaders.ts`, `palette.ts` (the cyan-to-pink hue), `size.ts` (canvas pixel cap, grid size) |
| `src/assets/ink-still.webp` | the hero's still: shown without JS or WebGL, under reduced motion, and under the canvas until it fades in |
| `src/motion/` | every scroll, hover and navigation effect: `lifecycle.ts` (`onPage`), `prefs.ts` (reduced motion, `isWide`), `scroll.ts` (Lenis on the GSAP ticker, `getLenis`, `html[data-triggers]`), `reveal.ts`, `scrub.ts` (rows, `[data-parallax]`, `[data-rotate]`, footer curve; 720 px and up only), `clock.ts`, `video.ts` (the case-study clip's pause button); all started from one `onPage` in `Base.astro`. Magnetic, menu, preloader and curtain arrive in Tasks 8 and 9 |
| `src/layouts/Base.astro` | every page's shell: meta, `ClientRouter`, nav, menu, footer, `#route-titles` |
| `src/components/` | one `.astro` file per section or widget; DOM hooks for motion are `data-*` attributes only |
| `src/styles/` | `tokens.css` (the only colour, type and spacing values) and `global.css` (fonts, reset) |
| `public/favicon.svg` | the "AG" monogram |
| `public/og.png` | the Open Graph image, 1200x630, captured from the live hero |
| `public/media/` | the Stashout raid clip, 12 s, no audio, as `.webm` (VP9) and `.mp4` (H.264); its poster lives in `src/assets/projects/stashout/` |
| `scripts/` | `vitest.mjs` (drive-letter launcher), `import-image.mjs` + `media-rules.mjs` (guarded image import), `capture-stills.mjs` (rewrites `ink-still.webp` and `og.png` from a fresh build: `npm run build && node scripts/capture-stills.mjs --seed N`, then look at both); screenshots arrive in Task 10 |
| `tests/unit/` | Vitest |
| `tests/e2e/` | Playwright: `*.spec.ts` desktop, `*.phone.spec.ts` phone, `*.reduced.spec.ts` reduced motion |
| `.github/workflows/deploy.yml` | CI on every push; deploys to Pages only from `main` |
| `docs/superpowers/` | the design, the plan, and the approved ink prototype |

## Conventions

- **Identity:** the owner's name is the brand. No "FlameBeast" logo, name or handle in the UI, and
  no YouTube, Twitch or guns.lol links. Contact links are GitHub, LinkedIn and email only.
  `theflamebeast` appears only inside the `github.com/theflamebeast` and `theflamebeast.github.io`
  URLs.
- **Projects shown are exactly three:** Stashout and FlameBurst as case studies, Server Insight as a
  compact card. Adding one is a design decision for the owner, not an edit.
- **The accent `#2f6cf0` is a fill, never text.** On `--bg` it measures 4.34:1, below WCAG AA for
  body text; white on the accent is 4.64:1. Muted text (`#8a93a3`) is 6.5:1 on `--bg`.
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
| Smooth scroll and the Lenis instance | `src/motion/scroll.ts` (`getLenis()`; never a second `new Lenis`) |
| Media queries for motion | `src/motion/prefs.ts` (`REDUCED_MOTION`, `wideQuery`, `isWide`) |
| Page-transition curtain | `src/motion/curtain.ts` |
| Project data | the `projects` collection |
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
- **Until cutover, `main` still runs the legacy Pages build:** Jekyll over the root of `main`, which
  publishes every Markdown file as a page. `_config.yml` on `main` excludes `docs` and the instruction
  files; it was deleted on `redesign`, where Actions deploys and Jekyll never runs.
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

### Done-checklist gates

**Typecheck, Unit, Build, E2E**, plus **Visual** (screenshots looked at) and **Lighthouse** once
Task 10's scripts exist, then the standard tail: Review, Committed, Pushed, CI (the `deploy` workflow
run for that commit), and **Live** (after cutover: the site returns 200).

```
✅ Typecheck — npm run check, 0 errors
✅ Unit — npm test, 14 passed
✅ Build — npm run build, 3 pages
✅ E2E — npm run e2e, 21 passed
⏳ Review — owner-run; self-reviewed the diff
✅ Committed — <sha>
✅ Pushed — origin/redesign
✅ CI — deploy workflow, build job success
```

### Review

The gate itself is `# The review gate` in `~/.claude/CLAUDE.md`. Local facts:

- The marker in `.claude/last-reviewed` starts at `50f65ff`, a **baseline**, not a review.
- Default `/code-review medium`. The areas worth naming are `src/ink`, `src/motion`, `src/content`
  and `.github/workflows`; `.md` files and `docs/` rarely repay a billed run.
- Branch `redesign` until the cutover merges it into `main`; after that, `main`, committed straight
  to it.
