# Round 3: fire, frame, dots and a contact block

Amends `2026-11-11-ink-signature-design.md`. Where they disagree, this file wins.

## Decided by the owner (2026-11-13)

- **Fire colours.** The ink, the live accent and everything drawn from them move from cyan, violet
  and pink to deep red, orange and amber. Neighbouring hues, so mixing stays clean rather than muddy.
- **Hold for bright ink.** Holding the left mouse button keeps pouring bright ink at the cursor,
  whether it moves or not. Mouse only: on touch screens a held finger is a scroll.
- **Side lines.** Thin lines in the live colour run down the left and right edges of the viewport,
  as thin as the footer's top edge, with a light glow. On phones too.
- **Dot type.** The liquid-particles effect from the first round's hero prototypes: big type drawn
  as a grid of dots that the cursor sweeps aside and that spring back.
- **Architecture link.** FlameBurst's case study links to `https://www.flameburst.net/architecture`.

## Calls made by the builder ("do what you think")

- **Hold works with the mouse only**, as above.
- **Dots on the two biggest headlines only:** the hero name and each case study's title. Body
  text, section headings and the footer email stay real type: readability for the people reading
  the site matters more than the effect, and every canvas costs frames. The real heading stays in
  the page for screen readers, search and no-JS; the dots are drawn over it, and it reappears under
  reduced motion or when the canvas cannot start.
- **Contact keeps the email headline and its sweep**, and gains a short invitation and three tiles
  under it: Email (copies, like the headline), LinkedIn and GitHub, each with a small icon, a mono
  label and the handle. The tiles replace the plain text links and the "open in your mail app"
  link; the mail link moves into the Email tile. Our own words and layout. Amended 2026-11-14: the
  owner dropped the Email tile, since the address already shows as the headline, so two tiles
  remain (LinkedIn, GitHub) and the "Open in your mail app" link stays under the headline.
- **The side lines are plain**, not progress bars, and sit outside the content gutter so they never
  touch text. Amended 2026-11-14: the owner also removed the 2 px scroll-progress line along the top
  (round 2 had added it), so the frame is the two side lines.
- **The resting accent moves from blue to an ember orange**, a fill never text, with dark text on it
  (it measures at least 4.5:1). Focus rings use it too.

## Unchanged

Everything else in round 2: the header and picker, the ink transitions and preloader, the footer
sweep, spotlight cards, ink-wash buttons, the hero hint, and every no-JS, reduced-motion and
touch rule.
