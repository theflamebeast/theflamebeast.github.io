# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written `index.html` with an Astro portfolio: a live ink-fluid hero, a
scroll/hover/navigation motion system, a dark theme, and three projects (two case studies), deployed to
GitHub Pages by Actions.

**Architecture:** Static Astro site. Project content lives in a schema-checked content collection; site
facts live in one data module. Astro's `ClientRouter` handles navigation so a persistent curtain can
animate between pages; every motion module mounts on `astro:page-load` and tears down on
`astro:before-swap` through one lifecycle helper. The ink simulation is a self-contained WebGL2 module
over a pre-rendered still, so the page is complete with no JS, no WebGL, or reduced motion.

**Tech Stack:** Astro 7, TypeScript 6, GSAP (ScrollTrigger, SplitText), Lenis, Fontsource Geist, sharp,
Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-10-portfolio-redesign-design.md`. Read it first; this plan
argues from it and does not repeat its rationale.

## Global Constraints

- Work on branch `redesign`, created from `main` at `59dca97`. Push it after every task. Nothing merges to
  `main` until Task 13.
- Exact dependency pins (`npm i -E`), each the newest release published on or before 2026-10-27:
  `astro@7.4.2`, `@astrojs/check@0.9.12`, `typescript@6.0.3` (`@astrojs/check` rejects TS 7),
  `gsap@3.15.0`, `lenis@1.3.27`, `@fontsource/geist-sans@5.3.0`, `@fontsource/geist-mono@5.3.0`,
  `sharp@0.35.5`, `vitest@4.1.12`, `@playwright/test@1.64.1`. Lighthouse is run with `npx -y
  lighthouse@13.6.0`, not installed.
- Node `22.23.4` (Astro 7 needs `>=22.23.4`); `.nvmrc` holds `22.23.4`.
- Actions: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-pages-artifact@v5`,
  `actions/deploy-pages@v5`.
