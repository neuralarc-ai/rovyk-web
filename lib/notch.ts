/* ────────────────────────────────────────────────────────────────────
   The notch's geometry and its link table.

   Extracted from `components/notch-nav.tsx` because there are now two
   navs hanging off the same shape — a centred notch that widens on
   hover, and a pair of corner notches that open a drawer on tap — and a
   measurement that lived in one of them would be a measurement the
   other could silently disagree with.

   ── The one fact everything below leans on ───────────────────────
   The Figma fillet survives any axis-aligned scale. Both curves have
   their control handles flat against their endpoints — `P1.y == P0.y`
   and `P2.y == P3.y` — so scaling in x or y moves the handles along
   their own axis but never tilts them. The tangents stay horizontal at
   both ends, which is the property the whole shape depends on.

   That is why the fillet can be squashed narrower for a phone and
   stretched twenty times taller for the drawer's shoulder and still be
   exactly the Figma curve rather than an approximation of it. Nothing
   here redraws it.
   ──────────────────────────────────────────────────────────────────── */

import { WORDMARK_ASPECT, WORDMARK_R_SHARE } from "@/components/rovyk-wordmark";

/* Straight from the Figma path: the fillet runs 87px across a 34px drop.
   These two are the artwork's own coordinate space — the curve's control
   points are written in them — so they are what the SVG's viewBox is, and
   never what it is rendered at. Rendered size is the `w`/`h` props, and the
   difference between the two is the scale. Conflating them is why the notch
   could not be made taller: `NOTCH_H` was the viewBox height as well as the
   drawn height, so raising it stretched the box the curve lives in while
   leaving the curve at 34, and the fillet stopped short of its own bottom
   edge. */
export const FILLET_W = 87;
export const FILLET_H = 34;

/**
 * How tall the notch is drawn — the one knob for it.
 *
 * Everything follows: both tabs, both navs' bodies, the fillets beside them,
 * where the hamburger's rules sit, how far the drawer is padded down from the
 * bar, and how far the whole thing parks off-screen. There is no padding to
 * add anywhere; a fillet's height has to equal the height of the mass it
 * joins or its horizontal tangent runs into a vertical edge, so the two
 * cannot be set independently and this is the number that sets both.
 */
export const NOTCH_H = 34;

/**
 * The same curve, squashed, for the two corner notches.
 *
 * At native width they do not fit: a 48px hamburger and a 127px wordmark
 * with an 87px shoulder each come to 345px of a 390px screen, and the two
 * notches read as one black bar with two dents in it rather than as two
 * corners. Squashed to this the gap is 111px, and still 41px on the
 * narrowest phone anyone is holding.
 */
export const FILLET_W_TOUCH = 52;

/** Figma's easing for the notch — a long settle, almost no overshoot. */
export const EASE = "cubic-bezier(.52,.52,0,1)";

/**
 * Brightness of the lit underside where it is strongest — along the body and
 * at the inner end of each fillet. The whole bottom silhouette carries it, so
 * the notch keeps its shape against a black page rather than dissolving into
 * the bar it hangs from.
 */
export const EDGE_LIGHT = 0.6;

/**
 * Where the lit edge crosses onto the bar. The fillet does not fade to
 * nothing any more — it hands off at this value to a line that carries on
 * along the bar's bottom edge and dissolves out across the frame, so the
 * notch reads as carved out of a lit edge rather than as a lit object
 * sitting on an unlit one.
 */
export const EDGE_BLEED = 0.3;

/* ── The mark ─────────────────────────────────────────────────────────
   Collapsed, the centred notch shows only the R, set larger so it reads
   as a mark rather than a clipped word. Opening does two things at once:
   the mark scales down to wordmark size, and the frame around it widens
   from the R's slice to the whole word — so the R settles into place as
   O V Y K arrive behind it.

   Every measurement below is derived from the artwork's own proportions,
   so re-exporting the wordmark cannot silently break the crop. */
export const MARK_H_SHUT = 22;
export const MARK_H_OPEN = 16;
export const MARK_W_SHUT = MARK_H_SHUT * WORDMARK_ASPECT * WORDMARK_R_SHARE;
export const MARK_W_OPEN = MARK_H_OPEN * WORDMARK_ASPECT;

/** Per-letter reveal step, and the beat everything else staggers on. */
export const LETTER_STEP_MS = 90;

/* ── The two corner notches ───────────────────────────────────────────
   A notch anchored to a corner is contiguous with the bezel's side
   strip, so it needs only the shoulder facing inward: the left one takes
   the `r` fillet, the right one the `l`. Both are the existing paths,
   unrotated and unedited. */

