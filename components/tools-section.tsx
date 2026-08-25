"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import { SectionHead } from "@/components/section-head";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GROUP_SPANS, HERO_TOOL, TOOLS, type IndexedTool } from "@/lib/tools";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ────────────────────────────────────────────────────────────────────
   The tool spectrum.

   Fifty-nine tools laid out as fifty-nine ticks, in fixed positions, with
   a bell-shaped lens gliding to sit over whichever one is selected. The
   ticks do not move — which is the whole point. Position means something
   here: it is the index, so the ten groups become territories the rail
   underneath can label, and a target never slides out from under the
   cursor on the way to being clicked.

   Two encodings, no conflict. Height and brightness say "how close to the
   selection"; colour says "the confirmation gate stands in front of this
   one" — four red ticks in a field of fifty-nine, which is the honest
   shape of the claim.

   ── and the same instrument, on glass ──────────────────────────────

   All of that assumes a tick you can aim at. At 375px the strip is 327px
   wide, which is 5.5px per tick: a target one eighth of the 44px minimum,
   with no hover to fire the tooltip and no room to label a group. Three of
   the four ideas above were already dead on a phone.

   So below a threshold — or on any coarse pointer, at any width, because
   an iPad at 1024px still only gets 17px per tick — the frame of reference
   inverts. The needle pins to the centre and the field scrolls underneath
   it: an analogue tuning dial, which is the same metaphor the lens was
   always reaching for, just seen from the other side. Selection is
   whatever sits under the needle, so there is nothing to aim at at all.

   Native overflow scrolling rather than a hand-rolled drag, because the
   fling physics across fifty-nine items is most of what sells it and is
   very hard to fake: momentum, rubber-band, snap, no `touch-action`
   negotiation with the page's own scroll, and a tap that suppresses itself
   after a drag for free.

   Both modes share `paint`, the panel, and the swap. What forks is only
   what drives `pos`, and where the needle lives.
   ──────────────────────────────────────────────────────────────────── */

const N = TOOLS.length;

/** The lens. Wide enough that the bell reads as a curve, not a spike. */
const SIGMA = 3;
/** And a tight one, so the selected tick alone reaches full brightness. */
const SIGMA_SHARP = 1.4;
/** A slack one for brightness, so the falloff outlives the height. */
const SIGMA_GLOW = 20;

const TICK_MIN = 8;
const TICK_MAX = 96;

/** Room above the ticks for the line that ties a tick to the panel. */
const LEAD = 32;

/** The notch's curve, shared with the nav and the HUD shell. */
const EASE = "power3.inOut";

/**
 * Pixels per tick, below which a tick stops being a thing you can hit and
 * the tuner takes over. Fifty-nine of these needs 649px of strip, which
 * lands the changeover between `sm` and `md` — the `sm` breakpoint's 560px
 * would have given 9.5px, no better than the phone.
 */
const FIT_PX = 11;

/**
 * The tuner's pitch. Fixed rather than fluid, because it is the unit the
 * whole mode is addressed in: with the track padded by half a viewport at
 * each end, tick `i` is centred under the needle at exactly `i * TUNER_PX`
 * of scroll, and the index under the needle is just `scrollLeft / TUNER_PX`.
 * At sixteen, the bell's visible width is ~288px: a full phone screen of
 * curve, where the rail mode could only ever draw a spike.
 */
const TUNER_PX = 16;

/** How far the ticks dissolve at each end, so the strip has no hard cut. */
const FADE = 26;

const gauss = (d: number, sigma: number) =>
  Math.exp(-(d * d) / (2 * sigma * sigma));

const clampIndex = (i: number) => Math.min(N - 1, Math.max(0, i));

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── The swap ─────────────────────────────────────────────────────────
   Lifted from the direction-aware tabs: a long lateral throw, a blur that
   reads as motion blur, and an ease that overshoots its mark and settles
   back rather than merely decelerating into it. The outgoing readout is
   taken out of flow so the incoming one owns the slot at once, and the
   panel's height is tweened between the two so a one-line summary handing
   over to a two-line one does not jolt.

   The throw only runs when a direction was actually chosen — a tap, a step,
   a key. A single fling crosses forty indices, and forty overlapping
   `back.out` tweens is not motion, it is noise. */
const TRAVEL = 300;
const BLUR = 4;
const SWAP_S = 0.44;
/** GSAP's nearest thing to the reference's spring at bounce 0.2. */
const SWAP_EASE = "back.out(1.2)";
/** How long the outgoing readout stays mounted — the tween, plus slack. */
const SWAP_MS = SWAP_S * 1000 + 140;
/** Quiet after the last scroll event before a flick counts as landed. */
const SETTLE_MS = 150;

/** Percent along the axis, at a tick's centre. Ticks are evenly divided. */
const atPercent = (pos: number) => ((pos + 0.5) / N) * 100;

/**
 * One reading, in the column that carries the panel's right half. Labels are
 * a fixed width so the three values line up on one edge — you click through
 * tools and watch the same three answers change in place, which only works
 * if they do not shuffle sideways as their labels vary in length.
 */
