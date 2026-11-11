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
- **Motion mounts and tears down only through `onPage`** (`src/motion/lifecycle.ts`, Task 6), because
  `ClientRouter` swaps pages without a reload and a module that listens for anything else leaks.
- **Site facts live only in `src/data/site.ts`** (Task 2); project facts only in the `projects`
  content collection.

## Layout

| Path | What it is |
|---|---|
| `src/pages/` | routes: `index.astro`, `work/[slug].astro` (Task 4), `404.astro` (Task 4) |
| `src/content/`, `src/content.config.ts` | the `projects` collection and its schema (Task 2) |
| `src/data/site.ts` | name, links, education, skills, certs (Task 2) |
| `src/ink/` | the WebGL fluid simulation (Task 6) |
| `src/motion/` | every scroll, hover and navigation effect (Tasks 6 to 9) |
| `src/components/`, `src/layouts/`, `src/styles/` | markup and tokens (Task 3) |
| `scripts/` | image import, still capture, screenshots (Tasks 4, 6, 10) |
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

### One implementation per thing

| Concern | The only place |
|---|---|
| Fluid simulation | `src/ink/fluid.ts` |
| Mount and teardown of any client script | `onPage` in `src/motion/lifecycle.ts` |
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
- **Until cutover, `main` still runs the legacy Pages build:** Jekyll over the root of `main`, which
  publishes every Markdown file as a page. `_config.yml` on `main` excludes `docs` and the instruction
  files; it was deleted on `redesign`, where Actions deploys and Jekyll never runs.
- **Verification links can carry personal data.** The old site's Badgr certificate link had
  `?identity__email=<the owner's email>` on it. Strip query strings from any credential link.
- **A link to a path that never existed** sat on the old site for months: `/ohresources`, while the
  Once Human site actually lived at `/oh-resources/`. Check every internal link returns 200.
- **The headless browser (Playwright MCP) writes `.playwright-mcp/` into the repo root** whenever a
  session drives a browser from here. It happened twice on 2026-11-10; it is now gitignored.
- **Playwright waits forever on a 404 home page.** Its `webServer` only counts the server as ready on
  a non-404 status, so a build with no `/` shows up as a 60 s timeout, not a test failure.

## Workflow

### Build, test, run

| Command | What it proves |
|---|---|
| `npm ci` | install from the lockfile |
| `npm run dev` | local dev server |
| `npm run check` | `astro check`: types across `.astro` and `.ts` |
| `npm test` | Vitest unit tests |
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
