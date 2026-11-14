# Portfolio redesign: design

Date: 2026-11-10. Owner: Anish Gupta. Repo: `theflamebeast/theflamebeast.github.io` (public, GitHub
Pages, branch `main`).

## Intent

Replace the current hand-written `index.html` (tabs, tables, Office badges, the FlameBeast logo and
gaming links) with a professional portfolio that recruiters and engineers take seriously, and that
also makes them stop scrolling. The owner's brief: "super insanely cool", insane visuals and
animation, liquid physics. The owner builds simulations (Stashout runs a deterministic simulation),
so a live fluid simulation as the hero is a statement about the work, not decoration.

Two jobs at once, in this order of priority:

1. **A recruiter skimming for 30 seconds, often on a phone,** must see who this is, what they build,
   and the two main projects, without waiting for or fighting an effect.
2. **Anyone who lingers** gets a site that feels hand-crafted: a fluid hero they can play with and a
   full motion system on scroll, hover and navigation.

The same change also gives this repo the owner's standard AI-workflow files (see
**AI workflow files** below), matching the owner's other repos.

## Goals

- Ink-fluid WebGL hero that reacts to the cursor, as prototyped and approved (see **The hero**).
- A motion system written from scratch: smooth scrolling, text reveals, scroll-driven effects and
  page transitions (see **Motion**).
- Exactly three projects: Stashout and FlameBurst as featured case studies, Server Insight as a
  compact third entry.
- Dark theme throughout.
- Fast and readable without the effects: content renders immediately, effects layer on top.
- Built with Astro, deployed by GitHub Actions; the build fails on broken project data.

## Non-goals

- No resume and no resume PDF on the site. No phone number anywhere.
- No photo of the owner.
- No FlameBeast branding: no logo, no "FlameBeast" name or handle in the UI, no YouTube, Twitch or
  guns.lol links. (The `theflamebeast.github.io` address stays for now; a custom domain can be added
  later.)
- No blog, CMS, contact-form backend, analytics or cookies.
- No separate Work page, no project filter, no list/grid toggle (three projects don't need them).
- No separate About page; the About section on the home page covers it.
- No projects beyond the three named here.

## Anti-goals (a failure even if it technically works)

- **Anything that is not original work.** No layout, copy, code or assets taken from any other
  site; every effect is written from scratch on GSAP and Lenis.
- **The hover project-preview popout** (a square preview card plus a "View" bubble that trails the
  cursor over a project list). The owner explicitly dislikes it. Do not build it or anything like it.
- **An effect that hides the projects or stutters on an ordinary laptop.**
- **Leaking anything private:** the phone number, private-repo internals, credentials, admin or DNS
  screenshots, or other players' usernames in FlameBurst screenshots.

## Decided by the owner

- Stack: Astro (static output), not plain HTML.
- Hero: the ink-fluid prototype (one of four prototyped: ink fluid, liquid particles, water surface,
  liquid metal).
- Motion: the effects listed under **Motion**, with no hover preview popout.
- Theme: **dark all the way down** (option A of two mockups; the other was a dark hero into a light
  page).
- Projects: Stashout and FlameBurst featured with case-study pages; Server Insight as a smaller third
  entry with no page of its own. Nothing else.
- Links: GitHub, LinkedIn, email only.
- About: short, with the three certifications from the resume. No photo.
- Address: keep `theflamebeast.github.io`.
- FlameBurst media comes from the owner's `C:\Users\anish\Pictures\FlameBurst` folder.
- Archive and hide the Once Human Resources site and repo.
- Accepted these calls proposed during design: an ink preloader; own code on GSAP and Lenis; turn
  magnetic and heavy scroll effects off on small screens; respect reduced motion.
- 2026-11-11: cut the rolling "Let's talk" text above the footer after seeing it built: the owner
  disliked it, and it repeated the footer's own "Get in touch" call.

## Site structure

### Home (`/`)

Top to bottom:

1. **Preloader** (first load per browser session only, on whichever page is loaded first): ink blooms
   to fill the screen, then a curtain lifts away with a curved bottom edge and the page content rises
   in, staggered. Skipped on later loads in the same session and under reduced motion. Must not hold
   content back for more than about 1.5 s. When the first page is a case study, the bloom may be a
   pre-rendered ink frame rather than the live simulation.
2. **Hero:** full-viewport ink fluid. Top nav: owner's name left; Work, About, Contact right (anchor
   links on the home page). Centered: a mono eyebrow (role, school), the name very large, one line
   about what the owner builds. A short hint ("move your cursor") may sit bottom-left.
