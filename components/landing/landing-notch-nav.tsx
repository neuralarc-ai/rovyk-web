"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { RovykWordmark } from "@/components/rovyk-wordmark";
import { Fillet, NotchBezel } from "@/components/notch-fillet";
import {
  EASE,
  EDGE_BLEED,
  EDGE_LIGHT,
  LETTER_STEP_MS,
  MARK_H_OPEN,
  MARK_H_SHUT,
  MARK_W_OPEN,
  MARK_W_SHUT,
  NOTCH_H,
} from "@/lib/notch";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   The landing page's own nav — the same notch shape `NotchNav` hangs off
   the bezel with, but with no links to reveal, on any device.

   Where `NotchNav` opens a rail of links on hover and a whole different
   touch drawer, this has nothing to put in either, so it is not two
   navs branching on pointer capability — it is one nav whose *wordmark*
   either opens on hover (pointer devices, same motion as `NotchNav`) or
   just sits open from the start (touch, which has no hover to ever
   trigger a reveal). No links means no `home`/anchor logic either.
   ──────────────────────────────────────────────────────────────────── */

const CLOSE_DELAY_MS = 120;
const REVEAL_DELAY_MS = 900;
const PARKED_Y = `calc(-1 * (var(--gut) + ${NOTCH_H}px))`;
const POINTER = "(hover: hover) and (pointer: fine)";

export function LandingNotchNav() {
  const [shown, setShown] = useState(false);
  const [pointerCapable, setPointerCapable] = useState(false);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Same entrance as `NotchNav`: drops in once, shortly after mount. */
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setShown(true), still ? 0 : REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  /* Watched rather than read once — same reasoning as `NotchNav`: a
     Surface folded into a tablet, or a phone with a mouse plugged into
     it, can change answer mid-session. */
  useEffect(() => {
    const mq = matchMedia(POINTER);
    const read = () => setPointerCapable(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  useEffect(
    () => () => void (closeTimer.current && clearTimeout(closeTimer.current)),
    [],
  );

  /* Touch never fires hover, so it would otherwise never see past the
     shut "R" — it sits expanded unconditionally instead. */
  const expanded = open || !pointerCapable;

  const hold = () => {
    if (!pointerCapable) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const release = () => {
    if (!pointerCapable) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  return (
    <>
      <NotchBezel />

      <nav
        aria-label="Main"
        onMouseEnter={hold}
        onMouseLeave={release}
        onFocusCapture={hold}
        onBlurCapture={release}
        className={cn(
          "fixed top-(--gut) left-1/2 z-100 flex items-start text-black",
          "pb-4",
          "transition-transform duration-550 ease-[cubic-bezier(.52,.52,0,1)] motion-reduce:transition-none",
          shown ? "pointer-events-auto" : "pointer-events-none",
        )}
        style={{ transform: `translate(-50%, ${shown ? "0px" : PARKED_Y})` }}
      >
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
          <Link
            href="/"
            aria-label="Rovyk"
            className="flex shrink-0 items-center px-0.5 text-white transition-opacity duration-200 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* Fixed at the taller of the two states (shut, 22px) so the
                mark never nudges the notch's vertical centre — only its
                width and the inner SVG's own height travel. */}
            <div
              className="flex items-center overflow-hidden"
              style={{
                height: MARK_H_SHUT,
                width: expanded ? MARK_W_OPEN : MARK_W_SHUT,
                transition: `width .55s ${EASE}`,
              }}
            >
              <RovykWordmark
                className={cn(
                  "shrink-0 [&_path]:transition-opacity [&_path]:duration-300",
                  expanded
                    ? "[&_path]:opacity-100 [&_path]:delay-[calc(var(--letter-index)*var(--letter-step))]"
                    : "[&_path]:delay-0 [&_path:not(:first-child)]:opacity-0",
                  "motion-reduce:[&_path]:transition-none",
                )}
                style={
                  {
                    height: expanded ? MARK_H_OPEN : MARK_H_SHUT,
                    transition: `height .55s ${EASE}`,
                    "--letter-step": `${LETTER_STEP_MS}ms`,
                  } as CSSProperties
                }
              />
            </div>
          </Link>

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