- Font families are `'Geist Sans'` and `'Geist Mono'` (Fontsource's names), weights 400, 500, 700.
- Never the interpunct U+00B7 in any built file. No phone number. No `identity__email`. No
  "FlameBeast", no YouTube, Twitch or guns.lol. `theflamebeast` appears only inside
  `github.com/theflamebeast` and `theflamebeast.github.io` URLs.
- Never name the owner's other private projects in any file in this repo (it is public). The three
  projects, their public links, and the local path of the Stashout checkout used in Task 5 are fine.
- Every task updates `CLAUDE.md` in the same commit when it adds a command, a convention, a file area
  or a danger zone.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **JavaScript disabled or a script throws:** every heading, card and paragraph is still visible
   (reveal start states are applied by JS only). Test owned by Task 3, re-run in Task 7.
2. **Back and forward after client-side navigation:** the page scrolls normally, the curtain is
   hidden at rest, and the number of live ScrollTriggers equals a fresh load of that page (no
   duplicates). Test owned by Task 9.
3. **Resizing from desktop to phone width mid-session:** no horizontal page scroll, the ink canvas
   resizes, the marquee has no gap. Test owned by Task 7.
4. **A touch user drags on the hero:** the page scrolls; the hero never captures the gesture. Test
   owned by Task 6.
5. **No WebGL2 (or no float render targets):** the still ink frame shows, no console errors, no
   blank hero. Test owned by Task 6.

---

## File Structure

```
.nvmrc  .gitignore  package.json  package-lock.json  astro.config.mjs  tsconfig.json
vitest.config.ts  playwright.config.ts  README.md  CLAUDE.md  AGENTS.md  .claude/last-reviewed
.github/workflows/deploy.yml
public/favicon.svg  public/og.png  public/media/stashout-raid.mp4  public/media/stashout-raid.webm
scripts/import-image.mjs   scripts/media-rules.mjs   scripts/capture-stills.mjs   scripts/shots.mjs
src/data/site.ts                 site facts: name, links, education, skills, certs (one source)
src/content.config.ts            the `projects` collection
src/content/schema.ts            makeProjectSchema (testable without Astro)
src/content/projects/{stashout,flameburst,server-insight}.md
src/lib/modrinth.ts              build-time download count with fallback
src/lib/clock.ts                 formatLocalTime
src/ink/palette.ts               hsvToRgb, inkHue, inkColor
src/ink/shaders.ts               GLSL sources
src/ink/fluid.ts                 createInkFluid, INK_PARAMS
src/motion/lifecycle.ts          onPage (the only mount/teardown path)
src/motion/prefs.ts              prefersReducedMotion, isTouch, isWide
src/motion/scroll.ts             Lenis + ScrollTrigger wiring
src/motion/reveal.ts  scrub.ts  marquee.ts  magnetic.ts  menu.ts  clock.ts  preloader.ts  curtain.ts
src/styles/tokens.css  src/styles/global.css
src/layouts/Base.astro
src/components/{Nav,MenuPanel,Hero,ProjectCard,CompactCard,ScreenshotRows,About,TalkMarquee,
  Footer,Curtain,Preloader,MagneticButton,NetcodeDiagram,NetworkDiagram,Gallery}.astro
src/pages/index.astro  src/pages/work/[slug].astro  src/pages/404.astro
src/assets/ink-still.webp  src/assets/projects/stashout/*.webp  src/assets/projects/flameburst/*.webp
tests/unit/*.test.ts       Vitest
tests/e2e/*.spec.ts        Playwright, desktop project
tests/e2e/*.phone.spec.ts  Playwright, phone project
tests/e2e/*.reduced.spec.ts Playwright, reduced-motion project
```

---

### Task 1: Branch, scaffold, tooling, workflow files, CI

**Files:**
- Delete: `index.html`, `FB 3 NO BG - 64p.png`, `favicon.ico`, `github_icon.png`,
  `microsoft-office-specialist-*.png` (4 files)
- Create: `.nvmrc`, `.gitignore`, `package.json`, `astro.config.mjs`, `tsconfig.json`,
  `vitest.config.ts`, `playwright.config.ts`, `src/pages/index.astro` (placeholder),
  `tests/e2e/smoke.spec.ts`, `tests/e2e/guards.spec.ts`, `.github/workflows/deploy.yml`,
  `CLAUDE.md`, `AGENTS.md`, `.claude/last-reviewed`
- Modify: `README.md`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview` (`astro preview --port 4321`), `check`
  (`astro check`), `test` (`vitest run`), `e2e` (`playwright test`), `verify` (`npm run check && npm
  test && npm run build && npm run e2e`). Playwright projects named `desktop` (1440x900), `phone`
  (390x844, `isMobile`, `hasTouch`) and `reduced` (1440x900, `reducedMotion: 'reduce'`), matched by
  file suffix as in File Structure; `webServer` runs `npm run preview` on `http://localhost:4321`.
- Produces: `tests/e2e/guards.spec.ts` with a `FORBIDDEN` list; later tasks append entries to it.

- [ ] **Step 1: Branch and prove the starting point**

Run: `git checkout -b redesign && git log --oneline -1`
Expected: `59dca97 Add the GitHub profile README pass to the redesign design`

- [ ] **Step 2: Scaffold and install with the exact pins from Global Constraints**

`astro.config.mjs`: `site: 'https://theflamebeast.github.io'`, no `base`, `output: 'static'`.
`.gitignore`: `node_modules/`, `dist/`, `.astro/`, `.playwright-mcp/`, `.superpowers/`, `shots/`,
`test-results/`, `playwright-report/`. Delete the old site files listed above.

- [ ] **Step 3: Write the failing smoke and guard tests**

```ts
// tests/e2e/smoke.spec.ts
test('home responds with the owner name as title', async ({ page }) => {
  const res = await page.goto('/');
  expect(res!.status()).toBe(200);
  await expect(page).toHaveTitle(/Anish Gupta/);
});

// tests/e2e/guards.spec.ts — scans every file under dist/
const FORBIDDEN: [RegExp, string][] = [
  [/\u00B7/, 'interpunct'], [/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b|tel:/, 'phone-shaped string'],
  [/identity__email/, 'Badgr email param'], [/FlameBeast/, 'old brand'],
  [/guns\.lol|twitch\.tv|youtube\.com/, 'gaming links'],
  [/theflamebeast(?!\.github\.io)(?<!github\.com\/theflamebeast)/, 'handle outside allowed URLs'],
  [/fonts\.(googleapis|gstatic)\.com/, 'third-party font host'],
];
test('no built file contains a forbidden string', () => {
  for (const file of walk('dist')) for (const [re, why] of FORBIDDEN)
    expect(readFileSync(file, 'utf8').match(re), `${why} in ${file}`).toBeNull();
});
```

Guards read text files only (`.html .css .js .xml .txt .json .svg`).

- [ ] **Step 4: Run, see the smoke test fail**

Run: `npx playwright install chromium && npm run build && npx playwright test --project=desktop`
Expected: smoke FAILS (no title yet); guards PASS.

- [ ] **Step 5: Placeholder `src/pages/index.astro` with `<title>Anish Gupta</title>`; run again**

Expected: both PASS.

- [ ] **Step 6: Workflow files**

- `AGENTS.md`: copied word for word from the Stashout checkout's `AGENTS.md`
  (`C:\Users\anish\Documents\GitHub\top-down-extraction-shooter\AGENTS.md`; identical in every repo
  apart from line endings).
- `.claude/last-reviewed`: the Stashout checkout's header comment block (every line before its sha)
  verbatim, then `50f65ff`, then
  `# 2026-11-10: baseline, not a review. 50f65ff is the last commit of the old hand-written site;
  nothing in this repo has ever been reviewed, so everything after it is backlog.`
- `CLAUDE.md` in the layout from `~/.claude/CLAUDE.md` § "The standard project files": `# Anish
  Gupta portfolio` (what it is, public repo, GitHub Pages) + the shared-rules line; `## Tech stack`
  (the pins, Node floor, TS 7 incompatibility); `## Architecture non-negotiables` (static output; the
  page complete without JS/WebGL; motion only through `onPage`; site facts only in `src/data/site.ts`);
  `## Layout`; `## Conventions` with the one-implementation table (ink simulation `src/ink/fluid.ts`,
  mount/teardown `src/motion/lifecycle.ts`, page-transition curtain `src/motion/curtain.ts`, project
  data the `projects` collection, site facts `src/data/site.ts`, image import `scripts/import-image.mjs`);
  `## Danger zones` (the three from the spec: the old `/ohresources` link pointed at a path that never
  existed; the headless browser drops `.playwright-mcp/` into the repo root; the legacy Pages build ran
  Jekyll over `main`, publishing every Markdown file); the public-repo privacy rule; `## Workflow` with
  `### Build, test, run` (the npm scripts), `### Done-checklist gates` (Typecheck, Unit, Build, E2E,
  Visual, Lighthouse, then Review, Committed, Pushed, CI, Live), `### Review` (default
  `/code-review medium`; name `src/ink`, `src/motion`, `src/content`; `.md` and `docs/` rarely repay a
  billed run; branch `redesign` until cutover, then `main`).
- `README.md`: two lines: what the site is, and `npm ci && npm run verify`.

- [ ] **Step 7: CI workflow `.github/workflows/deploy.yml`**

Triggers: `push` to `main` and `redesign`, `workflow_dispatch`. Permissions `contents: read`, `pages:
write`, `id-token: write`; `concurrency: { group: pages, cancel-in-progress: false }`. Job `build`:
checkout, setup-node with `node-version-file: .nvmrc` and npm cache, `npm ci`, `npm run check`,
`npm test`, `npx playwright install --with-deps chromium`, `npm run build`, `npm run e2e`,
upload-pages-artifact (`path: dist`). Job `deploy`: `needs: build`, `if: github.ref ==
'refs/heads/main'`, environment `github-pages`, deploy-pages.

- [ ] **Step 8: Verify, commit, push, watch CI**

Run: `npm run verify` → all green. `git status --short` first, then commit by path, `git push -u origin
redesign`, `gh run watch` → build job success, deploy job skipped.

---

### Task 2: Site data, project collection, Modrinth fetch

**Files:**
- Create: `src/data/site.ts`, `src/content/schema.ts`, `src/content.config.ts`,
  `src/content/projects/stashout.md`, `src/content/projects/flameburst.md`,
  `src/content/projects/server-insight.md`, `src/lib/modrinth.ts`, `tests/unit/schema.test.ts`,
  `tests/unit/modrinth.test.ts`

**Interfaces:**
- Produces `src/data/site.ts`:
  - `SITE: { name: 'Anish Gupta'; url: 'https://theflamebeast.github.io'; role: 'Software developer';
    school: 'CS at the University of Georgia'; tagline: string; location: 'Georgia, USA'; timeZone:
    'America/New_York'; email: 'anishguptaa18@gmail.com'; links: { github:
    'https://github.com/theflamebeast'; linkedin: 'https://www.linkedin.com/in/anishgupta25'; email:
    'mailto:anishguptaa18@gmail.com' } }`
  - `EDUCATION: { school: 'University of Georgia'; degree: 'B.S. Computer Science'; expected: 'May 2028' }`
  - `SKILLS: { languages: string[]; frameworks: string[]; tools: string[] }` with exactly the spec's
    lists.
  - `CERTS: { name: string; issuer: string; year: number; url?: string }[]`: the spec's three; GFACT
    `url` is `https://api.badgr.io/public/assertions/aINl5GbbR12YXetk2ki9jA` (no query string).
- Produces `src/content/schema.ts`: `makeProjectSchema(image: () => ZodType): ZodType` returning an
  object schema: `title`, `tier: 'featured' | 'compact'`, `order: int`, `summary` (max 140 chars),
  `role`, `start` (e.g. `'Jul 2026'`), `end: string | null` (null renders "present"), `status: 'active'
  | 'hiatus' | 'released'`, `stack: string[]` (min 1), `links: {label, href: url}[]` (default `[]`),
  `liveUrl?: url`, `cover?: image`, `gallery: {src: image, alt: string (min 1)}[]` (default `[]`),
  `video?: {mp4: string, webm: string, poster: image, caption: string}`, `modrinthSlug?: string`;
  refined so `tier === 'featured'` requires `cover`.
- Produces collection `projects` (glob loader over `src/content/projects/*.md`, `z` from
  `astro/zod`, `defineCollection` from `astro:content`, `glob` from `astro/loaders`); entry id = file
  stem = URL slug.
- Produces `src/lib/modrinth.ts`: `MODRINTH_FALLBACK = { downloads: 1831, asOf: '2026-11-10' }` and
  `getModrinthDownloads(slug: string, fetchImpl?: typeof fetch, warn?: (msg: string) => void):
  Promise<{ downloads: number; live: boolean }>` (GET
  `https://api.modrinth.com/v2/project/${slug}`, 5 s `AbortSignal.timeout`).

- [ ] **Step 1: Failing unit tests**

```ts
// tests/unit/schema.test.ts   (image stub: () => z.string())
it('accepts a valid featured project'); it('rejects a featured project without cover');
it('rejects a project with an empty stack'); it('rejects a summary over 140 chars');
it('accepts a project without liveUrl'); it('rejects a gallery image with empty alt');
// tests/unit/modrinth.test.ts
it('returns live downloads from a 200 response')            // { downloads: 2000, live: true }
it('falls back and warns on HTTP 500')                       // { downloads: 1831, live: false }, warn called once
it('falls back and warns when fetch throws')
it('falls back when downloads is not a number')
```

- [ ] **Step 2: Run, see them fail** — `npm test` → FAIL (modules missing).
- [ ] **Step 3: Implement `site.ts`, `schema.ts`, `content.config.ts`, `modrinth.ts`**
- [ ] **Step 4: Project files.** Frontmatter from the spec's per-project facts. Stashout: featured,
  order 1, `Jul 2026` to null, status `active`, links: Architecture tour only, **no `liveUrl`**.
  FlameBurst: featured, order 2, `Sep 2020` to `Sep 2025`, status `hiatus`, link labelled
  `flameburst.net (on hiatus)`. Server Insight: compact, order 3, `modrinthSlug: server-insight`,
  links Modrinth + GitHub. Covers are added in Task 4; until then give the featured entries a temporary
  cover from `src/assets/placeholder.webp` (a 1x1 dark webp) and delete it in Task 4. Bodies: draft
  case-study prose expanded only from the spec's "What I built" bullets, sections `## What I built`,
  `## How it works`.
- [ ] **Step 5: Run** `npm test && npm run check && npm run build` → all pass.
- [ ] **Step 6: Commit and push.**

---

### Task 3: Layout, tokens, fonts, static home

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`,
  `src/components/{Nav,Hero,ProjectCard,CompactCard,ScreenshotRows,About,TalkMarquee,Footer,
  MagneticButton,MenuPanel}.astro`, `public/favicon.svg`, `tests/e2e/home.spec.ts`,
  `tests/e2e/nojs.spec.ts`, `tests/e2e/home.phone.spec.ts`
- Modify: `src/pages/index.astro`, `tests/e2e/guards.spec.ts`

**Interfaces:**
- Consumes: `SITE`, `EDUCATION`, `SKILLS`, `CERTS`; `getCollection('projects')`;
  `getModrinthDownloads`.
- Produces: `Base.astro` props `{ title: string; description: string; ogImage?: string }`, rendering
  `<ClientRouter />` from `astro:transitions`, OG/Twitter meta (`og:image` default `/og.png`, 1200x630),
  favicon, and an inline JSON `<script type="application/json" id="route-titles">` mapping each route
  path to its curtain label (`'/'` → `'Home'`, `/work/<id>` → project title) for Task 9.
- Produces DOM hooks later tasks attach to (attributes only, no behaviour yet): `[data-hero]`,
  `[data-reveal="lines"|"fade"]`, `[data-speed]`, `[data-rotate]`, `[data-rows]` (two child
  `[data-row]`), `[data-marquee]`, `[data-footer-curve]`, `[data-magnetic]` with `data-strength` and
  `data-strength-text`, `[data-menu-button]`, `[data-menu-panel]`, `[data-clock]`.
- Tokens (`tokens.css`): `--bg #06070c`, `--surface #0f1118`, `--line rgba(255,255,255,.07)`,
  `--text #e9edf3`, `--muted #8a93a3`, `--accent #2f6cf0`; dark only.

- [ ] **Step 1: Failing E2E tests**

```ts
// home.spec.ts
test('hero shows name, role, school and tagline')
test('selected work lists Stashout then FlameBurst linking /work/stashout and /work/flameburst')
test('Server Insight card shows "Fabric mod", a download count and Modrinth + GitHub links')
test('Server Insight has no /work/server-insight page')          // GET → 404
test('About lists exactly the three certs and no Georgia State')
test('footer links: GitHub, LinkedIn, mailto; nothing else external')
test('no request leaves localhost except none at all')          // collect page.on('request') hosts
// nojs.spec.ts  (context javaScriptEnabled: false)
test('every [data-reveal] element is visible with opacity 1')   // Review Focus 1
// home.phone.spec.ts
test('no horizontal scroll at 390px')                            // scrollWidth <= innerWidth
```

Add to guards, as one regex: `/<a[^>]+href="https?:\/\/(?!localhost|theflamebeast\.github\.io|github\.com\/theflamebeast|www\.linkedin\.com\/in\/anishgupta25|modrinth\.com\/mod\/server-insight|api\.badgr\.io|www\.flameburst\.net)/`
→ "unexpected external link".

- [ ] **Step 2: Run, see them fail.**
- [ ] **Step 3: Build the layout and static sections** in the home order from the spec (hero, selected
  work, screenshot rows, About, "Let's talk", footer). The hero is static text over an empty
  `[data-hero]` box for now. Screenshot rows use the covers already referenced (placeholder until Task 4).
  Footer clock renders the build-time string; Task 7 makes it live. Fonts: import
  `@fontsource/geist-sans/{400,500,700}.css` and `@fontsource/geist-mono/{400,500}.css` in
  `global.css`. Favicon: "AG" monogram SVG in the accent colour. WCAG AA contrast for all text,
  visible `:focus-visible` ring. No interpuncts: separate meta items with spacing.
- [ ] **Step 4: Run** `npm run verify` → all pass.
- [ ] **Step 5: Commit and push.**

---

### Task 4: Media import, case-study pages, diagrams

**Files:**
- Create: `scripts/media-rules.mjs`, `scripts/import-image.mjs`, `tests/unit/media-rules.test.ts`,
  `src/pages/work/[slug].astro`, `src/pages/404.astro`, `src/components/{Gallery,NetcodeDiagram,
  NetworkDiagram}.astro`, `src/assets/projects/{stashout,flameburst}/*.webp`,
  `tests/e2e/case-study.spec.ts`
- Modify: `src/content/projects/{stashout,flameburst}.md` (real covers and galleries), delete
  `src/assets/placeholder.webp`

**Interfaces:**
- Produces `scripts/media-rules.mjs`: `isForbiddenSource(path: string): string | null`, returning the
  reason or null. Forbidden: any path segment `Whisk`, any segment containing `Gemini`, a `Technical`
  segment, a file named `admin-*.png` or `auth.png`.
- Produces `scripts/import-image.mjs <src> <dest.webp> [--max 2400]`: exits 1 with the reason if
  `isForbiddenSource`; otherwise sharp resize to max width, webp quality 86, prints bytes in → out.

- [ ] **Step 1: Failing unit test**

```ts
it.each([
  ['C:/Users/anish/Pictures/FlameBurst/Cinematic/Whisk/Whisk_6d542f919a.png', 'AI'],
  ['C:/Users/anish/Pictures/FlameBurst/Models/Icon/2 (Gemini 3 Pro Nano Banana)/OG/x.png', 'AI'],
  ['C:/Users/anish/Pictures/FlameBurst/Technical/Screenshot 2023-06-25 153132.png', 'admin'],
  ['.../ui-shots/admin-1.png', 'admin'], ['.../ui-shots/auth.png', 'login'],
])('refuses %s', (p) => expect(isForbiddenSource(p)).not.toBeNull());
it('allows a cinematic shot', () => expect(isForbiddenSource('C:/Users/anish/Pictures/FlameBurst/Cinematic/bg (30).png')).toBeNull());
```

- [ ] **Step 2: Run, see it fail; implement; run, see it pass.**
- [ ] **Step 3: Pick and import images.** FlameBurst: 4 to 6 from `C:\Users\anish\Pictures\FlameBurst\
  Cinematic` (`bg (n).png`, `Blitz*.png`, `2025-09-12_19.22.35.png`), plus screenshots of
  flameburst.net's stats and wiki pages taken with Playwright at 1440x900. **Open each chosen file and
  look at it:** skip or crop any with a readable player name (for example the leaderboard holograms in
  `bg (18).png`). Stashout: 4 to 6 from the Stashout checkout's `ui-shots/` (`lobby`, `hud`,
  `map-editor`, `leaderboard`, `trader` are good candidates). Write each to
  `src/assets/projects/<id>/<name>.webp` through `import-image.mjs`; record the source path of each in
  the commit message.
