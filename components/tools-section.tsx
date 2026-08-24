"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
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

const gauss = (d: number, sigma: number) =>
  Math.exp(-(d * d) / (2 * sigma * sigma));

/* ── The swap ─────────────────────────────────────────────────────────
   Lifted from the direction-aware tabs: a long lateral throw, a blur that
   reads as motion blur, and an ease that overshoots its mark and settles
   back rather than merely decelerating into it. The outgoing readout is
   taken out of flow so the incoming one owns the slot at once, and the
   panel's height is tweened between the two so a one-line summary handing
   over to a two-line one does not jolt. */
const TRAVEL = 300;
const BLUR = 4;
const SWAP_S = 0.44;
/** GSAP's nearest thing to the reference's spring at bounce 0.2. */
const SWAP_EASE = "back.out(1.2)";
/** How long the outgoing readout stays mounted — the tween, plus slack. */
const SWAP_MS = SWAP_S * 1000 + 140;

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
  const stage = useRef<HTMLDivElement>(null);
  const enter = useRef<HTMLDivElement>(null);
  const exit = useRef<HTMLDivElement>(null);
  const lastH = useRef(0);

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

    const left = `${atPercent(p)}%`;
    if (line.current) line.current.style.left = left;
    if (seam.current) seam.current.style.left = left;
  };

  /** Hand the readout over, noting which way it went. */
  const handOver = (next: number) => {
    const from = selRef.current;
    if (from === next) return;
    dirRef.current = next > from ? 1 : -1;
    selRef.current = next;
    setSel(next);
    /* Nothing to push the old one out with, so do not mount it at all —
       otherwise it just sits on top of its replacement for half a second. */
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLeaving(TOOLS[from]);
      if (sweep.current) clearTimeout(sweep.current);
      sweep.current = setTimeout(() => setLeaving(null), SWAP_MS);
    }
  };

  /* Runs after the pick has been committed, with both readouts mounted. */
  useGSAP(
    () => {
      const el = enter.current;
      if (!el) return;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* Height first, so the panel is already travelling toward its new
         size while the readouts cross. */
      const to = el.offsetHeight;
      if (stage.current) {
        const from = lastH.current;
        lastH.current = to;
        if (!from || reduced) gsap.set(stage.current, { height: to });
        else
          gsap.fromTo(
            stage.current,
            { height: from },
            {
              height: to,
              duration: SWAP_S,
              ease: "power3.out",
              overwrite: true,
            },
          );
      }

      /* Text rewraps on resize, and the height above is now a fixed number.
         The first callback fires on observe, which would land mid-tween. */
      let settledOnce = false;
      const ro = new ResizeObserver(() => {
        if (!settledOnce) {
          settledOnce = true;
          return;
        }
        if (!stage.current || !enter.current) return;
        lastH.current = enter.current.offsetHeight;
        gsap.set(stage.current, { height: lastH.current });
      });
      ro.observe(el);

      if (reduced) return () => ro.disconnect();

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

  /** Glide the lens. The panel changes at once — waiting would feel laggy. */
  const select = (i: number) => {
    const next = Math.min(N - 1, Math.max(0, i));
    handOver(next);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  /* Dragging tunes it directly, finger to lens, no easing in between. On a
     phone a tick is five pixels wide and no amount of padding fixes that —
     so touch does not aim at one, it sweeps the whole axis. */
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef({ from: 0, scrubbing: false });

  const indexAt = (clientX: number) => {
    const box = strip.current?.getBoundingClientRect();
    if (!box) return sel;
    const t = (clientX - box.left) / box.width;
    return Math.min(N - 1, Math.max(0, Math.round(t * N - 0.5)));
  };

  const jump = (i: number) => {
    if (i === Math.round(pos.current.v) && i === sel) return;
    gsap.killTweensOf(pos.current);
    pos.current.v = i;
    handOver(i);
    paint();
  };

  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setSettled(true);
        paint();
        return;
      }

      /* Collapsed to the baseline until the section arrives. */
      amp.current.forEach((a) => (a.v = 0));
      pos.current.v = 0;
      paint();

      const tl = gsap.timeline({
        paused: true,
        scrollTrigger: { trigger: root.current, start: "top 74%", once: true },
      });

      /* The bell draws itself from the middle out, then the lens travels
         the axis once and settles. One movement, and the mechanic has
         explained itself without a word of instruction. */
      tl.to(amp.current, {
        v: 1,
        duration: 0.5,
        ease: "power2.out",
        stagger: { each: 0.009, from: "center" },
        onUpdate: paint,
      })
        .to(
          pos.current,
          { v: HERO_TOOL, duration: 1.15, ease: EASE, onUpdate: paint },
          0.34,
        )
        .call(() => setSettled(true), undefined, 1.32);

      tl.play();
      return () => void tl.scrollTrigger?.kill();
    },
    { scope: root },
  );

  const tool = TOOLS[sel];

  return (
    <section
      ref={root}
      id="features"
      className="relative py-[clamp(96px,12.5vh,158px)]"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <SectionHead
          eyebrow="everything it can do"
          title="Ten groups. Fifty-nine tools."
          className="mb-16"
        >
          You never name one. Pick any tick to see what it reaches, and what it
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

          <TooltipProvider delay={80}>
            <div
              ref={strip}
              role="radiogroup"
              aria-label="Tools"
              className="relative z-10 flex touch-pan-y items-end"
              style={{ height: TICK_MAX }}
              onPointerDown={(e) => {
                drag.current = { from: e.clientX, scrubbing: false };
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return;
                /* A threshold, so a plain click still glides rather than
                   snapping — the glide is most of what sells the lens. */
                if (!drag.current.scrubbing) {
                  if (Math.abs(e.clientX - drag.current.from) < 6) return;
                  drag.current.scrubbing = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }
                jump(indexAt(e.clientX));
              }}
              onPointerUp={(e) => {
                if (drag.current.scrubbing)
                  e.currentTarget.releasePointerCapture(e.pointerId);
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
                const next = Math.min(N - 1, Math.max(0, to));
                select(next);
                (
                  e.currentTarget.querySelectorAll("[role=radio]")[
                    next
                  ] as HTMLElement
                )?.focus();
              }}
            >
              {TOOLS.map((t, i) => (
                <Tooltip key={t.name}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        role="radio"
                        aria-checked={i === sel}
                        aria-label={t.name}
                        // One tab stop for fifty-nine controls; the arrows
                        // do the rest. Fifty-nine stops would be hostile.
                        tabIndex={i === sel ? 0 : -1}
                        onClick={() => {
                          if (!drag.current.scrubbing) select(i);
                        }}
                        onMouseEnter={() => lift(i)}
                        onMouseLeave={() => lift(null)}
                        onFocus={() => lift(i)}
                        onBlur={() => lift(null)}
                        className="group/tick flex h-full flex-1 cursor-pointer items-end justify-center focus:outline-none"
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
                    }
                  />
                  <TooltipContent className="font-mono text-[11px]">
                    {t.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* The axis, and the ten territories on it. */}
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
                {/* Below `sm` a five-tool group gets ~30px, which turns every
                    label into an ellipsis. The brackets still draw the
                    territories, and the panel already names the group. */}
                <span className="mt-1.5 hidden truncate text-center font-mono text-[10px] tracking-[0.12em] text-white/90 uppercase sm:block">
                  {g.short}
                </span>
              </div>
            ))}
          </div>
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
