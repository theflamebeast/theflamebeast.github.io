# Round 2: the ink is the signature

Approved by the owner in chat on 2026-11-11, after seeing Tasks 1 to 7 of the first plan built. This
document amends `2026-11-10-portfolio-redesign-design.md`; where the two disagree, this one wins.
Everything the first design says about identity, privacy, the three projects, media rules, tech and
deploy still holds.

## Why

The ink hero is the most distinctive thing on the site; the effects around it were the ones any
portfolio might have. The owner, seeing it built, asked for the whole site to be "cooler and unique".
So the ink becomes the thread through everything, and the generic effects around it go.

## Goals

- One idea carried everywhere: the ink's colour and behaviour show up in navigation, transitions,
  hover states and the footer.
- Cleaner: fewer moving parts on screen at once, nothing decorative that does no job.
- Everything already on the site stays reachable: three projects, About, certs, contact.

## Anti-goals

- The first design's anti-goals all stand. In particular **nothing trails the cursor as a floating
  preview card**: every project preview in this round sits in a fixed place.
- A live colour used for text. The live ink colour is decoration and fills; body text keeps the
  token colours.
- A cover that can strand the page. Anything that hides content at load must remove itself without
  JavaScript's help.

## Cut

| Cut | Why |
|---|---|
| Rotating arrows (hero cue, "Next project") | The owner disliked them. |
| Footer headline "Have a role, a project or a question?" and the round "Get in touch" button | The owner disliked the headline; the button goes with it. |
| Floating round menu button and side menu panel (never shipped) | The header picker replaces it. |
| Magnetic lean on buttons (never shipped) | Replaced by the ink-wash hover. |
| Curved-curtain page transition and curved footer edge | Replaced by the ink transition and the glowing footer edge. |
| "Let's talk" rolling text | Already cut on 2026-11-11. |

## What replaces them

1. **Download count.** Server Insight shows a rounded-down compact figure with a plus: 1,831 reads
   `1.8k+`, 1,999 reads `1.9k+`, 2,000 reads `2k+`. Never a figure above the real count. The site
   rebuilds weekly on a schedule so the figure stays current without a push.
2. **Hero hint.** A small mono line, "Move your cursor" (on touch screens "Tap to splash"), shown
   only while the live simulation is running, and gone after the visitor's first stir or tap.
3. **Next project.** The link at the foot of a case study shows the next project's cover in a fixed
   frame beside the title: revealed on hover or keyboard focus where hovering exists, always shown on
   touch screens.
4. **Footer.** The email address is the headline: one line, as large as the width allows. On hover
   or focus a band of ink colour sweeps through the letters. Clicking copies the address and says
   "Copied"; if copying is not possible the click opens the mail app instead, and without JavaScript
   it is an ordinary `mailto:` link. GitHub and LinkedIn sit with it, then local time, place and the
   copyright line. The footer's top edge is a thin glowing line in the live ink colour.
5. **Header.** Fixed to the top on every page. It slides away when scrolling down and returns when
   scrolling up, and never hides while something inside it has focus or the picker is open. Under
   reduced motion it stays put.
6. **Work picker.** "Work" in the header opens a panel under it listing the three projects as large
   rows. A fixed preview area beside the rows shows the pointed-at or focused project: its cover for
   Stashout and FlameBurst, its download figure for Server Insight. Stashout and FlameBurst open
   their case studies; Server Insight opens its Modrinth page. Opens on hover (where hovering
   exists), on click or tap, and from the keyboard; Escape closes it and returns focus. Below 720 px
   the panel is the rows alone. Without JavaScript "Work" is a plain link to the work section.
7. **Ink page transitions.** On a click, ink spreads across the screen from the point clicked, with
   a soft edge, showing the destination's name; the new page then opens out from the same point.
   Back and forward do the same from the centre. Under reduced motion navigation is instant.
8. **Preloader.** Once per browser session, on whichever page loads first: the page starts under
   the ink and opens out from the centre. Content is never held back more than 1.5 s, and the cover
   lifts on its own if scripts fail. Not shown under reduced motion or without JavaScript.
9. **Living accent.** One CSS colour, the ink's current hue, drifts from cyan through violet to
   pink on the same clock as the hero's ink. It colours a thin scroll-progress line at the top of
   the page, the footer's glowing edge, button hover fills and the footer email sweep. Blue stays
   the colour of resting buttons and focus rings. Under reduced motion the colour holds still.
10. **Spotlight cards.** On the two large project cards the screenshot sits slightly dimmed and the
    cursor lights the area around it. Full brightness on touch screens and without JavaScript.
11. **Buttons.** No lean. On hover a wash of the live ink colour rises through the button and the
    label turns dark.

## Staying as built

The ink hero, smooth scrolling, line-by-line reveals, parallax, the two screenshot rows, the live
clock, and the case-study video with its pause button.

## Calls made by the builder, not the owner

- Server Insight's row in the picker links to Modrinth, since it has no case study.
- The email click copies rather than opening the mail app; a small "open in your mail app" link sits
  beside it for anyone who wants that.
- The live colour is the ink's hue at a lighter saturation, chosen so dark label text on it always
  meets WCAG AA.
- The preloader is the page-transition cover opening from the centre, not a second animation.