- [ ] **Step 4: Failing E2E tests**

```ts
test('/work/stashout and /work/flameburst respond 200 with h1 = title')
test('every <img> on both pages has loaded (naturalWidth > 0) and non-empty alt')
test('Stashout page has no "Play" link and no link to github.com/theflamebeast/stashout')
test('FlameBurst outbound link text includes "on hiatus"')
test('each page ends with a next-project link to the other case study')
test('each page has one diagram: svg[role="img"] with a <title>')
test('/nope responds 404 with a link home')
```

Add to guards: no IP address pattern `\b\d{1,3}(\.\d{1,3}){3}\b` and no `:25565|:8181|:8200`
in built files.

- [ ] **Step 5: Build `[slug].astro`** (`getStaticPaths` over `tier === 'featured'`, ordered by
  `order`; `render(entry)` for the body; header with title, summary, role, dates, stack tags, links;
  `liveUrl` renders a "Play" button only when set), `Gallery.astro` (Astro `<Picture>`, `formats:
  ['avif','webp']`, sensible `widths`), the two diagrams as inline SVG using `currentColor` and tokens:
  Netcode (input → client prediction → server tick → snapshot → reconciliation, as a loop);
  Network (players → proxy → lobby server → survival server, plus website, Discord bot and the stats
  feed; no hostnames, IPs or ports). 404 page in the same layout.
