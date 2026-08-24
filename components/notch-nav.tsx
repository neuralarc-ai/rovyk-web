"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RovykWordmark,
  WORDMARK_ASPECT,
  WORDMARK_R_SHARE,
} from "@/components/rovyk-wordmark";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The notch nav.

   A black bezel frames the viewport; the nav hangs from its top edge as
   a notch that widens on hover to reveal the links.

   Geometry is taken verbatim from the Figma export. The fillet — the
   curve joining the thin bar to the notch — is a cubic S-curve with
   horizontal tangents at BOTH ends, not a circular arc, so it flows
   continuously into a flat notch bottom with no vertical side and no
   rounded corner. A radial-gradient mask (the usual trick, and what the
   HUD in the hero uses) cannot express that shape.

   Because the fillet is identical in both states, it is a fixed-size
   SVG and only the body's width animates. Nothing morphs, so the curve
   is exact at every frame.
   ──────────────────────────────────────────────────────────────────── */

/* The bezel thickness is `--gut` in globals.css — the same value the sheet
   is inset by. It is read from CSS rather than declared here so the frame and
   the inset cannot drift apart. */
/** Straight from the Figma path: the fillet runs 87px across a 34px drop. */
const FILLET_W = 87;
const NOTCH_H = 34;

/** Figma's easing for the notch — a long settle, almost no overshoot. */
const EASE = "cubic-bezier(.52,.52,0,1)";

/** Leaving and re-entering across the concave gap should not re-trigger. */
const CLOSE_DELAY_MS = 120;

/**
 * How long after mount the notch drops in. Long enough to read as an
 * entrance rather than as part of the first paint, short enough that nobody
 * reaches for a nav that is not there yet.
 */
const REVEAL_DELAY_MS = 900;

/**
 * Where the notch parks when it is away: far enough up that its bottom edge
 * sits exactly on the top of the viewport, so it slides out of the screen's
 * edge rather than fading off the bezel. Its own height plus the strip it
 * hangs from — read from CSS, so the frame and the travel cannot drift.
 */
const PARKED_Y = `calc(-1 * (var(--gut) + ${NOTCH_H}px))`;

/* ── The mark ─────────────────────────────────────────────────────────
   Collapsed, the notch shows only the R, set larger so it reads as a
   mark rather than a clipped word. Opening does two things at once: the
   mark scales down to wordmark size, and the frame around it widens from
   the R's slice to the whole word — so the R settles into place as O V Y
   K arrive behind it.

   Every measurement below is derived from the artwork's own proportions,
   so re-exporting the wordmark cannot silently break the crop. */
const MARK_H_SHUT = 22;
const MARK_H_OPEN = 16;
const MARK_W_SHUT = MARK_H_SHUT * WORDMARK_ASPECT * WORDMARK_R_SHARE;
const MARK_W_OPEN = MARK_H_OPEN * WORDMARK_ASPECT;

/** Per-letter reveal step. Roughly tracks the crop edge as it travels. */
const LETTER_STEP_MS = 90;

/**
 * Brightness of the lit underside where it is strongest — along the body and
 * at the inner end of each fillet. The whole bottom silhouette carries it, so
 * the notch keeps its shape against a black page rather than dissolving into
 * the bar it hangs from.
 */
const EDGE_LIGHT = 0.6;

/**
 * Where the lit edge crosses onto the bar. The fillet does not fade to
 * nothing any more — it hands off at this value to a line that carries on
 * along the bar's bottom edge and dissolves out across the frame, so the
 * notch reads as carved out of a lit edge rather than as a lit object
 * sitting on an unlit one.
 */
const EDGE_BLEED = 0.3;

const LINKS_L = [
  { label: "Where it lives", href: "#where" },
  { label: "Features", href: "#features" },
];
const LINKS_R = [
  { label: "How it works", href: "#how" },
  { label: "Download", href: "#cta" },
];