function Reading({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-5 border-t border-border py-3.75 first:border-t-0 first:pt-0 last:pb-0">
      <span className="w-18.5 shrink-0 font-mono text-[10px] tracking-[0.16em] text-white/34 uppercase">
        {label}
      </span>
      <span className="text-[clamp(15px,1.3vw,17.5px)] leading-[1.35] font-light">
        {children}
      </span>
    </div>
  );
}

/**
 * Everything the panel says about one tool, in one block — so the whole
 * readout travels together when the pick changes, rather than half of it
 * cross-fading while the other half slides.
 *
 * Two columns rather than a header over a footer strip: the eye reads left
 * to right before it reads down, so what a tool can touch lands second,
 * right after its name, instead of last. That ordering is the argument the
 * section is making — these are disclosures, not a spec appendix.
 */
function Detail({ tool }: { tool: IndexedTool }) {
  return (
    <div className="grid md:grid-cols-[1fr_minmax(330px,40%)]">
      {/* A floor, so the panel does not jolt between a one-line summary and
          a two-line one. */}
      <div className="min-h-44.5 px-8.5 py-8">
        <div className="mb-4 flex items-center gap-3 font-mono text-[10.5px] tracking-[0.14em] text-white/45 uppercase">
          <span>
            {String(tool.groupIndex + 1).padStart(2, "0")} &middot; {tool.group}
          </span>
          <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
          <span className="text-white/34">
            {String(tool.index + 1).padStart(2, "0")} / {N}
          </span>
        </div>

        <h3 className="mb-3.5 font-mono text-[clamp(28px,3.6vw,46px)] leading-[1.02] font-medium tracking-[-0.03em] text-white">
          {tool.name}
        </h3>

        <p className="max-w-[46ch] text-[clamp(15px,1.4vw,19px)] leading-normal font-light text-white/72">
          {tool.summary}
        </p>
      </div>

      {/* Stretched so the rule beside it runs the panel's full height, with
          the readings centred inside rather than the column shrinking. */}
      <div className="flex flex-col justify-center border-t border-border px-8.5 py-6.5 md:border-t-0 md:border-l">
        <Reading label="Touches">
          <span
            className={
              tool.access === "writes" ? "text-white" : "text-white/70"
            }
          >
            {tool.access}
          </span>
        </Reading>
        <Reading label="Gate">
          {tool.gated ? (
            <span className="inline-flex items-center gap-2.5 text-brand-red-text">
              <i
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-brand-red"
              />
              asks first, every time
            </span>
          ) : (
            <span className="text-white/48">not required</span>
          )}
        </Reading>
        <Reading label="Needs">
          <span className={tool.needs ? "text-white/90" : "text-white/48"}>
            {tool.needs ?? "nothing"}
          </span>
        </Reading>
      </div>
    </div>
  );
}

/** One end of the transport. Big enough to hit, quiet enough to ignore. */
function Step({
  dir,
  disabled,
  onPress,
}: {
  dir: -1 | 1;
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = dir < 0 ? CaretLeftIcon : CaretRightIcon;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      aria-label={dir < 0 ? "Previous tool" : "Next tool"}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-white/70 transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-25"
    >
      <span className="flex size-7 items-center justify-center rounded-full border border-input bg-secondary">
        <Icon size={13} weight="bold" />
      </span>
    </button>
  );
}