- [ ] **Step 6: Run** `npm run verify` → all pass. Commit and push.

---

### Task 5: Stashout gameplay clip

**Files:**
- Create: `public/media/stashout-raid.mp4`, `public/media/stashout-raid.webm`,
  `src/assets/projects/stashout/raid-poster.webp`
- Modify: `src/content/projects/stashout.md` (`video` field), `tests/e2e/case-study.spec.ts`

- [ ] **Step 1: Failing test:** `test('Stashout page has a muted, looping, playsinline video with a
  poster and both mp4 and webm sources')`. Run → FAIL.
- [ ] **Step 2: Record.** In the Stashout checkout (`C:\Users\anish\Documents\GitHub\
  top-down-extraction-shooter`), follow its `drive-the-game` skill: `npm run dev:start`, then a
  throwaway script outside both repos (scratchpad) that uses its `withPage` + `enterRaid`, opens a
  1280x720 context with `recordVideo`, plays about 15 s of movement and shooting through `__input`, and
  saves the webm. Then `npm run dev:stop` and confirm with `npm run dev:status`. No admin screens in
  frame.
- [ ] **Step 3: Encode** with ffmpeg (on PATH): 12 s cut, 1280 wide, no audio; mp4 H.264 `-crf 26`,
  webm VP9 `-crf 36 -b:v 0`; each under 4 MB (check with `ls -la`). Poster: first frame through
  `import-image.mjs`.
