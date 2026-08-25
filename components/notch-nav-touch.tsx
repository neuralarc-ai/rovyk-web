"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kicker } from "@/components/kicker";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { Fillet } from "@/components/notch-fillet";
import { DownloadButton } from "@/components/cta-button";
import { getLenis } from "@/components/smooth-scroll";
import {
  DESTINATIONS,
  DRAWER_H,
  DRAWER_PAD_TOP,
  DRAWER_PAD_X,
  EDGE_BLEED,
  EDGE_LIGHT,
  FILLET_W_TOUCH,
  HAM_W,
  NOTCH_H,
  ROW_H,
  RULE_H,
  RULE_MID,
  RULE_PITCH,
  RULE_W,
  RULE_X,
  RULE_Y,
  WORD_BODY_W,
  WORD_H,
  linkHref,
  reachedSection,
} from "@/lib/notch";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The notch nav, on a touch screen.

   A pointer device gets one notch in the middle of the top edge that
   widens on hover. A phone has neither the width for that — the rail
   opens to roughly 760px — nor the hover to open it with. So the top
   edge carries two notches instead, one in each corner:

     left   a small square tab, the hamburger, the control
     right  a wider tab carrying the whole wordmark, the identity

   Deliberately unequal. They are a button and a badge, not a symmetric
   pair, and the asymmetry is what stops the top edge reading as chrome.
   Sitting them in the corners also keeps them clear of the middle of
   the screen, which on the phones this is aimed at is where the real
   Dynamic Island already lives.

   Each needs only one shoulder. A corner notch is contiguous with the
   bezel's side strip, so the left one takes the `r` fillet and the right
   one the `l` — the existing paths, squashed but unedited.

   Tapping the hamburger slides a panel in from the left edge, the width
   of the frame. It arrives *behind* the two tabs rather than over them,
   which is the only structural thing about it worth knowing: the
   hamburger is still in place to close it, the wordmark never leaves the
   screen, and the panel is ground while the tabs are void, so neither
   disappears into the other.
   ──────────────────────────────────────────────────────────────────── */

/**
 * How long the rows wait before inking in. The panel takes ~550ms to cross;
 * the rows follow it rather than riding in already finished.
 */
const ROW_LEAD_MS = 120;

/**
 * The stagger between rows. Deliberately shorter than the wordmark's own
 * 90ms step: that one runs across five letters, and this one across seven
 * rows and a floor, where the same beat would still be arriving most of a
 * second after the panel had stopped.
 */
const ROW_STEP_MS = 52;

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The hamburger, and the cross it folds into.
 *
 * `top` is where each rule lives shut; `y` is how far it travels to reach the
 * middle, and the middle one has nowhere to go, so it leaves instead.
 */
const RULES = [
  { top: RULE_Y, y: RULE_MID - RULE_Y, turn: 45 },
  { top: RULE_Y + RULE_PITCH, y: 0, turn: 0 },
  {
    top: RULE_Y + RULE_PITCH * 2,
    y: RULE_MID - (RULE_Y + RULE_PITCH * 2),
    turn: -45,
  },
];

/** A tab's lit underside. The fillet beside it carries the line on around
 *  its own curve, and `Bleed` takes it from there onto the bar. */
function TabEdge() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
      style={{ background: `rgba(255,255,255,${EDGE_LIGHT})` }}
    />
  );
}

/* Each fillet is pulled a pixel over the tab beside it to close the seam, so
   a cluster measures one less than the sum of its parts. */
const GAP_L = HAM_W + FILLET_W_TOUCH - 1;
const GAP_R = FILLET_W_TOUCH + WORD_BODY_W - 1;

/**
 * Where the lit edge crosses onto the bar and dissolves.
 *
 * One line spanning the whole gap rather than a stub hanging off each
 * cluster. Two stubs cannot be made to work: long enough to bloom and they
 * overlap in the middle and add up into a bright band; short enough not to
 * and they stop dead a third of the way across, which is the opposite of an
 * edge running out of light. Spanning the gap and fading toward its centre,
 * the line is brightest exactly where each fillet hands it over and darkest
 * where nothing is holding it up.
 *
 * `-top-px` is the whole trick. The fillet's stroke is centred on a path
 * nudged half a unit up, so it occupies the bar's own bottom row; a line at
 * `top-0` sits one pixel below it and the join reads as a step rather than
 * as one continuous edge.
 */
function Bleed() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-px h-px"
      style={{
        left: GAP_L,
        right: GAP_R,
        background: `linear-gradient(90deg, rgba(255,255,255,${EDGE_BLEED}), transparent 42%, transparent 58%, rgba(255,255,255,${EDGE_BLEED}))`,
      }}
    />
  );
}

