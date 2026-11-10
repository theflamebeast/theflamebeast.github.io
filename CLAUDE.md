# Anish Gupta portfolio

The owner's portfolio site, `https://theflamebeast.github.io/`, served by GitHub Pages from this
**public** repo (`theflamebeast/theflamebeast.github.io`). Its readers are recruiters and engineers.

Right now `main` holds the old hand-written site. A full redesign to Astro is designed and planned:

- Design: `docs/superpowers/specs/2026-11-10-portfolio-redesign-design.md`
- Plan: `docs/superpowers/plans/2026-11-10-portfolio-redesign.md` (15 tasks, built on branch
  `redesign`, merged to `main` only at cutover)

The plan's Task 1 rewrites this file for the Astro stack. Until then it describes what is on `main`.

Shared workflow rules: ~/.claude/CLAUDE.md § Every repo. This file only holds what is local.

## Blast radius

Everything committed is world-readable, and anything on `main` is live within a minute. So:

- **Never name the owner's other private projects** in any file here. The site covers exactly three
  projects (Stashout, FlameBurst, Server Insight); that list is public, nothing else is.
- **No phone number, no secrets, no private repo links.** The resume holds a phone number; it never
  comes here.

## Tech stack

- Today: one static `index.html` with inline CSS and JS, plus image files. No build, no
  `package.json`, no tests.
- Pages uses the **legacy branch build**: Jekyll over the root of `main`. `_config.yml` exists only to
  keep Jekyll from publishing the Markdown files (see Danger zones).
- Planned: Astro 7 with exact pins; the plan's Global Constraints are the only copy of the versions.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `*.png`, `favicon.ico` | the old site, all deleted by plan Task 1 |
| `_config.yml` | Jekyll excludes for the legacy build; deleted by plan Task 1 |
| `docs/superpowers/specs/` | the redesign design doc, plus `2026-11-10-portfolio-redesign/ink-prototype/` (the approved throwaway WebGL demo) |
| `docs/superpowers/plans/` | the implementation plan |
| `.claude/last-reviewed` | the review marker |

## Conventions

- **Identity:** the owner's name is the brand. No "FlameBeast" logo, name or handle in the UI, and
  no YouTube, Twitch or guns.lol links. Contact links are GitHub, LinkedIn and email only.
  `theflamebeast` appears only inside the `github.com/theflamebeast` and `theflamebeast.github.io`
  URLs.
- **Projects shown are exactly three:** Stashout and FlameBurst as case studies, Server Insight as a
  compact card. Adding one is a design decision for the owner, not an edit.

## Danger zones

Each one happened.

- **The legacy Pages build publishes Markdown.** On 2026-11-10 the design doc and the plan went live
  as pages under the portfolio URL (`/docs/superpowers/...html`, HTTP 200) the moment they were
  pushed. `_config.yml` now excludes `docs` and the instruction files. Anything else committed to
  `main` as `.md` still gets published until the cutover.
- **Verification links can carry personal data.** The old site's Badgr certificate link had
  `?identity__email=<the owner's email>` on it. Strip query strings from any credential link.
- **A link to a path that never existed** sat on the old site for months: `/ohresources`, while the
  Once Human site actually lived at `/oh-resources/`. Check every internal link returns 200.
- **The headless browser (Playwright MCP) writes `.playwright-mcp/` into the repo root** whenever a
  session drives a browser from here. It happened twice on 2026-11-10; it is now gitignored.

## Workflow

### Build, test, run

- No build. Preview: open `index.html` in a browser.
- Deploy: every push to `main` triggers the `pages build and deployment` run. Check it with
  `gh run list --limit 1`, then `curl -sS -o /dev/null -w "%{http_code}" https://theflamebeast.github.io/`.

### Done-checklist gates

Until the Astro build exists, nearly every change is docs. In order:

1. **Docs scan**, mechanical, over every changed file: no interpunct (U+00B7), no phone-shaped
   string, no name of a private project.
2. Then the standard tail: Review, Committed, Pushed, **CI** (the Pages run for that commit,
   `success`), and **Live** (the site still returns 200).

### Review

The gate itself is `# The review gate` in `~/.claude/CLAUDE.md`. Local facts:

- The marker in `.claude/last-reviewed` starts at `50f65ff`, a **baseline**, not a review.
- Docs-only commits rarely repay a billed run. The real review happens on the redesign (plan Task 12),
  where the areas worth naming are `src/ink`, `src/motion`, `src/content` and `.github/workflows`.
- Branch `main`, committed straight to it, until the redesign starts on `redesign`.