- [ ] **Step 4: Wire the `video` field; run** `npm run verify` → pass. Commit and push.

If the Stashout dev stack will not start, leave this task ⏳ with the error and continue; the page
renders without `video`.

---

### Task 6: Ink fluid hero

**Files:**
- Create: `src/ink/palette.ts`, `src/ink/shaders.ts`, `src/ink/fluid.ts`, `src/motion/prefs.ts`,
  `src/motion/lifecycle.ts`, `scripts/capture-stills.mjs`, `src/assets/ink-still.webp`,
  `public/og.png`, `tests/unit/palette.test.ts`, `tests/e2e/hero.spec.ts`,
  `tests/e2e/hero.phone.spec.ts`, `tests/e2e/hero.reduced.spec.ts`
- Modify: `src/components/Hero.astro`

**Interfaces:**
- Produces `src/motion/prefs.ts`: `prefersReducedMotion(): boolean`, `isTouch(): boolean`
  (`matchMedia('(hover: none)')`), `isWide(minPx: number): boolean`.
- Produces `src/motion/lifecycle.ts`: `onPage(setup: () => void | (() => void)): void`: runs `setup`
  on every `astro:page-load`, runs its returned cleanup on the next `astro:before-swap`. The only way
  any module mounts or tears down.
- Produces `src/ink/palette.ts`: `hsvToRgb(h, s, v): [number, number, number]`;
  `inkHue(timeMs: number, rand: number): number` = `(0.52 + 0.4 * (0.5 + 0.5 * sin(timeMs / 3500 +
  rand * 0.8))) % 1`; `inkColor(timeMs, rand, mult = 1)` = `hsvToRgb(inkHue, 0.85, 1)` scaled by
  `0.15 * mult`.