3. **Selected work:** Stashout and FlameBurst as large cards (screenshot, title, one-liner, years);
   each opens its case-study page. Server Insight as a compact card: name, "Fabric mod", the Modrinth
   download count, links to Modrinth and GitHub.
4. **Screenshot rows:** two rows of project screenshots that drift sideways in opposite directions as
   the page scrolls.
5. **About:** two or three sentences (CS at the University of Georgia, what the owner likes building),
   a skills line, and the three certifications.
6. **Footer:** curved top edge that flattens as it scrolls into view; a magnetic "Get in touch" button
   (`mailto:`); local time and place; GitHub, LinkedIn, email.

### Case-study pages (`/work/stashout`, `/work/flameburst`)

Each page: title, one-liner, role, dates, stack tags, outbound links; a large media block; "What I
built" as short sections expanded from the resume bullets; a diagram; a screenshot gallery; a
"next project" link at the bottom that leads to the other case study. Pages are reached through the
curved-curtain page transition.

**Stashout**
- Solo developer, Jul 2026 to present, in development. Link: Architecture tour
  (`https://github.com/theflamebeast/stashout-showcase`). The game's own repo is private: do not link
  it.
- **No "Play" link yet** (designer's call): on 2026-11-10 neither `stashout.io` nor
  `www.stashout.io` resolves in DNS, and the Stashout repo's `DEPLOY.md` uses that domain only as an
  example. The project data gets an optional live-URL field; the button appears only when it is set.
  Amended 2026-11-14: `stashout.io` now serves a Coming Soon page, so Stashout links to it as a plain
  `stashout.io` button (first, before Architecture, which replaces the "Architecture tour" label).
  The live-URL "Play" button stays unused until the game can be played.
- Media: a short gameplay clip of a real raid, recorded by the builder with the Stashout repo's own
  game driver (its `drive-the-game` skill), plus UI screenshots from that repo's `ui-shots/` folder
  (39 PNGs, gitignored there, so copy the chosen ones in). Never use `admin-*.png` or `auth.png`, and
  keep admin screens out of the clip.
- What I built, from the resume: server-authoritative multiplayer on a deterministic simulation shared
  by client and server over a custom binary protocol on WebSockets; client-side prediction, server
  reconciliation and lag compensation, validated with custom latency, jitter and packet-loss
  simulation; the deployment split between a static client and a persistent authoritative server,
  with Stripe payments and per-account admin permissions; CI enforcing strict TypeScript, deterministic
  simulation tests and end-to-end smoke tests that drive real WebSocket clients against a live server.
- Diagram: the client-server netcode loop (input, prediction, server tick, snapshot,
  reconciliation).
- Any count shown (commits, tests, files) is re-derived from the Stashout repo at build time, never
  copied from a document.

**FlameBurst**
- Creator, server administrator and full-stack developer, Sep 2020 to Sep 2025. Link
  `https://www.flameburst.net`, labelled honestly: the site currently shows that the server is on
  hiatus. Amended 2026-11-14: the link reads `flameburst.net`, with no status note, since the site
  says it itself.
- What I built, from the resume: a Linux Minecraft server for 25+ concurrent players, first on Oracle
  Cloud and then a dedicated host as load grew; JVM garbage-collection and thread tuning that removed
  peak-hour latency spikes; custom Java plugins on the Paper/Purpur API for automation, moderation and
  anti-exploit protection; a TypeScript site with a live statistics dashboard and a CMS-driven wiki;
  plugin systems for automated backups, player-data management and real-time monitoring.
- Diagram: the network's public shape only: players, proxy, lobby server, main survival server, plus
  the website, Discord bot and the live stats feed. No hostnames, IPs, ports or anything from the live
  server's config.
- Media: real in-game shots from `C:\Users\anish\Pictures\FlameBurst\Cinematic` (the `bg (n).png`
  series, the `Blitz*.png` series, `2025-09-12_19.22.35.png`), plus screenshots of flameburst.net's
  stats and wiki pages.
  - Do **not** use anything from `Cinematic\Whisk`, `Whisk`, or `Models\Icon\2 (Gemini …)`: those are
    AI-generated and must not be presented as in-game footage.
  - Do **not** use anything from `Technical` (admin, console and DNS screenshots).
  - Crop out or skip shots where other players' usernames are readable (for example the leaderboard
    holograms in `bg (18).png`).
  - Source PNGs are 5 to 6 MB each: copy only the chosen ones into the repo and serve them through
    Astro's image pipeline as compressed modern formats at sensible sizes.