export function ToolsSection() {
  const [sel, setSel] = useState(HERO_TOOL);
  const [settled, setSettled] = useState(false);
  /* The readout travels the way the pick travelled. `leaving` is the tool on
     its way out — both stay mounted for the length of a swap, which is the
     only way one can shove the other off the edge. */
  const [leaving, setLeaving] = useState<IndexedTool | null>(null);
  const sweep = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLElement>(null);

  /* Which way the last pick went, and where it went from. Refs, not state:
     the swap is driven from a layout effect, and a state updater is not a
     place to be starting timers from. */
  const dirRef = useRef(1);
  const selRef = useRef(HERO_TOOL);
  const swap = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const enter = useRef<HTMLDivElement>(null);
  const exit = useRef<HTMLDivElement>(null);
  const lastH = useRef(0);
  /* Whether the pick is being dragged or flung through, rather than chosen.
     See `sizePanel` for what the panel does about it. */
  const scrubbing = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Painting is 59 style writes a frame, so it never goes through React.
     The tween owns `pos`; `sel` only follows it for the panel's sake. */
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const rails = useRef<(HTMLDivElement | null)[]>([]);
  const line = useRef<HTMLSpanElement>(null);
  const seam = useRef<HTMLSpanElement>(null);
  const pos = useRef({ v: HERO_TOOL });
  const amp = useRef(TOOLS.map(() => ({ v: 1 })));
  /* Hover is painted, not styled: the bars carry an inline scaleY from the
     lens, so a CSS hover rule has nothing it can win against. */
  const hover = useRef<number | null>(null);
  const hoverAmp = useRef({ v: 0 });

  /* ── Mode ───────────────────────────────────────────────────────────
     `tuner` drives the render; `tunerRef` is what `paint` reads, because a
     GSAP callback captures whichever closure was current when its tween
     started and must not go on painting for the mode we just left. */
  const [tuner, setTuner] = useState(false);
  const tunerRef = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const mapWin = useRef<HTMLSpanElement>(null);
  /* Where a programmatic glide is headed. Scroll events keep painting the
     bell on the way, but must not hand the panel over to every index the
     glide passes through. */
  const target = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const entered = useRef(false);

  const paint = () => {
    const p = pos.current.v;
    const activeGroup =
      TOOLS[Math.round(Math.min(N - 1, Math.max(0, p)))].groupIndex;

    for (let i = 0; i < N; i++) {
      const bar = bars.current[i];
      if (!bar) continue;
      const d = i - p;
      let height = TICK_MIN + (TICK_MAX - TICK_MIN) * gauss(d, SIGMA);
      let opacity =
        0.12 +
        0.28 * gauss(d, SIGMA_GLOW) +
        (TOOLS[i].groupIndex === activeGroup ? 0.14 : 0) +
        0.5 * gauss(d, SIGMA_SHARP);

      /* Enough of a lift to be unmistakable out at the tails, where a tick
         is six pixels tall and a width change reads as nothing at all. */
      if (hover.current === i) {
        const h = hoverAmp.current.v;
        height = Math.max(height, TICK_MIN + (TICK_MAX - TICK_MIN) * 0.34 * h);
        opacity = Math.max(opacity, 0.92 * h);
      }

      bar.style.transform = `scaleY(${((height / TICK_MAX) * amp.current[i].v).toFixed(4)})`;
      bar.style.opacity = Math.min(1, opacity).toFixed(3);
    }

    for (let g = 0; g < rails.current.length; g++) {
      const rail = rails.current[g];
      if (rail) rail.style.opacity = g === activeGroup ? "1" : "0.62";
    }

    /* In the tuner the needle does not move — the field does. */
    const left = tunerRef.current ? "50%" : `${atPercent(p)}%`;
    if (line.current) line.current.style.left = left;
    if (seam.current) seam.current.style.left = left;

    if (tunerRef.current) paintWindow();
  };

  /** The lit part of the minimap: which slice of the fifty-nine is on screen. */
  const paintWindow = () => {
    const win = mapWin.current;
    const sc = scroller.current;
    if (!win || !sc) return;
    const total = N * TUNER_PX;
    /* The track is padded by half a viewport at each end, so at index 0 the
       viewport hangs off the left of the content. Clamped, or the window
       would run past the ends of a bar that means "all fifty-nine". */
    const pad = (sc.clientWidth - TUNER_PX) / 2;
    const from = Math.max(0, (sc.scrollLeft - pad) / total);
    const to = Math.min(1, (sc.scrollLeft - pad + sc.clientWidth) / total);
    win.style.left = `${from * 100}%`;
    win.style.width = `${Math.max(0, to - from) * 100}%`;
  };

  /**
   * Hand the readout over, noting which way it went. `animate` is false for
   * a handover the scroll produced, where no direction was chosen and the
   * next one is already 60ms away.
   */
  const handOver = (next: number, animate = true) => {
    const from = selRef.current;
    if (from === next) return;
    dirRef.current = next > from ? 1 : -1;
    selRef.current = next;
    /* Nothing to push the old one out with, so do not mount it at all —
       otherwise it just sits on top of its replacement for half a second. */
    swap.current = animate && !reducedMotion();
    setSel(next);
    if (swap.current) {
      setLeaving(TOOLS[from]);
      if (sweep.current) clearTimeout(sweep.current);
      sweep.current = setTimeout(() => setLeaving(null), SWAP_MS);
    }
  };

  /* ── The panel's height ───────────────────────────────────────────────
     The readout is a display, and a display does not resize while you tune.
     Left to itself the panel varies 41px across the fifty-nine — nothing at
     one pick a second, a shudder at fifteen — so while the pick is being
     dragged or flung through, the height is a high-water mark instead: it
     grows if the incoming readout would not otherwise fit, and never
     shrinks. Growth lands in the same frame as the content that needed it
     (the card clips, so a tween here would show a cut-off row on the way),
     it is monotonic, and it happens once or twice across a whole flick.
     Then one eased tween, when the scroll has actually stopped. */
  const sizePanel = (animate: boolean) => {
    const el = enter.current;
    const st = stage.current;
    if (!el || !st) return;
    const to = el.offsetHeight;
    const from = lastH.current;

    if (scrubbing.current) {
      if (to <= from) return;
      lastH.current = to;
      gsap.set(st, { height: to });
      return;
    }

    lastH.current = to;
    /* `to`, not `fromTo`: an interrupted tween has to carry on from the
       height the box is actually at. Starting each one from the last
       target's height is what made a flick step rather than glide. */
    if (!from || !animate || reducedMotion()) {
      gsap.set(st, { height: to });
      return;
    }
    gsap.to(st, {
      height: to,
      duration: SWAP_S,
      ease: "power3.out",
      overwrite: true,
    });
  };

  /** The pick is moving under a finger. Hold the height. */
  const beginScrub = () => {
    scrubbing.current = true;
    if (settle.current) clearTimeout(settle.current);
    settle.current = null;
  };

  /** Stop holding the height without landing it — a chosen pick is coming,
   *  and its own tween is the one that should get there. */
  const stopScrub = () => {
    scrubbing.current = false;
    if (settle.current) clearTimeout(settle.current);
    settle.current = null;
  };

  /** It has stopped moving. Land the panel on the height it actually wants. */
  const endScrub = (delay = 0) => {
    if (settle.current) clearTimeout(settle.current);
    const land = () => {
      if (!scrubbing.current) return;
      stopScrub();
      sizePanel(true);
    };
    settle.current = delay ? setTimeout(land, delay) : null;
    if (!delay) land();
  };

  useEffect(
    () => () => void (settle.current && clearTimeout(settle.current)),
    [],
  );

  /* Runs after the pick has been committed, with both readouts mounted. */
  useGSAP(
    () => {
      const el = enter.current;
      if (!el) return;
      const throwing = swap.current && !reducedMotion();

      /* Height first, so the panel is already travelling toward its new
         size while the readouts cross. */
      sizePanel(true);

      /* Text rewraps on resize, and the height above is now a fixed number.
         The first callback fires on observe, which would land mid-tween.

         Routed through `sizePanel` rather than writing the height itself:
         a fresh readout is mounted and observed on every handover, so under
         a drag this fires often, and setting the height directly was
         reaching around the high-water mark and shrinking the panel back
         mid-scrub — half the shudder came from here. */
      let settledOnce = false;
      const ro = new ResizeObserver(() => {
        if (!settledOnce) {
          settledOnce = true;
          return;
        }
        sizePanel(false);
      });
      ro.observe(el);

      /* Keyed on `sel`, so this is a fresh node with no inline transform of
         its own. Skipping the tween leaves it exactly where it belongs. */
      if (!throwing) return () => ro.disconnect();

      const d = dirRef.current;
      gsap.fromTo(
        el,
        { x: TRAVEL * d, autoAlpha: 0, filter: `blur(${BLUR}px)` },
        {
          x: 0,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: SWAP_S,
          ease: SWAP_EASE,
          overwrite: true,
        },
      );
      if (exit.current)
        gsap.to(exit.current, {
          x: -TRAVEL * d,
          autoAlpha: 0,
          filter: `blur(${BLUR}px)`,
          duration: SWAP_S,
          ease: SWAP_EASE,
          overwrite: true,
        });

      return () => ro.disconnect();
    },
    { dependencies: [sel], scope: root },
  );

  useEffect(
    () => () => void (sweep.current && clearTimeout(sweep.current)),
    [],
  );

  /* ── Which instrument ───────────────────────────────────────────────
     Width alone is not the test. A coarse pointer needs the tuner at any
     width — an iPad at 1024px still only gets 17px per tick, and no amount
     of room makes a 17px target tappable. */
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const coarse = matchMedia("(pointer: coarse)");
    const measure = () => {
      const next = coarse.matches || sc.clientWidth / N < FIT_PX;
      if (next !== tunerRef.current) {
        tunerRef.current = next;
        setTuner(next);
        return;
      }
      /* The track's end padding is half a viewport, so a resize moves the
         content out from under a `scrollLeft` the browser has preserved.
         Re-seat on the pick rather than letting the needle drift. */
      if (next && entered.current) {
        sc.scrollLeft = selRef.current * TUNER_PX;
        pos.current.v = selRef.current;
        paint();
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    coarse.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      coarse.removeEventListener("change", measure);
    };
    /* `paint` reads nothing but refs, so every version of it behaves
       identically. Listing it would tear the observer down and rebuild it on
       every render, which is the opposite of what the rule is for. */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs only
  }, []);

  /* ── The tuner ──────────────────────────────────────────────────────── */

  /** Stop whatever the scroller was doing and give it back to the finger. */
  const release = () => {
    const sc = scroller.current;
    if (!sc) return;
    gsap.killTweensOf(sc);
    target.current = null;
    sc.style.scrollSnapType = "";
  };

  /* A native scroller answers touch and wheel, and nothing at all to a mouse
     held down and moved — which is every fine pointer narrow enough to be in
     the tuner in the first place. The transport and the minimap already cover
     that case, but the rail's own gesture is drag, and it should not stop
     working just because the window got small. Snap comes off for the length
     of the drag and goes back on at the end, which is what lands it. */
  const mouse = useRef({ x: 0, from: 0, dragging: false });

  const onScrollerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    release();
    const sc = scroller.current;
    if (!sc || e.pointerType !== "mouse") return;
    mouse.current = { x: e.clientX, from: sc.scrollLeft, dragging: false };
  };

  const onScrollerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const sc = scroller.current;
    if (!sc || e.pointerType !== "mouse" || e.buttons !== 1) return;
    const d = e.clientX - mouse.current.x;
    if (!mouse.current.dragging) {
      /* A threshold, so a plain click on a tick still reads as a click. */
      if (Math.abs(d) < 5) return;
      mouse.current.dragging = true;
      sc.style.scrollSnapType = "none";
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    sc.scrollLeft = mouse.current.from - d;
  };

  const onScrollerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mouse.current.dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    mouse.current.dragging = false;
    // Restoring `mandatory` is what commits the landing.
    if (scroller.current) scroller.current.style.scrollSnapType = "";
  };

  /**
   * Scroll tick `i` under the needle. Snap is switched off for the duration:
   * a per-frame `scrollLeft` write against `mandatory` has the browser trying
   * to re-snap under the tween, and restoring it at the end is what commits
   * the landing. Tweened rather than handed to `scrollTo({behavior})` so the
   * curve is the section's own, not the platform's.
   */
  const glide = (i: number, duration: number, ease = "power3.out") => {
    const sc = scroller.current;
    if (!sc) return;
    const to = i * TUNER_PX;
    target.current = i;
    const land = () => {
      target.current = null;
      sc.style.scrollSnapType = "";
    };
    if (reducedMotion()) {
      sc.scrollLeft = to;
      pos.current.v = i;
      paint();
      land();
      return;
    }
    sc.style.scrollSnapType = "none";
    gsap.to(sc, {
      scrollLeft: to,
      duration,
      ease,
      overwrite: true,
      onUpdate: () => {
        pos.current.v = clampIndex(sc.scrollLeft / TUNER_PX);
        paint();
      },
      onComplete: land,
    });
  };

  /* The finger tunes it directly — the bell travels with the scroll rather
     than after it — and the panel follows without the throw, because during
     a fling no direction was chosen and forty overlapping tweens would read
     as noise. */
  const onScroll = () => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const sc = scroller.current;
      if (!sc || !tunerRef.current) return;
      pos.current.v = clampIndex(sc.scrollLeft / TUNER_PX);
      paint();
      if (target.current !== null) return;
      /* Re-armed on every scroll event, so it fires once, when the fling
         and its snap have both finished. */
      beginScrub();
      endScrub(SETTLE_MS);
      const i = Math.round(pos.current.v);
      if (i !== selRef.current) handOver(i, false);
    });
  };

  useEffect(
    () => () =>
      void (frame.current !== null && cancelAnimationFrame(frame.current)),
    [],
  );

  /* ── The rail ───────────────────────────────────────────────────────
     Dragging tunes it directly, cursor to lens, no easing in between. Inert
     in the tuner, where the scroller owns the pointer. */
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef({ from: 0, scrubbing: false });

  const indexAt = (clientX: number) => {
    const box = strip.current?.getBoundingClientRect();
    if (!box) return sel;
    const t = (clientX - box.left) / box.width;
    return clampIndex(Math.round(t * N - 0.5));
  };

  const jump = (i: number) => {
    if (i === Math.round(pos.current.v) && i === sel) return;
    gsap.killTweensOf(pos.current);
    pos.current.v = i;
    /* No direction was chosen here either — the cursor is simply passing
       over this one on its way somewhere. Same treatment as a fling. */
    beginScrub();
    handOver(i, false);
    paint();
  };

  /** Glide to a pick that was actually chosen. The panel changes at once —
   *  waiting would feel laggy. */
  const select = (i: number) => {
    const next = clampIndex(i);
    stopScrub();
    handOver(next);
    if (tunerRef.current) {
      glide(next, 0.28 + Math.min(0.5, Math.abs(next - pos.current.v) * 0.012));
      return;
    }
    if (reducedMotion()) {
      pos.current.v = next;
      paint();
      return;
    }
    gsap.to(pos.current, {
      v: next,
      duration: 0.62 + Math.min(0.38, Math.abs(next - pos.current.v) * 0.014),
      ease: "power3.out",
      onUpdate: paint,
    });
  };

  const lift = (i: number | null) => {
    if (tunerRef.current || reducedMotion()) return;
    if (i !== null) hover.current = i;
    gsap.to(hoverAmp.current, {
      v: i === null ? 0 : 1,
      duration: 0.24,
      ease: "power2.out",
      overwrite: true,
      onUpdate: paint,
      onComplete: () => {
        if (i === null) hover.current = null;
        paint();
      },
    });
  };

  /* ── The minimap ────────────────────────────────────────────────────
     Scrolling buys resolution and spends the overview: with twenty ticks on
     screen, the four red ones can go the whole section unseen, and those
     four in fifty-nine are the claim the spectrum exists to make. So the
     whole axis stays visible in miniature underneath — density, the gate,
     and where you are, at 5.5px per tick, which is useless as a target and
     exactly right as a ruler. Dragging it scrubs, coarsely and honestly;
     the transport either side of it is what lands the last few. */
  const mapTo = (clientX: number) => {
    const box = map.current?.getBoundingClientRect();
    const sc = scroller.current;
    if (!box || !sc) return;
    const t = (clientX - box.left) / box.width;
    sc.scrollLeft = clampIndex(t * N - 0.5) * TUNER_PX;
  };

  /* `touch-action: pan-y` rather than `none`: the minimap is a 44px band
     across the full width, sitting in the middle of the section, and taking
     every gesture over it meant a thumb landing there could not scroll the
     page at all. Vertical belongs to the page; horizontal is ours.

     Which is also why nothing moves on pointerdown. The browser has not yet
     decided whether a touch is a vertical pan, and jumping the pick under a
     thumb that was only on its way past would be worse than the wait — so a
     drag starts on the first horizontal movement, and a tap lands on
     release. */
  const mapDrag = useRef({ x: 0, dragging: false });

  const mapDown = (e: React.PointerEvent<HTMLDivElement>) => {
    mapDrag.current = { x: e.clientX, dragging: false };
  };

  const mapMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    if (!mapDrag.current.dragging) {
      if (Math.abs(e.clientX - mapDrag.current.x) < 4) return;
      mapDrag.current.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      release();
      if (scroller.current) scroller.current.style.scrollSnapType = "none";
    }
    mapTo(e.clientX);
  };

  const mapUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (!mapDrag.current.dragging && e.type === "pointerup") {
      // A tap, not a drag. Land on it.
      release();
      mapTo(e.clientX);
    }
    mapDrag.current.dragging = false;
    // Restoring `mandatory` is what commits the landing.
    if (scroller.current) scroller.current.style.scrollSnapType = "";
  };

  useGSAP(
    () => {
      const sc = scroller.current;

      if (reducedMotion()) {
        amp.current.forEach((a) => (a.v = 1));
        pos.current.v = selRef.current;
        if (tuner && sc) sc.scrollLeft = selRef.current * TUNER_PX;
        entered.current = true;
        setSettled(true);
        paint();
        return;
      }

      /* Re-runs when the mode flips, which after a resize means the intro
         has long since played. Re-seat the instrument, do not replay it. */
      if (entered.current) {
        pos.current.v = selRef.current;
        if (tuner && sc) sc.scrollLeft = selRef.current * TUNER_PX;
        paint();
        return;
      }

      /* Collapsed to the baseline until the section arrives. */
      amp.current.forEach((a) => (a.v = 0));
      pos.current.v = 0;
      if (tuner && sc) sc.scrollLeft = 0;
      paint();

      const tl = gsap.timeline({
        paused: true,
        scrollTrigger: { trigger: root.current, start: "top 74%", once: true },
      });

      /* The bell draws itself from the middle out, then the lens travels
         the axis once and settles. One movement, and the mechanic has
         explained itself without a word of instruction — and in the tuner
         it is the field that travels, which is the same sentence about a
         gesture the phone would otherwise have to be told about. */
      tl.to(amp.current, {
        v: 1,
        duration: 0.5,
        ease: "power2.out",
        stagger: { each: 0.009, from: "center" },
        onUpdate: paint,
      });

      if (tuner) tl.call(() => glide(HERO_TOOL, 1.15, EASE), undefined, 0.34);
      else
        tl.to(
          pos.current,
          { v: HERO_TOOL, duration: 1.15, ease: EASE, onUpdate: paint },
          0.34,
        );

      tl.call(
        () => {
          entered.current = true;
          setSettled(true);
        },
        undefined,
        1.32,
      );

      tl.play();
      return () => {
        tl.scrollTrigger?.kill();
        if (sc) gsap.killTweensOf(sc);
      };
    },
    { dependencies: [tuner], scope: root },
  );

  const tool = TOOLS[sel];

  /* One tick. In the tuner it is a fixed sixteen pixels and a snap point;
     in the rail it divides the strip. The tooltip is a rail-only affair —
     there is no hover to fire it, and under the needle the panel is already
     saying the name thirty-two pixels away. */
  const tick = (t: IndexedTool, i: number) => {
    const button = (
      <button
        key={t.name}
        type="button"
        role="radio"
        aria-checked={i === sel}
        aria-label={t.name}
        // One tab stop for fifty-nine controls; the arrows do the rest.
        // Fifty-nine stops would be hostile.
        tabIndex={i === sel ? 0 : -1}
        onClick={() => {
          if (!drag.current.scrubbing && !mouse.current.dragging) select(i);
        }}
        onMouseEnter={() => lift(i)}
        onMouseLeave={() => lift(null)}
        onFocus={() => lift(i)}
        onBlur={() => lift(null)}
        className={cn(
          "group/tick flex h-full cursor-pointer items-end justify-center focus:outline-none",
          tuner ? "shrink-0 snap-center" : "flex-1",
        )}
        style={tuner ? { width: TUNER_PX } : undefined}
      >
        <span
          ref={(el) => {
            bars.current[i] = el;
          }}
          className={cn(
            "w-0.5 origin-bottom rounded-full transition-[width] duration-200",
            "group-hover/tick:w-0.75 group-focus-visible/tick:w-0.75",
            t.gated ? "bg-brand-red-text" : "bg-white",
          )}
          style={{ height: TICK_MAX }}
        />
      </button>
    );

    /* Returned bare, not wrapped: `h-full` needs a flex parent with a
       definite height, and a wrapper div in between has none. */
    if (tuner) return button;
    return (
      <Tooltip key={t.name}>
        <TooltipTrigger render={button} />
        <TooltipContent className="font-mono text-[11px]">
          {t.name}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <section ref={root} id="features" className="relative py-(--section-y)">
      <div className="mx-auto w-full max-w-7xl px-4">
        <SectionHead
          eyebrow="everything it can do"
          title="10 groups. 59 tools."
          className="mb-10 sm:mb-16"
        >
          Sweep the spectrum to see what any one of them reaches, and what it
          has to ask you for first.
        </SectionHead>

        {/* ── The readout ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-input bg-card">
          {/* Two readouts are mounted for the length of a swap: the pick
              travels in from the edge you clicked toward and shoves the old
              one out the other side. The panel clips, so both leave the frame
              rather than fading on top of it. Timing and easing live in the
              layout effect above — CSS cannot express the overshoot. */}
          <div
            ref={stage}
            className={cn(
              "relative z-10 transition-opacity duration-500",
              settled ? "opacity-100" : "opacity-0",
            )}
          >
            {/* Out of flow, so the incoming readout owns the slot at once
                rather than waiting for this one to finish leaving. Anchored
                at the top and left to its own height — stretching it to the
                stage would squash it as the stage resizes. */}
            {leaving ? (
              <div
                ref={exit}
                key={`out-${leaving.index}`}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0"
              >
                <Detail tool={leaving} />
              </div>
            ) : null}

            <div ref={enter} key={sel}>
              <Detail tool={tool} />
            </div>
          </div>

          {/* Where the line meets the panel. */}
          <span
            ref={seam}
            aria-hidden
            className="absolute -bottom-px z-10 h-px w-7 -translate-x-1/2 bg-white/55"
            style={{ left: `${atPercent(HERO_TOOL)}%` }}
          />
        </div>

        {/* ── The spectrum ───────────────────────────────────────────── */}
        <div className="relative mt-0" style={{ paddingTop: LEAD }}>
          {/* The tie. Constant length — the selected tick is always the
              tallest, so only its x ever changes. */}
          <span
            ref={line}
            aria-hidden
            className="absolute top-0 w-px -translate-x-1/2 bg-linear-to-b from-white/55 to-white/18"
            style={{ height: LEAD, left: `${atPercent(HERO_TOOL)}%` }}
          />

          <div className="relative">
            {/* The needle, carrying the tie on down through the field and
                behind the ticks, so the selected bar sits on the line rather
                than beside it. */}
            {tuner ? (
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 left-1/2 z-0 w-px -translate-x-1/2 bg-linear-to-b from-white/20 to-white/6"
                style={{ height: TICK_MAX }}
              />
            ) : null}

            <div
              ref={scroller}
              onScroll={tuner ? onScroll : undefined}
              onPointerDown={tuner ? onScrollerDown : undefined}
              onPointerMove={tuner ? onScrollerMove : undefined}
              onPointerUp={tuner ? onScrollerUp : undefined}
              onPointerCancel={tuner ? onScrollerUp : undefined}
              /* Lenis owns the page's scroll and eats horizontal wheel
                 deltas at the document, so the strip has to claim them. The
                 `-horizontal` suffix is load-bearing: bare `data-lenis-prevent`
                 makes Lenis skip the event before it stops its own animation
                 loop, which then goes on writing the page's scroll position
                 every frame and undoes the native scroll — a vertical swipe
                 anywhere over the ticks would simply not move the page. This
                 one is gated on the gesture's own orientation, so a vertical
                 gesture is still Lenis's to handle. */
              data-lenis-prevent-horizontal={tuner ? "" : undefined}
              className={cn(
                "relative",
                tuner &&
                  "snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              )}
              style={
                tuner
                  ? {
                      /* Per axis, and inline, both deliberately.

                         `lenis.css` gives every `[data-lenis-prevent-*]`
                         element `overscroll-behavior: contain` — the
                         shorthand, so it lands on the block axis too. And
                         because `overflow-x: auto` computes `overflow-y` up
                         from `visible` to `auto`, this strip is a vertical
                         scroll container with nothing to scroll: contain on
                         that axis means a vertical swipe over the ticks stops
                         dead instead of chaining to the page. Its selector
                         outspecifies a utility class, so the override has to
                         be inline.

                         `x: contain` is the one we do want, and is why the
                         attribute is worth keeping: it stops a fling off the
                         end of the strip from triggering the browser's
                         back-swipe. */
                      overscrollBehaviorX: "contain",
                      overscrollBehaviorY: "auto",
                      // Parameterised by FADE, so it cannot live in a static
                      // `@utility` next to the others.
                      WebkitMaskImage: `linear-gradient(to right, transparent, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent)`,
                      maskImage: `linear-gradient(to right, transparent, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent)`,
                    }
                  : undefined
              }
            >
              {/* Half a viewport of padding at each end is what lets the
                  first and last tick reach the centre — and what makes the
                  index under the needle exactly `scrollLeft / TUNER_PX`. */}
              <div
                className={cn(tuner && "w-max")}
                style={
                  tuner
                    ? { paddingInline: `calc(50% - ${TUNER_PX / 2}px)` }
                    : undefined
                }
              >
                <TooltipProvider delay={80}>
                  <div
                    ref={strip}
                    role="radiogroup"
                    aria-label="Tools"
                    className="relative z-10 flex items-end"
                    style={{ height: TICK_MAX }}
                    onPointerDown={(e) => {
                      if (tuner) return;
                      drag.current = { from: e.clientX, scrubbing: false };
                    }}
                    onPointerMove={(e) => {
                      if (tuner || e.buttons !== 1) return;
                      /* A threshold, so a plain click still glides rather
                         than snapping — the glide is most of what sells the
                         lens. */
                      if (!drag.current.scrubbing) {
                        if (Math.abs(e.clientX - drag.current.from) < 6) return;
                        drag.current.scrubbing = true;
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }
                      jump(indexAt(e.clientX));
                    }}
                    onPointerUp={(e) => {
                      if (tuner) return;
                      if (drag.current.scrubbing) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        endScrub();
                      }
                      drag.current.scrubbing = false;
                    }}
                    onKeyDown={(e) => {
                      const step =
                        e.key === "ArrowRight" || e.key === "ArrowDown"
                          ? 1
                          : e.key === "ArrowLeft" || e.key === "ArrowUp"
                            ? -1
                            : 0;
                      const to = step
                        ? sel + step
                        : e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? N - 1
                            : null;
                      if (to === null) return;
                      e.preventDefault();
                      const next = clampIndex(to);
                      select(next);
                      (
                        e.currentTarget.querySelectorAll("[role=radio]")[
                          next
                        ] as HTMLElement
                      )?.focus({ preventScroll: true });
                    }}
                  >
                    {TOOLS.map(tick)}
                  </div>
                </TooltipProvider>

                {/* The axis, and the ten territories on it. Percentages of
                    its own width, so it needs to know nothing about which
                    mode it is in — in the tuner it simply scrolls with the
                    ticks, and a five-tool group finally gets 80px to put
                    its name in instead of 28. */}
                <div className="relative z-10 mt-2.5 h-7.5">
                  {GROUP_SPANS.map((g, i) => (
                    <div
                      key={g.name}
                      ref={(el) => {
                        rails.current[i] = el;
                      }}
                      className="absolute inset-y-0 px-0.5 transition-opacity duration-300"
                      style={{
                        left: `${(g.start / N) * 100}%`,
                        width: `${((g.end - g.start + 1) / N) * 100}%`,
                      }}
                    >
                      <span className="block h-1.5 rounded-b-[3px] border-x border-b border-white/30" />
                      <span className="mt-1.5 block truncate text-center font-mono text-[10px] tracking-[0.12em] text-white/90 uppercase">
                        {g.short}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── The transport ────────────────────────────────────────
              Flanking the minimap rather than the strip: over the strip
              they would make 88px of a 327px screen undraggable, and the
              step, the position and the overview are one thought anyway. */}
          {tuner ? (
            <div className="mt-3 flex items-center gap-1">
              <Step
                dir={-1}
                disabled={sel === 0}
                onPress={() => select(sel - 1)}
              />

              <div
                ref={map}
                /* The radiogroup above and the two buttons either side are
                   the accessible way through the fifty-nine; this is a
                   pointer shortcut over the same state, and announcing it
                   as a third control would only be noise. */
                aria-hidden
                className="relative h-11 flex-1 cursor-pointer touch-pan-y select-none"
                onPointerDown={mapDown}
                onPointerMove={mapMove}
                onPointerUp={mapUp}
                onPointerCancel={mapUp}
              >
                <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2">
                  {TOOLS.map((t, i) => (
                    <i
                      key={t.name}
                      className={cn(
                        "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                        t.gated
                          ? "h-2.5 w-0.5 bg-brand-red"
                          : "h-1.5 w-px bg-white/22",
                      )}
                      style={{ left: `${atPercent(i)}%` }}
                    />
                  ))}
                </div>
                <span
                  ref={mapWin}
                  className="absolute inset-y-2.5 rounded-[3px] border border-white/25 bg-white/6"
                />
              </div>

              <Step
                dir={1}
                disabled={sel === N - 1}
                onPress={() => select(sel + 1)}
              />
            </div>
          ) : null}
        </div>

        {/* The count the spectrum is making, said plainly. */}
        <div className="mt-9 flex flex-wrap items-center gap-x-4.5 gap-y-2 border-t border-border pt-5 font-mono text-[11.5px] tracking-[0.06em] text-white/36">
          <span>
            <b className="font-normal text-white/72">59</b> tools
          </span>
          <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
          <span>
            <b className="font-normal text-white/72">10</b> groups
          </span>
          <i aria-hidden className="size-0.75 rounded-full bg-white/22" />
          <span className="flex items-center gap-2">
            <i aria-hidden className="size-1.5 rounded-full bg-brand-red" />
            the gate stands in front of four of them
          </span>
        </div>
      </div>
    </section>
  );
}