- Produces `src/ink/fluid.ts`: `INK_PARAMS = { simRes: 128, dyeRes: 1024, densityDissipation: 0.7,
  velocityDissipation: 0.2, pressure: 0.8, pressureIterations: 20, curl: 30, splatRadius: 0.22,
  splatForce: 6000, startSplats: 6, idleSplatAfterMs: 2000, clickRingSplats: 7, maxPixels: 2.4e6 }`
  and `createInkFluid(canvas: HTMLCanvasElement, opts?: { params?: Partial<typeof INK_PARAMS> }):
  InkFluid | null` (null when WebGL2 or half-float render targets are missing), where `interface
  InkFluid { start(): void; stop(): void; resize(): void; destroy(): void; pointer(x: number, y:
  number): void; splatRing(x: number, y: number): void; readonly running: boolean }` (coordinates in
  0..1 of the canvas, y down). Port the solver from
  `docs/superpowers/specs/2026-11-10-portfolio-redesign/ink-prototype/` into typed modules with no
  globals; the prototype is the look to match.
- Produces in `Hero.astro`: the still (`<Picture>` of `ink-still.webp`, `fetchpriority="high"`)
  always rendered; a `<canvas data-ink data-running="false|true">` over it that fades in once running.

- [ ] **Step 1: Failing unit tests**

```ts
it('hsvToRgb maps primaries', () => { expect(hsvToRgb(0,1,1)).toEqual([1,0,0]); expect(hsvToRgb(1/3,1,1)).toEqual([0,1,0]); });
it('inkHue stays in 0.52..0.92 for any time and rand')     // 10k samples
it('inkColor channels stay in 0..0.15*mult')
```

- [ ] **Step 2: Run, fail; implement palette; run, pass.**
- [ ] **Step 3: Failing E2E tests**

```ts
// hero.spec.ts (desktop)
test('canvas runs and is not blank')              // data-running="true"; after 1.5 s, element screenshot of the canvas through sharp().stats(): max channel stdev > 8
test('sim stops when hero scrolls out of view and resumes on return')   // data-running false/true
test('sim stops when the tab is hidden')          // emulate visibilitychange via page.evaluate dispatch with document.hidden stub
test('no WebGL2: still visible, canvas absent or hidden, zero console errors')  // Review Focus 5: addInitScript makes getContext('webgl2') return null
test('canvas pixel count <= 2.4e6 at 2560x1440 with devicePixelRatio 2')
// hero.phone.spec.ts
test('dragging on the hero scrolls the page')     // Review Focus 4: CDP Input.dispatchTouchEvent start/move/end upward over the hero; expect scrollY > 100
test('hero and canvas computed touch-action is not "none"')
// hero.reduced.spec.ts
test('no canvas is created; the still is visible')
```

- [ ] **Step 4: Run, fail; implement `fluid.ts`, `shaders.ts`, `prefs.ts`, `lifecycle.ts`, Hero
  script.** Rules from the spec's "The hero": IntersectionObserver + `visibilitychange` drive
  `start`/`stop`; pointer listeners are `{ passive: true }` and ignore `pointerType === 'touch'` moves
  (taps still `splatRing`); reduced motion never calls `createInkFluid`.
- [ ] **Step 5: `scripts/capture-stills.mjs`.** Against `npm run preview`: load `/`, wait 3 s,
  screenshot only the canvas at 1920x1080 → `src/assets/ink-still.webp` (sharp, q 82); then a
  1200x630 viewport screenshot of the full hero with text → `public/og.png`. Run it, look at both
  images, commit them.
- [ ] **Step 6: Run** `npm run verify` → pass. Commit and push.

---

### Task 7: Smooth scroll, reveals, scroll-driven effects, marquee, clock

**Files:**
- Create: `src/motion/scroll.ts`, `src/motion/reveal.ts`, `src/motion/scrub.ts`,
  `src/motion/marquee.ts`, `src/motion/clock.ts`, `src/lib/clock.ts`, `tests/unit/clock.test.ts`,
  `tests/e2e/motion.spec.ts`, `tests/e2e/motion.reduced.spec.ts`, `tests/e2e/motion.phone.spec.ts`
- Modify: `src/layouts/Base.astro` (one module script calling the inits through `onPage`)

