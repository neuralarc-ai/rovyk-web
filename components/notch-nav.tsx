"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  RovykWordmark,
  WORDMARK_ASPECT,
  WORDMARK_R_SHARE,
} from "@/components/rovyk-wordmark";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

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

/** Reveal once the intro screen starts moving away. */
const REVEAL_AT = 0.12;

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

const LINKS_L = [
  { label: "Where it lives", href: "#where" },
  { label: "Features", href: "#features" },
];
const LINKS_R = [
  { label: "How it works", href: "#how" },
  { label: "Download", href: "#cta" },
];

/**
 * Left fillet. `M0 0 C45.98 0 37 34 87 34 V0 Z` — the Figma path, rebased
 * to its own 87×34 box and closed along the top so it fills above the curve.
 */
function FilletLeft() {
  return (
    <svg
      width={FILLET_W}
      height={NOTCH_H}
      viewBox={`0 0 ${FILLET_W} ${NOTCH_H}`}
      fill="none"
      aria-hidden
      className="-mr-px block shrink-0"
    >
      <path d="M0 0C45.98 0 37 34 87 34V0Z" fill="currentColor" />
    </svg>
  );
}

/** Right fillet — the same path mirrored, exactly as Figma has it. */
function FilletRight() {
  return (
    <svg
      width={FILLET_W}
      height={NOTCH_H}
      viewBox={`0 0 ${FILLET_W} ${NOTCH_H}`}
      fill="none"
      aria-hidden
      className="-ml-px block shrink-0"
    >
      <path d="M87 0C41.02 0 50 34 0 34V0Z" fill="currentColor" />
    </svg>
  );
}

function NavSide({ side, open }: { side: "l" | "r"; open: boolean }) {
  const links = side === "l" ? LINKS_L : LINKS_R;
  return (
    <div
      className={cn(
        "flex items-center gap-[22px] overflow-hidden whitespace-nowrap text-[13.5px] text-white/68",
        // max-width rather than width: the body has no fixed size, it is
        // simply as wide as its content, so revealing the links is what
        // widens the notch.
        open ? "max-w-[320px] opacity-100" : "max-w-0 opacity-0",
        open && (side === "l" ? "pr-[26px]" : "pl-[26px]"),
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
          href={link.href}
          className="inline-flex h-[30px] items-center rounded-[7px] px-1 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function NotchNav() {
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Appears once the intro screen begins to leave. */
  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => setShown(self.scroll() > innerHeight * REVEAL_AT),
    });
    return () => trigger.kill();
  }, []);

  useEffect(() => () => void (closeTimer.current && clearTimeout(closeTimer.current)), []);

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
          "fixed top-(--gut) left-1/2 z-100 flex -translate-x-1/2 items-start text-black",
          // A little room below the notch so the pointer does not have to
          // thread the concave gap to keep it open.
          "pb-4",
          shown ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          "transition-opacity duration-500 ease-out motion-reduce:transition-none",
        )}
      >
        <FilletLeft />

        <div
          className="relative flex items-center bg-black px-[22px]"
          style={{ height: NOTCH_H }}
        >
          <NavSide side="l" open={open} />

          <a
            href="#"
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
                style={{
                  height: open ? MARK_H_OPEN : MARK_H_SHUT,
                  transition: `height .55s ${EASE}`,
                  "--letter-step": `${LETTER_STEP_MS}ms`,
                } as CSSProperties}
              />
            </div>
          </a>

          <NavSide side="r" open={open} />

          {/* Lit underside: a hairline at its brightest dead centre, gone
              before the notch ends — so it never reaches the fillets and
              never has to follow the curve. */}
          <span
            aria-hidden
            className="mask-notch-underlight pointer-events-none absolute inset-0 border-b border-white/95"
          />
        </div>

        <FilletRight />
      </nav>
    </>
  );
}