export function NotchNavTouch({ shown }: { shown: boolean }) {
  const home = usePathname() === "/";
  const [open, setOpen] = useState(false);
  /** Which destination the reader has got as far as, sampled on open. */
  const [reached, setReached] = useState(-1);
  const navRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  /* Sampled here rather than watched: opening the panel is the only moment
     the answer can have changed, because nothing else can scroll the page
     while it is across. */
  const toggle = useCallback(() => {
    if (!open) setReached(home ? reachedSection() : -1);
    setOpen(!open);
  }, [open, home]);

  const close = useCallback(() => setOpen(false), []);

  /* Lenis does not scroll the body — it animates scroll position itself, on
     its own ticker, so `overflow: hidden` is not something it ever reads. And
     with `syncTouch` off it leaves native touch scrolling alone, which
     `stop()` therefore does not cover. Both, or the page moves behind the
     panel under a drag. Same pairing as the waitlist dialog. */
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    const root = document.documentElement;
    const was = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = was;
      lenis?.start();
    };
  }, [open]);

  /* Focus goes to the panel rather than to its first link: a dialog that
     lands you on a control you did not choose reads as a jump, and the panel
     is the thing that just arrived. It comes back to the trigger on close,
     which is the only reason `wasOpen` exists — restoring focus on the first
     render would steal it from the page. */
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      panelRef.current?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  /**
   * Escape, and a tab cycle that stays inside.
   *
   * Hand-rolled rather than taken from Base UI's Dialog, which is what the
   * waitlist form uses. That one portals its content to the end of the body,
   * and the panel has to stay in the nav's tree — it is positioned against
   * the frame the tabs hang from, and the trigger sits on top of it. So the
   * trap is scoped to the nav, and the trigger is inside the cycle: it is
   * also the close button, which is where the cycle should end up.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;

    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const root = navRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    const on = document.activeElement;

    if (event.shiftKey && (on === first || on === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && on === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /* Close, then let the click carry on. `SmoothScroll` takes in-page anchors
     on a listener at the document, so ours runs first: by the time the glide
     starts, Lenis is running again and the panel is already on its way out —
     which is what makes it read as a hand-off rather than as two steps. */
  const onNavigate = useCallback(() => {
    document.documentElement.style.overflow = "";
    getLenis()?.start();
    setOpen(false);
  }, []);

  /** Rows arrive in reading order behind the panel's own edge, and leave
   *  together — a stagger on the way out only makes closing feel slow. */
  const beat = (i: number) =>
    open ? `${ROW_LEAD_MS + i * ROW_STEP_MS}ms` : "0ms";

  return (
    <>
      {/* ── The scrim ───────────────────────────────────────────────
          The panel covers the frame, so this is mostly for the strip
          below it — the bezel has no bottom edge of its own — and for
          the moment on either side of the slide when the page is still
          showing.

          Portalled, because the nav carries the entrance transform and a
          transformed ancestor makes `fixed` resolve against itself
          rather than the viewport, which would make this a scrim over a
          34px strip. Between the bezel and the nav in z, so the two
          black tabs stay above it. */}
      {createPortal(
        <div
          aria-hidden
          onClick={close}
          className={cn(
            "fixed inset-0 z-95 bg-black/80 transition-opacity duration-500 motion-reduce:transition-none",
            open
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        />,
        document.body,
      )}

      <nav
        ref={navRef}
        aria-label="Main"
        onKeyDown={onKeyDown}
        className={cn(
          // A strip across the whole top edge, so the two tabs can sit in its
          // corners — but transparent between them, and the strip itself must
          // not swallow taps meant for the page behind it.
          "pointer-events-none fixed inset-x-0 top-(--gut) z-100",
          "transition-transform duration-550 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
        )}
        style={{
          transform: `translateY(${shown ? "0px" : `calc(-1 * (var(--gut) + ${NOTCH_H}px))`})`,
        }}
      >
        {/* ── The panel ─────────────────────────────────────────────
            The width of the frame, in from the left, and inset the same
            amount the sheet is so it lands on the bezel rather than
            covering it. Rounded only at the bottom: the top edge butts
            the frame, the way every other surface on this site does. */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          // Off-screen furniture, not content to tab into.
          inert={!open}
          className={cn(
            "absolute top-0 left-(--gut) right-(--gut) overflow-hidden rounded-b-4xl bg-background outline-none",
            "transition-transform duration-550 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
            open ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{
            height: DRAWER_H,
            /* Its own width *and* the gutter it is inset by. `-100%` alone
               parks the right edge at `--gut` rather than at zero — and the
               nav sits above the bezel, so what was left on screen was a
               20px column of the panel's own ground painted over the frame's
               black, the full height of the page. */
            transform: open
              ? "translateX(0)"
              : "translateX(calc(-100% - var(--gut)))",
            boxShadow: `inset 0 -1px 0 rgba(255,255,255,${EDGE_BLEED / 2})`,
          }}
        >
          <div
            className="flex h-full flex-col overflow-y-auto overscroll-contain"
            style={{
              paddingTop: DRAWER_PAD_TOP,
              paddingLeft: DRAWER_PAD_X,
              paddingRight: DRAWER_PAD_X,
              paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom))",
            }}
          >
            <Kicker
              className={cn(
                "mb-4 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
                open
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-50 opacity-0",
              )}
            >
              where to go
            </Kicker>

            <ul className="flex flex-col">
              {DESTINATIONS.map(({ label, href }, i) => {
                const here = i === reached;
                return (
                  <li
                    key={href}
                    className={cn(
                      "border-b border-white/10",
                      "transition-[opacity,transform] duration-500 ease-[cubic-bezier(.52,.52,0,1)] delay-(--beat) motion-reduce:transition-none",
                      open
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-6 opacity-0",
                    )}
                    style={{ "--beat": beat(i) } as CSSProperties}
                  >
                    <a
                      href={linkHref(href, home)}
                      onClick={onNavigate}
                      aria-current={here ? "true" : undefined}
                      className="relative flex items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      style={{ height: ROW_H }}
                    >
                      {/* The mark the legal contents column uses, at this
                          scale: a rule in the margin rather than a highlight,
                          so it reads as a place on the page and not as a
                          selection. */}
                      {here ? (
                        <span
                          aria-hidden
                          className="absolute top-1/2 -left-2.5 h-6 w-px -translate-y-1/2 bg-white"
                        />
                      ) : null}
                      <span
                        className={cn(
                          "font-mono text-[11px] tabular-nums transition-colors duration-350",
                          here ? "text-white" : "text-white/28",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "text-[clamp(25px,7.4vw,34px)] leading-none tracking-[-0.03em] transition-colors duration-350",
                          here ? "text-white" : "text-white/48",
                        )}
                      >
                        {label}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>

            {/* ── The floor ──────────────────────────────────────────
                The offer, then the two things a product asking for
                Accessibility access owes the reader. Thumb-first: the
                trigger has to live at the top of the screen, so
                everything you are most likely to press lives at the
                bottom. */}
            <div
              className={cn(
                "mt-auto flex flex-col gap-4 pt-9",
                "transition-[opacity,transform] duration-500 ease-[cubic-bezier(.52,.52,0,1)] delay-(--beat) motion-reduce:transition-none",
                open ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0",
              )}
              style={{ "--beat": beat(DESTINATIONS.length) } as CSSProperties}
            >
              {/* Capture, not bubble: in waitlist mode this opens the dialog,
                  and there is only ever one overlay on this site. Closing
                  first means the panel is already on its way out as it
                  arrives. */}
              <Kicker>ready when you are</Kicker>

              <div onClickCapture={onNavigate}>
                <DownloadButton
                  href={linkHref("#cta", home)}
                  className="w-full"
                >
                  Download for Apple Silicon
                </DownloadButton>
              </div>

              <div className="flex items-center justify-between pt-1 text-[12.5px] text-white/44">
                <a
                  href="mailto:hello@neuralarc.ai"
                  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  hello@neuralarc.ai
                </a>
                <span className="flex items-center gap-4">
                  <Link
                    href="/terms"
                    onClick={onNavigate}
                    className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Terms
                  </Link>
                  <Link
                    href="/privacy"
                    onClick={onNavigate}
                    className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Privacy
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── The two tabs ──────────────────────────────────────────── */}
        <div className="relative z-10 flex items-start justify-between text-black">
          <Bleed />

          {/* Left: the control. */}
          <div className="pointer-events-auto relative flex items-start">
            <button
              ref={triggerRef}
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={toggle}
              /* The tab is 34px tall, which is short of a comfortable target.
                 The pseudo-element grows the hit area downward into the frame
                 without moving anything that is drawn. */
              className="relative bg-black after:absolute after:-inset-y-2.5 after:-right-3 after:left-0 after:content-['']" 
              style={{ width: HAM_W, height: NOTCH_H }}
            >
              {RULES.map(({ top, y, turn }, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="absolute bg-white transition-[transform,opacity] duration-400 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none"
                  style={{
                    left: RULE_X,
                    top,
                    width: RULE_W,
                    height: RULE_H,
                    opacity: open && !turn ? 0 : 0.68,
                    transform: open
                      ? `translateY(${y}px) rotate(${turn}deg)`
                      : "none",
                  }}
                />
              ))}
              <TabEdge />
            </button>
            <Fillet side="r" w={FILLET_W_TOUCH} />
          </div>

          {/* Right: the identity. A plain link home, and nothing else — the
              control is at the other end, so this can be exactly what it
              looks like. */}
          <div className="pointer-events-auto relative flex items-start">
            <Fillet side="l" w={FILLET_W_TOUCH} />
            <Link
              href="/"
              aria-label="Rovyk home"
              className="relative flex items-center justify-center bg-black text-white transition-opacity duration-200 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pb-3"
              style={{ width: WORD_BODY_W, height: NOTCH_H }}
            >
              <RovykWordmark style={{ height: WORD_H }} />
              <TabEdge />
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
