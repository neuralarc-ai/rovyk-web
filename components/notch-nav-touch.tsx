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

   A phone has neither the width for the pointer nav's rail — it opens to
   roughly 760px — nor the hover to open it with. So the top edge carries
   two notches instead: a small hamburger tab at the left, a wider
   wordmark tab at the right. Unequal on purpose; they are a button and a
   badge. Corners also keep them clear of the middle of the screen, where
   the real Dynamic Island lives.

   Each needs one shoulder only — a corner notch is contiguous with the
   bezel's side strip — so the left takes the `r` fillet and the right the
   `l`, squashed but unedited.

   Tapping the hamburger slides a panel in from the left. It arrives
   *behind* the tabs: the hamburger stays put to close it, the wordmark
   never leaves, and the panel is ground while the tabs are void, so
   neither disappears into the other.
   ──────────────────────────────────────────────────────────────────── */

/** Rows follow the panel across rather than arriving with it. The step is
 *  shorter than the wordmark's 90ms — that runs over five letters, this over
 *  seven rows and a floor. */
const ROW_LEAD_MS = 120;
const ROW_STEP_MS = 52;

/** The hamburger, and the cross it folds into: where each rule sits shut, how
 *  far it travels to the middle, and how far it turns. Derived, so `NOTCH_H`
 *  stays the one knob for the tab's height. */
const RULES = [0, 1, 2].map((i) => {
  const top = RULE_Y + RULE_PITCH * i;
  return { top, y: RULE_MID - top, turn: i === 1 ? 0 : i ? -45 : 45 };
});

/** A tab's lit underside; the fillet carries it around its own curve. */
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
 * Where the lit edge crosses onto the bar and dissolves. One line spanning
 * the gap, brightest where each fillet hands it over: two stubs either
 * overlap into a bright band or stop dead a third of the way across.
 *
 * `-top-px` is the trick — the fillet's stroke sits on the bar's own bottom
 * row, so a line at `top-0` lands a pixel below it and the join reads as a
 * step.
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
  const home = usePathname() === "/rovyk";
  const [open, setOpen] = useState(false);
  /** Which destination the reader has got as far as, sampled on open. */
  const [reached, setReached] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  /* Sampled rather than watched: opening is the only moment the answer can
     have changed, because nothing else can scroll the page while it is up. */
  const toggle = useCallback(() => {
    if (!open) setReached(home ? reachedSection() : -1);
    setOpen(!open);
  }, [open, home]);

  const close = useCallback(() => setOpen(false), []);

  /* Lenis animates scroll position on its own ticker, so `overflow: hidden`
     is not something it reads; and with `syncTouch` off, `stop()` does not
     cover native touch scrolling. Both, or the page moves behind the panel. */
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

  /* Focus lands on the panel, not its first link — the panel is the thing
     that arrived. `wasOpen` is why it does not steal focus on first render. */
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      panelRef.current?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  /* Escape only. There was a hand-rolled tab cycle here; it was fifty lines
     of roving-focus for a component that renders only where there is no
     mouse, and its own comment described a cycle ending at the trigger when
     the trigger sat eleventh of thirteen. `aria-modal` is what tells a screen
     reader the rest of the page is out of play. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open || event.key !== "Escape") return;
    event.stopPropagation();
    close();
  };

  /* Close, then let the click carry on. `SmoothScroll` takes in-page anchors
     at the document, so ours runs first — and `setOpen` is batched, so the
     effect cleanup above would not have restarted Lenis in time. Hence the
     two lines it repeats by hand. */
  const onNavigate = useCallback(() => {
    document.documentElement.style.overflow = "";
    getLenis()?.start();
    setOpen(false);
  }, []);

  /** Rows arrive in reading order and leave together — a stagger on the way
   *  out only makes closing feel slow. */
  const beat = (i: number) =>
    open ? `${ROW_LEAD_MS + i * ROW_STEP_MS}ms` : "0ms";

  return (
    <>
      {/* Portalled: the nav carries the entrance transform, and a transformed
          ancestor makes `fixed` resolve against itself — in the tree this
          would be a scrim over a 34px strip. Between bezel and nav in z, so
          the tabs stay above it. */}
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
        aria-label="Main"
        onKeyDown={onKeyDown}
        className={cn(
          // A strip across the top edge so the tabs can sit in its corners,
          // transparent between them, and not swallowing taps meant for the
          // page behind it.
          "pointer-events-none fixed inset-x-0 top-(--gut) z-100",
          "transition-transform duration-550 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
        )}
        style={{
          transform: `translateY(${shown ? "0px" : `calc(-1 * (var(--gut) + ${NOTCH_H}px))`})`,
        }}
      >
        {/* The panel: the width of the frame, inset the same amount the sheet
            is. Rounded only at the bottom — the top butts the frame. */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          inert={!open}
          className={cn(
            "absolute top-0 left-(--gut) right-(--gut) overflow-hidden rounded-b-4xl bg-background outline-none",
            "transition-transform duration-550 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
            open ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{
            height: DRAWER_H,
            /* Its own width *and* the gutter it is inset by. `-100%` alone
               parks the right edge at `--gut`, and the nav sits above the
               bezel — so a 20px column of ground stayed painted over the
               frame, the full height of the page. */
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
                open ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0",
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
                      {/* A rule in the margin, as the legal contents column
                          does it — a place on the page, not a selection. */}
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

            {/* The floor. Thumb-first: the trigger has to live at the top of
                the screen, so what you are most likely to press lives at the
                bottom. */}
            <div
              className={cn(
                "mt-auto flex flex-col gap-4 pt-9",
                "transition-[opacity,transform] duration-500 ease-[cubic-bezier(.52,.52,0,1)] delay-(--beat) motion-reduce:transition-none",
                open ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0",
              )}
              style={{ "--beat": beat(DESTINATIONS.length) } as CSSProperties}
            >
              <Kicker>ready when you are</Kicker>

              {/* Capture, not bubble: in waitlist mode this opens the dialog,
                  and there is only ever one overlay on this site. */}
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
              /* 34px is short of a comfortable target; the pseudo-element
                 grows the hit area into the frame without moving anything
                 that is drawn. Height is `NOTCH_H`, not padding — a fillet's
                 height must equal the mass it joins. */
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

          {/* Right: the identity. A plain link home — the control is at the
              other end, so this can be what it looks like. */}
          <div className="pointer-events-auto relative flex items-start">
            <Fillet side="l" w={FILLET_W_TOUCH} />
            <Link
              href="/rovyk"
              aria-label="Rovyk home"
              className="relative flex items-center justify-center bg-black text-white transition-opacity duration-200 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
