"use client";

import { useCallback, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HeroOrb } from "@/components/hero-orb";
import { SectionHead } from "@/components/section-head";
import { getLenis } from "@/components/smooth-scroll";
import { ORB_BEATS, ORB_RAIL, type OrbGlow } from "@/lib/orb-beats";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ────────────────────────────────────────────────────────────────────
   The orb — five states, read by scrolling.

   Prose scrolls past a held orb: whichever beat is crossing the middle
   of the screen owns the orb, and the orb dissolves from one geometry
   into the next. No timer, so no autoplay to pause and nothing to
   interrupt — the reader is the clock, which is the right bargain for a
   section whose whole claim is that you can always tell which state it
   is in.

   Under reduced motion none of that applies: the sticky column and the
   dissolve both go, and the five states are laid out side by side as
   five still frames. That is a different layout rather than the same
   one with its transitions switched off.
   ──────────────────────────────────────────────────────────────────── */

/**
 * Where a beat is considered to have arrived. On a wide screen that is the
 * middle of the viewport, as the reference has it — but stacked, the orb is
 * pinned across the top half, so the middle is *behind* it and the beat
 * taking over would be one nobody can read yet. Below `lg` the line drops
 * into the band the prose actually occupies.
 */
const ANCHOR = { wide: "center", stacked: "76%" };

const GLOW: Record<OrbGlow, string> = {
  neutral:
    "radial-gradient(52% 42% at 50% 50%, rgba(255,255,255,.055), transparent 70%)",
  indigo:
    "radial-gradient(52% 42% at 50% 50%, rgba(85,90,244,.15), transparent 70%)",
  pink: "radial-gradient(52% 42% at 50% 50%, rgba(251,178,251,.12), transparent 70%)",
};

const GLOWS = Object.keys(GLOW) as OrbGlow[];

/** The orb is sized in CSS but drawn in device pixels, so the canvas has to
 *  be told a number. Measured rather than guessed at a breakpoint. */