/** The hamburger's three rules, and the tab they sit in. */
export const RULE_W = 18;
export const RULE_H = 1.5;
export const RULE_GAP = 5;
export const RULE_PITCH = RULE_H + RULE_GAP;
export const HAM_W = 48;

/** Where the stack sits inside the tab. */
export const RULE_X = (HAM_W - RULE_W) / 2;
export const RULE_Y = (NOTCH_H - (RULE_H * 3 + RULE_GAP * 2)) / 2;
/** Its middle rule, which is where the other two meet to form the cross. */
export const RULE_MID = NOTCH_H / 2 - RULE_H / 2;

/** The wordmark tab: the whole word rather than the R, since a corner has
 *  room for it and there is no hover here to reveal the rest. */
export const WORD_H = 16;
export const WORD_W = WORD_H * WORDMARK_ASPECT;
export const WORD_PAD = 20;
export const WORD_BODY_W = WORD_W + WORD_PAD * 2;

/* ── The drawer ───────────────────────────────────────────────────────
   A panel the width of the frame, sliding in from the left edge. The two
   tabs stay above it and keep their own geometry: it arrives behind
   them, so the hamburger is still there to close it and the wordmark
   never leaves the screen.

   Ground rather than void, so both tabs stay legible on top of it — the
   same pair the whole site is built on, the sheet inside the frame. */

/** Clear of the two tabs, which sit on the drawer rather than above it. */
export const DRAWER_PAD_TOP = NOTCH_H + 26;
export const DRAWER_PAD_X = 20;

/** Floor to ceiling of the framed area. The drawer hangs from the bezel's
 *  bottom edge, so it starts where the tabs start, not below them. */
export const DRAWER_H = "calc(100dvh - 2 * var(--gut))";

/** One row of the index. Seven of these, a kicker and the floor block come
 *  to about four fifths of a phone screen — enough slack to breathe, not
 *  enough to read as a list stranded at the top of an empty panel. */
export const ROW_H = "clamp(56px, 14.5vw, 72px)";

/* ── The links ────────────────────────────────────────────────────── */

export type NavLink = {
  label: string;
  href: string;
  /** The one nav item that is an offer rather than a destination. While the
   *  waitlist flag is on it stops being a link at all — see `lib/flags.ts`. */
  cta?: boolean;
};

export const LINKS_L: NavLink[] = [
  { label: "Where it lives", href: "#where" },
  { label: "Features", href: "#features" },
];
export const LINKS_R: NavLink[] = [
  { label: "How it works", href: "#how" },
  { label: "Download", href: "#cta", cta: true },
];

/** Reading order, for anything that shows them as one list rather than as
 *  two rails either side of the mark. */
export const LINKS: NavLink[] = [...LINKS_L, ...LINKS_R];

/**
 * The drawer's index: the page, in the order you meet it.
 *
 * The rail either side of the centred notch carries four items because four
 * is what fits between two fillets. A drawer has a whole screen, and on a
 * single-page site a menu is a table of contents — so it carries the same
 * sections the footer's index carries, under the labels the nav already uses
 * for the three they have in common.
 *
 * The offer is not in here. It is the button on the floor, which is where
 * you can reach it, rather than an eighth line you have to scroll past.
 */
export const DESTINATIONS: NavLink[] = [
  { label: "Where it lives", href: "#where" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "What sets it apart", href: "#uses" },
  { label: "Control", href: "#safe" },
  { label: "Requirements", href: "#req" },
  { label: "FAQ", href: "#faq" },
];

/** Shorter than the label the buttons use. The centred notch widens to fit
 *  its own contents, so a nav item is the one place where two extra
 *  characters cost geometry rather than nothing. */
export const WAITLIST_NAV_LABEL = "Join waitlist";

/** The links are anchors into the home page. Read from anywhere else — the
 *  legal documents, for now — they have to carry the route with them or they
 *  are five links that do nothing. */
export const linkHref = (href: string, home: boolean) =>
  home ? href : `/${href}`;

/**
 * Where a section counts as the one you are in: a line 40% of the way down
 * the viewport. The index is read as "how far you have got", so the answer is
 * the last anchor whose top has crossed it — not the nearest, which on a page
 * with five sections between two nav links would jump backwards.
 *
 * Sampled at the moment the drawer opens, not watched. The page cannot scroll
 * while it is down, so there is nothing to keep in sync and no reason to put
 * a listener on the scroller for it.
 */
export function reachedSection(): number {
  const line = window.innerHeight * 0.4;
  let reached = -1;
  DESTINATIONS.forEach(({ href }, i) => {
    const el = document.getElementById(href.slice(1));
    if (el && el.getBoundingClientRect().top <= line) reached = i;
  });
  return reached;
}