**Interfaces:**
- Consumes: `onPage`, `prefersReducedMotion`, `isWide`.
- Produces `src/motion/scroll.ts`: `initSmoothScroll(): () => void` (Lenis with `autoRaf: false`,
  driven by `gsap.ticker`, `lenis.on('scroll', ScrollTrigger.update)`; sets `html[data-smooth="on"]`;
  no-op under reduced motion) and `getLenis(): Lenis | null` for Tasks 8 and 9. It also keeps
  `html[data-triggers]` equal to `ScrollTrigger.getAll().length` after every `ScrollTrigger.refresh`,
  the only test hook in production code (Task 9 reads it).
- Produces `initReveals(): () => void` (adds `html.js-motion`, which is the only thing that applies
  the hidden start state; `[data-reveal="lines"]` uses SplitText lines rising from 100 % inside a mask;
  `[data-reveal="fade"]` rises 2em and fades), `initScrub(): () => void` (parallax, rotations,
  screenshot rows, footer curve; only when `isWide(720)` and not reduced, via `gsap.matchMedia`),
  `initMarquee(): () => void` (rolls `[data-marquee]`, `timeScale` flips sign with scroll direction),
  `initClock(): () => void`.
- Produces `src/lib/clock.ts`: `formatLocalTime(date: Date, timeZone = 'America/New_York'): string`,
  normalising U+202F to a space.

- [ ] **Step 1: Failing tests**

```ts
// clock.test.ts
expect(formatLocalTime(new Date('2026-11-10T21:12:00Z'))).toBe('4:12 PM EST');
expect(formatLocalTime(new Date('2026-07-01T16:05:00Z'))).toBe('12:05 PM EDT');
// motion.spec.ts
test('html[data-smooth="on"] and a wheel scroll eases (scrollY keeps changing after the wheel event)')
test('a [data-reveal="lines"] heading below the fold is hidden before and visible after scrolling to it')
test('screenshot rows move in opposite directions while scrolling')    // compare transforms of the two [data-row]
test('marquee translateX changes over 500 ms and reverses direction after scrolling up')
test('clock text matches /^\\d{1,2}:\\d{2} (AM|PM) E[SD]T$/ and updates')
test('resizing 1440 -> 390 leaves no horizontal scroll and resizes the ink canvas')   // Review Focus 3
// nojs regression: re-run tests/e2e/nojs.spec.ts unchanged                          // Review Focus 1
// motion.reduced.spec.ts
test('no data-smooth, reveals already visible, marquee static')
// motion.phone.spec.ts
test('no scroll-scrubbed transforms on rows, parallax or footer curve below 720px')
```

- [ ] **Step 2: Run, fail; implement; run** `npm run verify` → pass. Commit and push.

---

### Task 8: Magnetic buttons and floating menu

**Files:**
- Create: `src/motion/magnetic.ts`, `src/motion/menu.ts`, `tests/e2e/interact.spec.ts`,
  `tests/e2e/interact.phone.spec.ts`
- Modify: `src/components/{MagneticButton,MenuPanel,Nav}.astro`, `src/layouts/Base.astro`

**Interfaces:**
- Consumes: `onPage`, `isTouch`, `isWide`, `getLenis`.
- Produces `initMagnetic(): () => void` (button and label follow the cursor by `data-strength` /
  `data-strength-text`, elastic return; fill rises from the bottom on hover; off when `!isWide(540) ||
  isTouch()`), `initMenu(): () => void` (`[data-menu-button]` appears after scrolling 30 % of a
  viewport; opens `[data-menu-panel]`, stops Lenis, traps focus, closes on Escape, on a link click and
  on the button; restores focus to the button).

- [ ] **Step 1: Failing tests**

```ts
test('hovering a magnetic button moves it toward the cursor and it returns after mouse leaves')
test('menu button is hidden at top and visible after scrolling 30% of the viewport')
test('menu opens, Tab stays inside the panel, Escape closes it and focus returns to the button')
test('page does not scroll while the menu is open')
// interact.phone.spec.ts
test('magnetic buttons do not move on tap')
```

- [ ] **Step 2: Run, fail; implement; run** `npm run verify` → pass. Commit and push.

---

### Task 9: Preloader and page transitions

**Files:**
- Create: `src/motion/preloader.ts`, `src/motion/curtain.ts`, `src/components/Preloader.astro`,
  `src/components/Curtain.astro`, `tests/e2e/transitions.spec.ts`,
  `tests/e2e/transitions.reduced.spec.ts`
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Consumes: `getLenis`, `prefersReducedMotion`, `#route-titles`.
- Produces `runPreloader(): Promise<void>`: runs once per session (`sessionStorage` key `ag:intro`),
  ink bloom (live sim on `/`, the still elsewhere) then the curved curtain lifts and content rises in,
  staggered; removes itself after at most 1500 ms whatever happens; skipped under reduced motion.
- Produces `initPageTransitions(): void` (once, not per page): on `astro:before-preparation` sets the
  curtain label from `#route-titles` for `event.to.pathname` and awaits the curtain-in animation
  (wrap `event.loader`); on `astro:after-swap` plays curtain-out. `Curtain.astro` uses
  `transition:persist`.

- [ ] **Step 1: Failing tests**

```ts
test('first load shows the preloader; a reload in the same session does not')
test('preloader is gone within 1500 ms and the hero name is visible')
test('first visit straight to /work/flameburst also plays the preloader once')
test('clicking the Stashout card shows the curtain labelled "Stashout", then the Stashout page')
test('back then forward: curtain hidden at rest, scroll works, ScrollTrigger.getAll().length equals a fresh load of the same page, zero console errors')   // Review Focus 2
// transitions.reduced.spec.ts
test('no preloader; navigation swaps without the curtain')
```