/**
 * A fillet: the Figma curve, filled, plus the same curve stroked so the lit
 * underside carries on around the corner instead of stopping at the body.
 *
 * `fill` closes along the top edge to fill above the curve; `edge` is the bare
 * curve, so only the silhouette is lit. The stroke fades to nothing at the end
 * that meets the bar, which is what stops the notch looking like it has been
 * pasted on.
 */
const FILLET = {
  l: {
    fill: "M0 0C45.98 0 37 34 87 34V0Z",
    edge: "M0 0C45.98 0 37 34 87 34",
    /* Gradient runs outward → inward, so `0` is always the bar end. */
    from: { x1: 0, x2: FILLET_W },
    margin: "-mr-px",
  },
  r: {
    fill: "M87 0C41.02 0 50 34 0 34V0Z",
    edge: "M87 0C41.02 0 50 34 0 34",
    from: { x1: FILLET_W, x2: 0 },
    margin: "-ml-px",
  },
} as const;

function Fillet({ side }: { side: "l" | "r" }) {
  const { fill, edge, from, margin } = FILLET[side];
  const gradientId = `${useId()}-notch-edge`;

  return (
    <svg
      width={FILLET_W}
      height={NOTCH_H}
      viewBox={`0 0 ${FILLET_W} ${NOTCH_H}`}
      fill="none"
      aria-hidden
      className={cn("block shrink-0 overflow-visible", margin)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          {...from}
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="#fff" stopOpacity={EDGE_BLEED} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={EDGE_BLEED + 0.14} />
          <stop offset="1" stopColor="#fff" stopOpacity={EDGE_LIGHT} />
        </linearGradient>
      </defs>
      <path d={fill} fill="currentColor" />
      {/* Nudged up half a unit: a stroke is centred on its path, so without
          this it straddles the shape's edge and lands half a pixel below the
          body's hairline, leaving a visible step where the two meet. */}
      <path
        d={edge}
        stroke={`url(#${gradientId})`}
        strokeWidth="1"
        fill="none"
        transform="translate(0 -0.5)"
      />
    </svg>
  );
}

/** The links are anchors into the home page. Read from anywhere else — the
 *  legal documents, for now — they have to carry the route with them or they
 *  are five links that do nothing. */
const linkHref = (href: string, home: boolean) => (home ? href : `/${href}`);

function NavSide({
  side,
  open,
  home,
}: {
  side: "l" | "r";
  open: boolean;
  home: boolean;
}) {
  const links = side === "l" ? LINKS_L : LINKS_R;
  return (
    <div
      className={cn(
        "flex items-center gap-5.5 overflow-hidden whitespace-nowrap text-[13.5px] text-white/68",
        // max-width rather than width: the body has no fixed size, it is
        // simply as wide as its content, so revealing the links is what
        // widens the notch.
        open ? "max-w-[320px] opacity-100" : "max-w-0 opacity-0",
        open && (side === "l" ? "pr-6.5" : "pl-6.5"),
        "motion-reduce:transition-none",
      )}
      style={{
        transition: `max-width .55s ${EASE}, padding .55s ${EASE}, opacity .34s ease`,
      }}
      // Collapsed links are off-screen furniture, not content to tab into.
      // React 19 takes `inert` as a real boolean, not the empty-string form.
      inert={!open}
    >
      {links.map((link) => (
        <a
          key={link.href}
          href={linkHref(link.href, home)}
          className="inline-flex h-7.5 items-center rounded-sm px-1 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function NotchNav() {
  const home = usePathname() === "/";
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* The entrance belongs to the page arriving, not to the reader scrolling.
     Tying it to scroll meant the nav was absent until you had already moved
     past something — no use on a page you land halfway down, and none at all
     on one you were reading rather than scrolling. It drops out of the bezel
     once, shortly after mount, and then stays.

     Under reduced motion the slide is off anyway, so waiting would only make
     it appear late for no reason. */
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setShown(true), still ? 0 : REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(
    () => () => void (closeTimer.current && clearTimeout(closeTimer.current)),
    [],
  );

  const hold = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const release = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  return (
    <>
      {/* ── Bezel ─────────────────────────────────────────────────────
          Three fixed strips. Invisible over the black intro, and framing
          from the hero onward — which is what makes the notch read as
          carved out of hardware rather than a bar floating on the page. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-90">
        <div className="absolute inset-x-0 top-0 h-(--gut) bg-black" />
        <div className="absolute inset-y-0 left-0 w-(--gut) bg-black" />
        <div className="absolute inset-y-0 right-0 w-(--gut) bg-black" />
      </div>

      <nav
        aria-label="Main"
        onMouseEnter={hold}
        onMouseLeave={release}
        // Keyboard users never fire hover, so focus opens it too — otherwise
        // the links are unreachable without a mouse.
        onFocusCapture={hold}
        onBlurCapture={release}
        className={cn(
          "fixed top-(--gut) left-1/2 z-100 flex items-start text-black",
          // A little room below the notch so the pointer does not have to
          // thread the concave gap to keep it open.
          "pb-4",
          // It arrives by dropping out of the top edge and leaves the same
          // way. The easing is the notch's own — a long settle, so it slides
          // to a stop rather than snapping into place. The transition lives
          // in a class, not the style below, or `motion-reduce` could not
          // reach past the inline declaration to turn it off.
          "transition-transform duration-[550ms] ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
          shown ? "pointer-events-auto" : "pointer-events-none",
        )}
        // Centring travels with it, so both axes have to be one transform:
        // a Tailwind `-translate-x-1/2` would be overwritten by this.
        style={{ transform: `translate(-50%, ${shown ? "0px" : PARKED_Y})` }}
      >
        {/* The bleed. Sits one pixel up, on the bar's own bottom row, so it
            is continuous with the fillet stroke rather than a second line
            beneath it. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-px right-full h-px w-[20vw]"
          style={{
            background: `linear-gradient(270deg, rgba(255,255,255,${EDGE_BLEED}), transparent)`,
          }}
        />

        <Fillet side="l" />

        <div
          className="relative flex items-center bg-black px-5.5"
          style={{ height: NOTCH_H }}
        >
          <NavSide side="l" open={open} home={home} />

          <Link
            href="/"
            aria-label="Rovyk — home"
            className="flex shrink-0 items-center px-0.5 text-white transition-opacity duration-200 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* The crop. Height is fixed at the taller of the two states so
                the mark never nudges the notch's vertical centre; only the
                width travels. */}
            <div
              className="flex items-center overflow-hidden"
              style={{
                height: MARK_H_SHUT,
                width: open ? MARK_W_OPEN : MARK_W_SHUT,
                transition: `width .55s ${EASE}`,
              }}
            >
              <RovykWordmark
                className={cn(
                  "shrink-0 [&_path]:transition-opacity [&_path]:duration-300",
                  // R is the mark and never fades; the rest arrive in reading
                  // order, each keyed off its own index in the artwork.
                  open
                    ? "[&_path]:opacity-100 [&_path]:delay-[calc(var(--letter-index)*var(--letter-step))]"
                    : "[&_path]:delay-0 [&_path:not(:first-child)]:opacity-0",
                  "motion-reduce:[&_path]:transition-none",
                )}
                style={
                  {
                    height: open ? MARK_H_OPEN : MARK_H_SHUT,
                    transition: `height .55s ${EASE}`,
                    "--letter-step": `${LETTER_STEP_MS}ms`,
                  } as CSSProperties
                }
              />
            </div>
          </Link>

          <NavSide side="r" open={open} home={home} />

          {/* Lit underside along the body. The fillets continue it around
              their curves and fade it out at the bar, so the line traces the
              whole silhouette. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
            style={{ background: `rgba(255,255,255,${EDGE_LIGHT})` }}
          />
        </div>

        <Fillet side="r" />

        <span
          aria-hidden
          className="pointer-events-none absolute -top-px left-full h-px w-[20vw]"
          style={{
            background: `linear-gradient(90deg, rgba(255,255,255,${EDGE_BLEED}), transparent)`,
          }}
        />
      </nav>
    </>
  );
}