### Server Insight (card only)

Client-side Fabric mod: one command, `/serverinsight`, that shows what a client can legitimately infer
about a server. Links: `https://modrinth.com/mod/server-insight` and
`https://github.com/theflamebeast/server-insight`. Downloads: fetch from
`https://api.modrinth.com/v2/project/server-insight` at build time (1,831 on 2026-11-10); if the fetch
fails, the build falls back to a committed value and says so in its log rather than failing.

### Facts for the About section and footer

- Education: University of Georgia, B.S. Computer Science, expected May 2028. The Georgia State
  coursework and GPA from the resume are left off to keep the section short (designer's call).
- Skills, from the resume: Java, C, C#, Python, TypeScript, JavaScript, HTML/CSS; Node.js, Next.js,
  React, PixiJS, WebSockets, Vitest; Git, Linux, IntelliJ IDEA, Visual Studio, VS Code, Unity.
- Certifications (only these three): GIAC Foundational Cybersecurity Technologies (GFACT), SANS
  Institute, 2023, with its Badgr verification link **stripped of the `identity__email` query
  parameter** the current site leaks; IT Specialist: Software Development, Certiport / Pearson VUE,
  2024; Unity Certified Associate: Game Developer, Unity Technologies, 2024.
- Links: `https://github.com/theflamebeast`, `https://www.linkedin.com/in/anishgupta25`,
  `mailto:anishguptaa18@gmail.com`.
- Local time: Eastern (America/New_York), labelled "Georgia, USA".

## The hero

The approved prototype is committed next to this file as
`2026-11-10-portfolio-redesign/ink-prototype/` (`demo-gl.js`, `demo-ink.js`): a GPU stable-fluids
solver (advection, curl and vorticity confinement, divergence, 20 Jacobi pressure iterations, gradient
subtraction) on WebGL2 half-float render targets, velocity grid 128 on the short side, dye grid 1024.
Its parameters are the starting point: density dissipation 0.7, velocity dissipation 0.2, pressure
0.8, curl 30, splat radius 0.22, splat force 6000; colours cycle through cyan, blue, violet and pink at
0.15 intensity; six random splats on start; a random splat after about 2 s of no input; a click fires a
ring of seven splats. It is throwaway code: rebuild it properly (typed, one module, no globals) and
treat these values as the look to match, not code to paste.

Behaviour rules:

- **Pause when not visible:** stop the simulation when the hero scrolls out of view or the tab is
  hidden.
- **Touch:** the hero must never block page scrolling. On touch devices the ink idles with its
  automatic splats and reacts to taps; dragging scrolls the page.
- **Reduced motion:** no simulation; show a static frame of the ink.
- **No WebGL2 or no float render targets:** the same static frame; the page works identically.
- **Cost:** cap the canvas resolution; the prototype capped it at 2.4 M pixels.

## Motion

Written from scratch on GSAP (with ScrollTrigger and SplitText) and Lenis. Each item names the
behaviour; the builder picks the implementation.

| Effect | Behaviour |
|---|---|
| Preloader | See Home, item 1. |
| Page transitions | A curtain with a curved leading edge sweeps over the page, shows the destination page's name, and lifts off the new page with a curved trailing edge. Back and forward work; no flash of unstyled content. |
| Smooth scrolling | Inertia scrolling site-wide (Lenis). Native scrolling under reduced motion. |
| Text reveals | Headings and key lines slide up into view line by line as they enter; other blocks fade up. |
| Magnetic buttons | Buttons and their labels lean toward the cursor at different strengths and spring back elastically; on hover a fill rises from the bottom and the label colour flips. Off below 540 px wide and on touch. |
| Floating menu button | A round menu button appears after scrolling about 30 % of a viewport; it opens a full-height menu panel. |
| Screenshot rows | Two rows of screenshots drift sideways in opposite directions, driven by scroll. |
| Parallax | Selected elements move at slightly different speeds on scroll. |
| Scroll-turned icons | Arrow icons rotate as their section scrolls. |
| Curved footer | The footer's curved top edge flattens as it scrolls into view. |
| Local clock | Live Eastern time in the footer. |

- Below 720 px wide, drop the scroll-scrubbed effects (rows, parallax, rotations, footer curve) to a
  static layout.
- Under `prefers-reduced-motion: reduce`: no preloader, no curtain animation (instant navigation), no
  smooth scroll, no reveals (content simply present), static ink.

## Visual design

- Dark throughout: near-black background (the prototypes used `#05060a` to `#07080d`), slightly lifted
  dark cards with hairline borders, off-white text, muted grey secondary text, and one blue accent
  (`#2f6cf0` in the mockup) for buttons and focus. The ink's cyan to violet range sets the mood.
- Type: Geist for text and display, Geist Mono for small uppercase labels, as in the prototypes.
  Self-hosted (Fontsource), no Google Fonts request.
- **Never use the interpunct (U+00B7)** anywhere in UI copy, labels, separators or CSS `content`.
  Separate items with spacing, pipes or separate elements.
- Contrast meets WCAG AA for all text; visible keyboard focus everywhere.
- Favicon: a simple "AG" monogram. Open Graph image: a still of the ink hero with the name,
  1200 x 630.

## Tech and deploy

- **Astro**, static output. Pin the newest Astro 7.x release that is at least two weeks old on the
  build day (7.4.10 shipped on 2026-11-10 itself). Astro 7 needs Node 22.23.4 or newer; this machine
  has exactly 22.23.4.
- **GSAP** (3.15.1 current) with ScrollTrigger and SplitText; **Lenis** (1.3.27 current). Apply the
  same two-week rule to every dependency.
- Project content in Astro content collections with a schema, so a project missing a required field
  fails the build.
- **Deploy:** a GitHub Actions workflow builds and publishes to Pages on every push to `main`. The
  repo's Pages source must change from the legacy branch build (currently `main` root, Jekyll) to
  GitHub Actions; until it does, every Markdown file on `main` is publicly rendered by Jekyll.
- No server, no runtime API calls except the optional Modrinth fetch at build time.

### Cutover (designer's call)

The live site must never be half-built. The legacy Pages build serves whatever is at the root of
`main`, so deleting the old `index.html` on `main` breaks the live site immediately, and once the
Actions deploy exists every push to `main` publishes. So:

- Build the redesign on a branch (`redesign`), pushed to `origin` as it goes; its workflow builds but
  does not deploy.
- At the end, once every gate passes on the branch: switch the repo's Pages source to GitHub Actions,
  merge to `main`, watch the deploy run, check the live URL.
- The AI workflow files and this design doc may go to `main` first; they don't touch the live page
  (apart from Jekyll rendering this doc, which stops at cutover).

## Repo cleanup

Delete everything the old site used: `index.html`, `FB 3 NO BG - 64p.png`, `favicon.ico`,
`github_icon.png`, the four `microsoft-office-specialist-*.png` badges, and the old README content.
Gone with them: the tab script, the `marked` CDN script, the fetch of the GitHub profile README (that repo
gets its own small update, see **GitHub profile README**), the Discord/Twitter meta tags
pointing at an imgur image, and the `/ohresources` link, which was already broken (the live path had a
hyphen).

## Once Human Resources: archive and hide

State on 2026-11-10: repo `theflamebeast/oh-resources` is private and unarchived, but its Pages site is
public and live at `https://theflamebeast.github.io/oh-resources/` (HTTP 200); the repo's homepage URL
points at the hyphen-less path, which 404s.

Steps, in order (archiving first would block the settings changes):

1. Unpublish its Pages site.
2. Clear the repo's homepage URL.
3. Archive the repo.
4. Verify: the URL returns 404 and `gh repo view` shows it private and archived.

These change GitHub settings outside this repo: confirm with the owner at the moment of doing them.

## GitHub profile README

Repo `theflamebeast/theflamebeast` (local folder `GitHub\FlameBeast`), a separate repo with its own
commit, done **after** cutover so its link lands on the new site. The owner agreed to this pass. It is
already free of logos; the changes make it match the site's identity rules:

- Lead with name, one line about what the owner builds, and a link to the portfolio.
- Two short lines for Stashout and FlameBurst (linking the showcase repo and the portfolio's case
  studies) and one for Server Insight (Modrinth).
- Contact: GitHub, LinkedIn, email. The Discord handle goes (links are professional only).
- Drop the profile-view counter and the third-party top-languages card (designer's call: it only
  counts public repos, so it misrepresents the private work, and the hosted service is unreliable).
- Pinned repos: add `server-insight` next to `stashout-showcase`. Pinning is done by the owner in
  GitHub's UI; there is no API for it.

## AI workflow files

Same layout as the owner's other repos (`~/.claude/CLAUDE.md`, section "The standard project files"):

- **`CLAUDE.md`**: `# <Name>`, then the shared-rules line, then `## Tech stack`, `## Architecture
  non-negotiables`, `## Layout`, `## Conventions` (with this repo's one-implementation table: the ink
  simulation, the motion helpers, the page-transition curtain, project data), `## Danger zones` (only
  real incidents; three already exist: the broken `/ohresources` link, the headless browser dropping
  `.playwright-mcp/` into the repo root, and Jekyll publishing every Markdown file on `main` while the
  legacy Pages build is on), and `## Workflow` last with `### Build, test, run`, `### Done-checklist
  gates`, `### Review`. It also records the privacy rule from the anti-goals: this repo is public, so
  nothing about the owner's other private projects goes in it.
- **`AGENTS.md`**: the same pointer file the other repos use, word for word.
- **`.claude/last-reviewed`**: the same header comment as the other repos, with the marker set to
  `50f65ff` (the last commit of the old site) and a line saying this is a **baseline, not a review**:
  nothing in this repo has ever been reviewed, so everything after it is backlog.
- **`.gitignore`**: `node_modules/`, `dist/`, `.astro/`, `.playwright-mcp/`, `.superpowers/`.
- No Todoist board is named for this repo, so there is no card workflow here.

## Verification

The repo's done-checklist gates, which `CLAUDE.md` must list:

1. **Typecheck:** `astro check` clean.
2. **Build:** `astro build` succeeds; content schema enforced.
3. **Smoke:** serve `dist/` and load every page in a headless browser: HTTP 200, zero console errors,
   every image loads, no request to a third-party font host, internal links resolve.
4. **Visual:** screenshots of home and both case studies at desktop (1440 x 900) and phone (390 x 844)
   widths, once with motion and once with reduced motion emulated.
5. **Performance:** Lighthouse (mobile) on the home page; record the scores. Target: performance 90+,
   accessibility 95+.
6. Then the standard tail from the global rules: Review, Committed, Pushed, CI (the deploy workflow,
   checked with `gh run list`), and a live check of `https://theflamebeast.github.io/` after deploy.

## Left to the builder

- Implementation of every effect, the page-transition mechanism (Astro's client router or plain
  multi-page with a session flag), and the component structure.
- Exact copy for the hero line, card one-liners and case-study prose, written from the resume bullets
  above; the owner reviews it.
- Which FlameBurst and Stashout images to use, within the media rules.
- The diagrams' drawing style (inline SVG preferred so they theme cleanly).
- Exact breakpoints, durations and easing.