function useMeasured() {
  const [size, setSize] = useState(0);
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize(Math.round(e.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function Beat({ beat }: { beat: (typeof ORB_BEATS)[number] }) {
  return (
    <>
      <span className="inline-flex items-center gap-2 self-start font-mono text-[10.5px] font-semibold tracking-[0.16em] text-white/52 uppercase">
        <i
          aria-hidden
          className="size-[5px] shrink-0 rounded-full bg-white/28 transition-colors duration-500 group-data-[on=true]/beat:bg-brand-indigo"
        />
        {beat.label} &middot; {beat.mode}
      </span>

      <h3 className="text-[clamp(28px,3.4vw,46px)] leading-[1.06] tracking-[-0.03em] text-white">
        {beat.title}
      </h3>

      <p className="max-w-[42ch] text-[16px] leading-[1.6] font-light text-white/68">
        {beat.body}
      </p>

      <span className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10.5px] tracking-[0.03em] text-white/45">
        <i aria-hidden className="size-1 shrink-0 rounded-full bg-white/30" />
        {beat.fact}
      </span>
    </>
  );
}

export function OrbSection() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const beats = useRef<(HTMLDivElement | null)[]>([]);
  const rail = useRef<(HTMLButtonElement | HTMLSpanElement | null)[]>([]);
  const [orbBox, orbSize] = useMeasured();

  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setReduced(true);
        return;
      }

      /* One trigger per beat, spanning the anchor line. The beats are
         contiguous, so one beat's end is the next one's start and exactly
         one is ever live — no per-frame measuring of all five. */
      const mm = gsap.matchMedia();
      const wire = (at: string) => () => {
        beats.current.forEach((el, i) => {
          if (!el) return;
          ScrollTrigger.create({
            trigger: el,
            start: `top ${at}`,
            end: `bottom ${at}`,
            onToggle: ({ isActive }) => isActive && setActive(i),
          });
        });

        /* The rail is painted, not rendered: it tracks the scrollbar and has
           no business re-rendering thirteen nodes to do it. */
        ScrollTrigger.create({
          trigger: column.current,
          start: `top ${at}`,
          end: `bottom ${at}`,
          onUpdate: ({ progress }) => {
            const on = Math.min(
              ORB_RAIL.length - 1,
              Math.floor(progress * ORB_RAIL.length),
            );
            rail.current.forEach((node, i) =>
              node?.setAttribute("data-cur", String(i === on)),
            );
          },
        });
      };

      mm.add("(min-width: 1024px)", wire(ANCHOR.wide));
      mm.add("(max-width: 1023.98px)", wire(ANCHOR.stacked));

      return () => void mm.revert();
    },
    { scope: root },
  );

  /** Lenis owns the scroll, so ask it rather than jumping the page. */
  const jump = (i: number) => {
    const el = beats.current[i];
    if (!el) return;
    const lenis = getLenis();
    if (lenis)
      lenis.scrollTo(el, {
        offset: -(innerHeight - el.clientHeight) / 2,
        duration: 1.1,
      });
    else el.scrollIntoView({ block: "center" });
  };

  /* ── Reduced motion: five stills, no stickiness ─────────────────── */
  if (reduced)
    return (
      <section id="orb" className="relative py-[clamp(96px,12.5vh,158px)]">
        <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-10">
          <SectionHead
            eyebrow="the orb"
            title="Five states. You always know which one."
            className="mb-[62px]"
          />
          <div className="flex flex-col gap-14">
            {ORB_BEATS.map((beat) => (
              <div
                key={beat.state}
                data-on="true"
                className="group/beat flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-10"
              >
                <div className="shrink-0">
                  <HeroOrb state={beat.state} size={132} />
                </div>
                <div className="flex flex-col gap-4">
                  <Beat beat={beat} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

  const beat = ORB_BEATS[active];

  return (
    /* `overflow-x-clip`, not `hidden`: the glow is deliberately wider than
       its orb and would otherwise put a horizontal scrollbar on the page,
       but `hidden` makes this a scroll container and kills the sticky
       column inside it. `clip` crops without either. */
    <section ref={root} id="orb" className="relative overflow-x-clip">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-10">
        <SectionHead
          eyebrow="the orb"
          title="Five states. You always know which one."
          className="pt-[clamp(96px,12.5vh,158px)] pb-2"
        />

        <div className="relative grid items-start lg:grid-cols-2">
          {/* ── The prose ─────────────────────────────────────────── */}
          <div
            ref={column}
            /* The lead-in is what makes the first beat line up. The orb only
               centres itself once its column has stuck to the top, and that
               cannot happen until the section head has scrolled away — so
               without this the first beat reaches the anchor line while the
               orb is still drifting down the page, and the two sit apart.
               The tail is the same problem at the other end: without it the
               last beat can never be scrolled far enough to reach the line.
               Both are half a viewport minus half a beat, plus slack — so a
               taller beat needs less of them, not more. The
               tail is the more generous of the two only because this is
               currently the last section on the page: once anything follows
               it, that content is the runway and this can come back down. */
            className="flex flex-col pb-[24vh] [--beat:68vh] lg:order-1 lg:pt-[18vh] lg:pr-[70px] lg:[--beat:76vh]"
          >
            {ORB_BEATS.map((b, i) => (
              <div
                key={b.state}
                ref={(el) => {
                  beats.current[i] = el;
                }}
                data-on={i === active}
                style={{ minHeight: "var(--beat)" }}
                className={cn(
                  "group/beat flex flex-col justify-center gap-5",
                  "transition-[opacity,transform] duration-600 ease-[cubic-bezier(.52,.52,0,1)]",
                  // Dimmed, not erased. The reference's 0.16 made the beats
                  // you have not reached yet genuinely unreadable.
                  i === active
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2.5 opacity-28",
                )}
              >
                <Beat beat={b} />
              </div>
            ))}
          </div>

          {/* ── The orb, held ─────────────────────────────────────── */}
          <div className="sticky top-0 -order-1 flex h-[52svh] items-center justify-center lg:order-2 lg:h-svh">
            <div className="relative grid place-items-center">
              {/* Three grounds, one lit. A gradient cannot be tweened
                  between colour stops, so they cross-fade instead. */}
              {GLOWS.map((g) => (
                <span
                  key={g}
                  aria-hidden
                  style={{ background: GLOW[g] }}
                  className={cn(
                    "pointer-events-none absolute -inset-[60%] transition-opacity duration-700",
                    beat.glow === g ? "opacity-100" : "opacity-0",
                  )}
                />
              ))}

              <div
                ref={orbBox}
                className="relative aspect-square w-[min(280px,64vw)] lg:w-[min(440px,40vw)]"
              >
                {orbSize > 0 ? (
                  <HeroOrb state={beat.state} size={orbSize} />
                ) : null}
              </div>

              {/* The section claims you always know which state it is in.
                  Naming it on the orb argues that rather than asserting it. */}
              <span
                key={beat.state}
                className="animate-in fade-in relative mt-3 font-mono text-[11px] tracking-[0.16em] text-white/48 uppercase duration-500 lg:mt-6"
              >
                {beat.label} &middot; {beat.mode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── The rail ───────────────────────────────────────────────
          Navigation, not decoration: the numbered stops are buttons, so a
          four-screen section is reachable without holding the down arrow. */}
      <div
        aria-hidden={false}
        className="pointer-events-none absolute inset-y-0 right-5 hidden lg:block"
      >
        <nav
          aria-label="Orb states"
          className="pointer-events-auto sticky top-1/2 flex -translate-y-1/2 items-stretch"
        >
          <div className="flex h-[132px] flex-col items-end justify-between">
            {ORB_RAIL.map((node, i) =>
              node.stop ? (
                <button
                  key={i}
                  type="button"
                  ref={(el) => {
                    rail.current[i] = el;
                  }}
                  onClick={() => jump(node.beat)}
                  aria-label={`${ORB_BEATS[node.beat].label} — ${ORB_BEATS[node.beat].title}`}
                  aria-current={active === node.beat ? "true" : undefined}
                  className="group/stop flex h-2 cursor-pointer items-center justify-end gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  <span
                    className={cn(
                      "font-mono text-[9.5px] transition-colors duration-350",
                      active === node.beat
                        ? "text-white"
                        : "text-white/40 group-hover/stop:text-white/70",
                    )}
                  >
                    {String(node.beat + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "h-px transition-all duration-350 ease-[cubic-bezier(.52,.52,0,1)]",
                      active === node.beat
                        ? "w-[13px] bg-white"
                        : "w-[7px] bg-white/20 group-hover/stop:bg-white/45",
                    )}
                  />
                </button>
              ) : (
                <span
                  key={i}
                  ref={(el) => {
                    rail.current[i] = el;
                  }}
                  aria-hidden
                  className="flex h-2 items-center justify-end"
                >
                  <span className="h-px w-[7px] bg-white/20 transition-all duration-350 data-[cur=true]:w-[11px] data-[cur=true]:bg-white/60" />
                </span>
              ),
            )}
          </div>
          <span aria-hidden className="ml-[9px] w-px bg-border" />
        </nav>
      </div>
    </section>
  );
}
