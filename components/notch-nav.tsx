"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { Fillet } from "@/components/notch-fillet";
import { NotchNavTouch } from "@/components/notch-nav-touch";
import { JoinWaitlistButton } from "@/components/waitlist/join-waitlist-button";
import { WAITLIST_MODE } from "@/lib/flags";
import {
  EASE,
  EDGE_BLEED,
  EDGE_LIGHT,
  LETTER_STEP_MS,
  LINKS_L,
  LINKS_R,
  NAV_CTA,
  MARK_H_OPEN,
  MARK_H_SHUT,
  MARK_W_OPEN,
  MARK_W_SHUT,
  NOTCH_H,
  WAITLIST_NAV_LABEL,
  linkHref,
} from "@/lib/notch";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The notch nav.

   A black bezel frames the viewport; the nav hangs from its top edge.
   Geometry is taken verbatim from the Figma export and lives in
   `lib/notch.ts`, along with the note on why the fillet can be scaled
   at all — the drawer's shoulder depends on it.

   ── Two ways of opening ──────────────────────────────────────────
   Where there is a pointer, one notch sits in the middle of the top
   edge and widens on hover to reveal the links. Because the fillet is
   identical in both states it is a fixed-size SVG and only the body's
   width animates: nothing morphs, so the curve is exact at every frame.

   Where there is not, that does not work twice over — the rail opens to
   roughly 760px, and the tap that would open it is the same tap that
   follows whatever it is attached to. So touch gets a different nav
   entirely: two corner notches and a drawer. See `notch-nav-touch.tsx`.

   The split is on pointer capability, not on width. A narrow laptop
   window still has hover and should keep the rail; an iPad has the
   width and should not.
   ──────────────────────────────────────────────────────────────────── */

/* The bezel thickness is `--gut` in globals.css — the same value the sheet
   is inset by. It is read from CSS rather than declared here so the frame and
   the inset cannot drift apart. */

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

/** What counts as a pointer device. Hover *and* fine, because a stylus
 *  reports fine without hover and a TV remote the other way round. */
const POINTER = "(hover: hover) and (pointer: fine)";

const NAV_LINK =
  "inline-flex h-7.5 items-center rounded-sm px-1 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * The offer, drawn as a control rather than as a fifth link.
 *
 * Filled, so it is the one thing in the notch that is a shape. Eighteen
 * pixels of it, which is all there is: the body is 34px tall and holds its
 * contents in the upper 22 of them — the `pb-3` below is the lip the lit
 * underside runs along — so a pill centred on the same line as the links has
 * exactly that much room before it starts eating into the notch's own top
 * edge. Chunkier means a shallower lip, not a taller pill.
 */
const NAV_CTA_PILL =
  "inline-flex shrink-0 cursor-pointer items-center rounded-full bg-white px-3 py-1 leading-none font-medium text-black transition-colors duration-200 hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

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
        open ? "max-w-80 opacity-100" : "max-w-0 opacity-0",
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
          className={NAV_LINK}
        >
          {link.label}
        </a>
      ))}

      {/* Inside the rail rather than beside it, so it collapses with the
          links: a call to action that stayed put while the notch shut would
          be a button hanging off a closed notch. */}
      {side === "r" ? (
        WAITLIST_MODE ? (
          <JoinWaitlistButton className={NAV_CTA_PILL}>
            {WAITLIST_NAV_LABEL}
          </JoinWaitlistButton>
        ) : (
          <a href={linkHref(NAV_CTA.href, home)} className={NAV_CTA_PILL}>
            {NAV_CTA.label}
          </a>
        )
      ) : null}
    </div>
  );
}

/** The centred notch, and the rail it opens into on hover. */
function NotchNavPointer({ shown }: { shown: boolean }) {
  const home = usePathname() === "/";
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <nav
      aria-label="Main"
      onMouseEnter={hold}
      onMouseLeave={release}
      // Keyboard users never fire hover, so focus opens it too — otherwise
      // the links are unreachable without a mouse.
      onFocusCapture={hold}
      onBlurCapture={release}
      className={cn(
        "fixed top-(--gut) left-1/2 z-100 flex items-start text-black ",
        // A little room below the notch so the pointer does not have to
        // thread the concave gap to keep it open.
        "pb-4",
        // It arrives by dropping out of the top edge and leaves the same way.
        // The easing is the notch's own — a long settle, so it slides to a
        // stop rather than snapping into place. The transition lives in a
        // class, not the style below, or `motion-reduce` could not reach past
        // the inline declaration to turn it off.
        "transition-transform duration-550 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
        shown ? "pointer-events-auto" : "pointer-events-none",
      )}
      // Centring travels with it, so both axes have to be one transform:
      // a Tailwind `-translate-x-1/2` would be overwritten by this.
      style={{ transform: `translate(-50%, ${shown ? "0px" : PARKED_Y})` }}
    >
      {/* The bleed. Sits one pixel up, on the bar's own bottom row, so it is
          continuous with the fillet stroke rather than a second line beneath
          it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-px right-full h-px w-[20vw]"
        style={{
          background: `linear-gradient(270deg, rgba(255,255,255,${EDGE_BLEED}), transparent)`,
        }}
      />

      <Fillet side="l" />

      <div
        className="relative flex items-center bg-black px-5.5 pb-3"
        style={{ height: NOTCH_H }}
      >
        <NavSide side="l" open={open} home={home} />

        <Link
          href="/"
          aria-label="Rovyk home"
          className="flex shrink-0 items-center px-0.5 text-white transition-opacity duration-200 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {/* The crop. Height is fixed at the taller of the two states so the
              mark never nudges the notch's vertical centre; only the width
              travels. */}
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

        {/* Lit underside along the body. The fillets continue it around their
            curves and fade it out at the bar, so the line traces the whole
            silhouette. */}
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
  );
}

export function NotchNav() {
  const [shown, setShown] = useState(false);
  /* False until the media query has been read, so the server and the first
     client render agree — and so the rail, which is what a desktop gets, is
     never briefly absent on the device it belongs to. */
  const [touch, setTouch] = useState(false);

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

  /* Watched rather than read once: a Surface folded into a tablet, or a phone
     with a mouse plugged into it, changes answer mid-session. */
  useEffect(() => {
    const mq = matchMedia(POINTER);
    const read = () => setTouch(!mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

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

      {/* Remounted rather than branched inside one nav: the two have
          different roots — one centred and content-sized, one spanning the
          top edge — and nothing but the fillet is shared between them. */}
      {touch ? (
        <NotchNavTouch shown={shown} />
      ) : (
        <NotchNavPointer shown={shown} />
      )}
    </>
  );
}