Read the trigger count from `html[data-triggers]` (Task 7); expose nothing on `window`.

- [ ] **Step 2: Run, fail; implement; run** `npm run verify` → pass. Commit and push.

---

### Task 10: Gates: visual review, Lighthouse, docs

**Files:**
- Create: `scripts/shots.mjs`
- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: `scripts/shots.mjs`** writes full-page screenshots of `/`, `/work/stashout`,
  `/work/flameburst` at 1440x900 and 390x844, each with motion and with reduced motion, into
  `shots/` (gitignored). Run it and look at all 12 images. Fix anything broken, cramped, overlapping or
  low-contrast; re-run until clean. Run `frontend-design` over the full `redesign` diff.
- [ ] **Step 2: Lighthouse** against `npm run preview`, Chrome from Playwright:
  `CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") npx -y
  lighthouse@13.6.0 http://localhost:4321/ --form-factor=mobile --only-categories=performance,accessibility
  --output=json --output-path=shots/lighthouse.json --chrome-flags="--headless=new"`.
  Expected: performance ≥ 90, accessibility ≥ 95. Below target: fix the top audit and re-run.
- [ ] **Step 3: Re-derive `CLAUDE.md`** against the tree: every path, script and pin it names
  exists; the done-checklist gates match what Steps 1 and 2 actually ran.
- [ ] **Step 4:** `npm run verify` → pass. Commit and push. Check CI with `gh run list --limit 1`.

---

### Task 11: Owner copy review

- [ ] **Step 1:** Push and hand over: the hero line, both card one-liners, Server Insight's line, the
  About paragraph, and both case-study bodies, quoted in chat, plus the 12 screenshots' location.
  ⏳ until the owner answers.
- [ ] **Step 2:** Apply their edits; `npm run verify`; commit and push.

---

### Task 12: Review handoff

- [ ] **Step 1:** Report the `redesign` backlog (`git log --oneline 50f65ff..redesign`) and hand over
  `/codex:review --base 59dca97` (multi-commit, the verified range form) with the areas to name:
  `src/ink`, `src/motion`, `src/content`, `.github/workflows`. ⏳ until the owner runs it.
- [ ] **Step 2:** Fix every real finding (see it fail first where it is a bug), `npm run verify`,
  commit, push; record the result and the reviewed-up-to sha in `.claude/last-reviewed`.

---

### Task 13: Cutover

Confirm with the owner immediately before Step 2; it changes a GitHub setting and the live site.

- [ ] **Step 1:** On `redesign`: `npm run verify` green; CI green on the branch head.
- [ ] **Step 2:** `gh api -X PUT repos/theflamebeast/theflamebeast.github.io/pages -f
  build_type=workflow`; verify with `gh api repos/theflamebeast/theflamebeast.github.io/pages --jq
  .build_type` → `workflow`.
- [ ] **Step 3:** `git checkout main && git pull --ff-only && git merge --ff-only redesign && git push
  origin main`; `gh run watch` → build and deploy jobs success.
- [ ] **Step 4: Live checks.** `curl -sI https://theflamebeast.github.io/` → 200 and the body contains
  `Anish Gupta`; `/work/stashout` and `/work/flameburst` → 200; `/CLAUDE.html` and
  `/docs/superpowers/specs/2026-11-10-portfolio-redesign-design.html` → 404 (Jekyll is gone). Open the
  live site in a headless browser: no console errors, ink running.
- [ ] **Step 5:** Update `CLAUDE.md` § Review branch to `main` and § Danger zones (the Jekyll one is now
  history); commit and push to `main`.

---

### Task 14: Archive Once Human Resources

Confirm with the owner immediately before Step 1. In this order, because an archived repo rejects
settings changes:

- [ ] **Step 1:** `gh api -X DELETE repos/theflamebeast/oh-resources/pages`
- [ ] **Step 2:** `gh repo edit theflamebeast/oh-resources --homepage ""`
- [ ] **Step 3:** `gh repo archive theflamebeast/oh-resources --yes`
- [ ] **Step 4:** `curl -s -o /dev/null -w "%{http_code}" https://theflamebeast.github.io/oh-resources/`
  → 404 (allow a few minutes for the CDN), and `gh repo view theflamebeast/oh-resources --json
  visibility,isArchived` → `PRIVATE`, `true`. No commit in this repo.

---

### Task 15: GitHub profile README

Repo `theflamebeast/theflamebeast`, local folder `C:\Users\anish\Documents\GitHub\FlameBeast`; its own
commit.

- [ ] **Step 1:** `git pull --ff-only`, then rewrite `README.md` per the spec's "GitHub profile README"
  section: name and one line, portfolio link, Stashout and FlameBurst lines linking the showcase repo
  and the case studies, Server Insight linking Modrinth, contact GitHub, LinkedIn, email. Remove the
  view counter, the Discord badge and line, and the top-languages card. No interpuncts.
- [ ] **Step 2:** Every link in it returns 200 (`curl -sI`). Commit, push, view
  `https://github.com/theflamebeast` in a headless browser.
- [ ] **Step 3:** Ask the owner to pin `server-insight` next to `stashout-showcase` (no API exists). ⏳.
