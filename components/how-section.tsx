"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react/dist/ssr";
import { GhostWindow } from "@/components/ghost-window";
import { RovykHud, type HudBeat } from "@/components/rovyk-hud";
import { ScreenMenuBar } from "@/components/screen-menu-bar";
import { SectionHead } from "@/components/section-head";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────
   How it works — four steps, one machine.

   The steps down the left are the narration; the screen on the right is
   the same HUD from the hero, held at whichever beat the active step is
   describing rather than looping. So the claim and its evidence are the
   same object, not an illustration of one.

   It loops, but it yields to anyone paying attention. Picking a step,
   moving the pointer across it, or focusing into it all count as being
   engaged, and it waits for as long as that lasts. Engagement expires on
   eight seconds of stillness — a pointer parked on the panel is not the
   same as a reader using it — or the moment the pointer leaves. And
   because it does loop, there is a real pause control, which is sticky
   in both directions: pressing it means stopped, not stopped-for-now.
   ──────────────────────────────────────────────────────────────────── */

type Step = {
  title: string;
  body: string;
  /** The one line under the screen — what this beat proves. */
  caption: string;
  beat: HudBeat;
  /**
   * How long this step holds during the automatic pass. Per step, because
   * a flat number cannot serve both a beat that animates for two seconds
   * and a paragraph that takes five to read.
   */
  dwell: number;
};

const STEPS: Step[] = [
  {
    title: "You speak.",
    body: "“Hey Rovyk”, or a hotkey. Speech to text runs on-device. Nothing is captured until the wake word lands.",
    caption: "Nothing is recorded until you say the wake word",
    beat: "listening",
    dwell: 5800,
  },
  {
    title: "One brain decides.",
    body: "It sees the request, the conversation and what is on screen, then picks from fifty-nine tools. No fixed menu of intents.",
    caption: "One brain, fifty-nine tools, no fixed menu",
    beat: "thinking",
    dwell: 6400,
  },
  {
    title: "It asks before anything irreversible.",
    body: "Deleting, moving, sending. The gate is written in code and runs independently of the model, so it cannot be talked past.",
    caption: "Written in code, not decided by the model",
    beat: "gate",
    dwell: 6400,
  },
  {
    title: "It acts, then tells you.",
    body: "The chain runs, the task list fills in, and the answer comes back through a bundled on-device voice.",
    caption: "Spoken back through an on-device voice",
    beat: "speaking",
    dwell: 6000,
  },
];

const LAST = STEPS.length - 1;

/** How long a hand-picked step is left alone before the loop takes back over. */
const IDLE_MS = 8000;
const TAB_ID = (i: number) => `how-step-${i}`;
const PANEL_ID = "how-panel";

/**
 * The notch is drawn at real macOS pixels — 406 across, fillets included —
 * and only ever scaled. So the scale has to be a ratio to the screen it hangs
 * in, and that screen is a percentage of a panel, which a viewport breakpoint
 * has no way to know the width of. Pinning the two to different rulers is
 * what let the shell run past the screen's edge at some widths and shrink to
 * a stamp at others; the screen is measured instead, and the notch follows.
 */
const HUD_W = 406;
/** How much of the screen's width the expanded shell takes across its widest
 *  point. Under 1, always, so the fillets can never reach the bezel. */
const HUD_FILL = 0.86;
/** Only ever on screen for the frame before the observer reports. Deliberately
 *  the smallest of the old breakpoint scales — too small is a frame nobody
 *  catches, too big is a frame that overflows. */
const HUD_FALLBACK = 0.4;

/**
 * The lattice, which the screen is one cell of.
 *
 * It used to be an absolutely positioned decoration with the machine centred
 * over it at a size that had nothing to do with the cells, so it read as a
 * window dropped on top of some graph paper. Now there is one grid: the
 * outer columns are empty cells, and the middle column's middle cell is the
 * machine itself — same track, same gutter, edges landing on the same lines.
 *
 * The middle row is `auto` rather than a fraction, because the machine is
 * 16:10 and has to stay that way. Sizing the row from the cell would hand it
 * a definite height and the ratio would be ignored — so the row takes its
 * height from the screen, and the cells above and below share what is left.
 */
const CELLS = [
  { rows: "0.8fr 1.35fr 1fr", screen: false },
  { rows: "0.62fr auto 0.78fr", screen: true },
  { rows: "0.8fr 1.35fr 1fr", screen: false },
];

/** An empty cell of the frame. */
function Cell({ dim }: { dim?: boolean }) {
  return (
    <i
      aria-hidden
      className={cn(
        "block rounded-xl border",
        // The middle column cannot carry the column-wide fade — it would take
        // the machine down with it — so its two cells recede by weight
        // instead.
        dim ? "border-border/55" : "border-border",
      )}
    />
  );
}

export function HowSection() {
  const [active, setActive] = useState(0);
  /**
   * The reader's standing intent, set only by the pause control. Everything
   * else below — hover, a hand-picked step, scrolling away — suspends the
   * loop temporarily without touching this, so it knows what to go back to.
   */
  const [playing, setPlaying] = useState(false);
  /** Whether an automatic loop is on the table at all. */
  const [canPlay, setCanPlay] = useState(false);

  const root = useRef<HTMLElement>(null);
  const activeRef = useRef(0);
  /* Measured, not guessed: see HUD_W. The observer fires on observe, so the
     fallback below is never on screen for a frame anyone can see. */
  const [screenW, setScreenW] = useState(0);
  const screenBox = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScreenW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const started = useRef(false);

  /* ── The rail ──────────────────────────────────────────────────────
     One element, two behaviours. Above `md` it is the column it has always
     been. Below it, where the four steps stacked into a wall of text you
     had to scroll past to reach the screen they describe, it is a scroll
     snap carousel showing one step at a time — so the machine sits at the
     top of the card and the narration is swiped underneath it.

     Native scroll snapping rather than a gesture handler: it is the
     platform's own swipe, so it carries the momentum, the rubber-banding
     and the accessibility of one, and there is nothing to fight Lenis
     over. */
  const rail = useRef<HTMLDivElement>(null);
  /** True while the rail is being moved for the reader rather than by them,
   *  so a smooth scroll of our own is not read back as a swipe. */
  const syncing = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** `aria-orientation` is not a style, so the layout switch has to be
   *  observed rather than left to CSS. Desktop-first, to match the server. */
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    const read = () => setWide(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  /** Which step the rail has come to rest on, by whichever centre is
   *  nearest its own. Measured rather than divided by a page width: the
   *  scroller carries padding, so the two do not agree. */
  const restingStep = (el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    let best = Infinity;
    let at = 0;
    Array.from(el.children).forEach((kid, i) => {
      const r = kid.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < best) {
        best = d;
        at = i;
      }
    });
    return at;
  };

  /* The standing intent, and the two things that defer to it. `engaged` is
     one idea deliberately: a hand-picked step and a pointer working its way
     across the panel are the same signal, and holding them separately meant
     a parked pointer could outlive the idle clock forever. */
  const wants = useRef(false);
  const engaged = useRef(false);
  const onScreen = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* The rail's fill, painted rather than rendered: it moves every frame and
     React has no business in that loop. Two halves per step, so the line
     can be lit above the current node and counting down below it. */
  const tops = useRef<(HTMLSpanElement | null)[]>([]);
  const bots = useRef<(HTMLSpanElement | null)[]>([]);
  const progress = useRef({ v: 0 });

  const paint = useCallback(() => {
    const a = activeRef.current;
    const v = progress.current.v;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));

    for (let i = 0; i < STEPS.length; i++) {
      /* A step's dwell is drawn entirely inside that step's own row: the
         fill enters at the top of the row, reaches the node at the halfway
         mark, and leaves at the bottom as the dwell ends. Rows already done
         stay lit; rows still to come stay dark. Nothing about a step is ever
         drawn in a neighbour's row. */
      const done = i < a;
      const top = done ? 1 : i === a ? clamp(v * 2) : 0;
      const bottom = done ? 1 : i === a ? clamp((v - 0.5) * 2) : 0;

      if (tops.current[i])
        tops.current[i]!.style.transform = `scaleY(${top.toFixed(3)})`;
      if (bots.current[i])
        bots.current[i]!.style.transform = `scaleY(${bottom.toFixed(3)})`;
    }
  }, []);

  const go = useCallback(
    (i: number) => {
      activeRef.current = i;
      setActive(i);
      paint();
    },
    [paint],
  );

  /** Every hold resolves here. Resuming re-enters at the step on show, so
   *  picking step three and walking away carries on from three. */
  const resync = useCallback(() => {
    const t = tl.current;
    if (!t) return;
    if (wants.current && !engaged.current && onScreen.current)
      t.play(`s${activeRef.current}`);
    else t.pause();
  }, []);

  /** Mark the reader as busy, and restart the clock that decides they are
   *  not. Every fresh signal pushes the loop's return back by the full
   *  window, so it can only come back during a genuine lull. */
  const engage = useCallback(() => {
    engaged.current = true;
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      engaged.current = false;
      resync();
    }, IDLE_MS);
    resync();
  }, [resync]);

  const disengage = useCallback(() => {
    engaged.current = false;
    if (idle.current) clearTimeout(idle.current);
    resync();
  }, [resync]);

  /** Taking a step by hand holds the loop for as long as the reader stays
   *  with it, and no longer. */
  const pick = useCallback(
    (i: number) => {
      progress.current.v = 0;
      go(i);
      engage();

      /* Only when the rail is actually a rail — above `md` it is a column
         with nothing to scroll, and asking would move the page instead. */
      const el = rail.current;
      if (!el || el.scrollWidth <= el.clientWidth + 1) return;
      syncing.current = true;
      el.children[i]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    },
    [go, engage],
  );

  /* Committed on settle rather than per frame: a swipe fires scroll dozens
     of times on the way, and only where it stops is a choice. */
  const onRailScroll = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = rail.current;
      if (!el || el.scrollWidth <= el.clientWidth + 1) return;
      const at = restingStep(el);
      /* Arriving where we asked to be is our own scroll finishing, not the
         reader choosing anything. */
      if (at === activeRef.current) {
        syncing.current = false;
        return;
      }
      if (syncing.current) return;
      progress.current.v = 0;
      go(at);
      engage();
    }, 90);
  }, [go, engage]);

  useGSAP(
    () => {
      const desktop = matchMedia("(min-width: 768px)").matches;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      /* Below md the steps and the screen cannot be seen at once, so an
         automatic pass would be advancing evidence nobody is looking at. */
      const available = desktop && !reduced;
      setCanPlay(available);
      paint();
      if (!available) return;

      const timeline = gsap.timeline({ paused: true, repeat: -1 });
      STEPS.forEach((step, i) => {
        timeline.addLabel(`s${i}`);
        timeline.call(() => go(i), undefined, `s${i}`);
        timeline.fromTo(
          progress.current,
          { v: 0 },
          { v: 1, duration: step.dwell / 1000, ease: "none", onUpdate: paint },
          `s${i}`,
        );
      });
      tl.current = timeline;

      /* Scrolling away is just another hold: the loop is not worth running
         where nobody can see it, and coming back should pick it up. */
      const io = new IntersectionObserver(
        ([entry]) => {
          onScreen.current = entry.isIntersecting;
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            wants.current = true;
            setPlaying(true);
          }
          resync();
        },
        { threshold: 0.35 },
      );
      if (root.current) io.observe(root.current);

      return () => {
        io.disconnect();
        if (idle.current) clearTimeout(idle.current);
        timeline.kill();
        tl.current = null;
      };
    },
    { scope: root, dependencies: [go, paint, resync] },
  );

  useEffect(() => {
    return () => {
      if (idle.current) clearTimeout(idle.current);
      if (settle.current) clearTimeout(settle.current);
    };
  }, []);

  /** The one control that sets the standing intent. Sticky in both
   *  directions — a pause here is not undone by walking away. */
  const toggle = () => {
    const next = !playing;
    wants.current = next;
    started.current = true;
    engaged.current = false;
    if (idle.current) clearTimeout(idle.current);
    setPlaying(next);
    resync();
  };

  const onKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    const to = step
      ? (active + step + STEPS.length) % STEPS.length
      : e.key === "Home"
        ? 0
        : e.key === "End"
          ? LAST
          : null;
    if (to === null) return;
    e.preventDefault();
    pick(to);
    (
      e.currentTarget.querySelectorAll('[role="tab"]')[to] as HTMLElement
    )?.focus();
  };

  return (
    <section ref={root} id="how" className="relative py-(--section-y)">
      <div className="mx-auto w-full max-w-7xl px-4">
        <SectionHead
          eyebrow="how it works"
          title="Say it once. Watch the whole chain run."
          className="mb-10 sm:mb-16"
        >
          No command list, no scripts to wire up. One sentence, and Rovyk
          decides what to call, asks before anything irreversible, then tells
          you what it did.
        </SectionHead>

        <div
          /* Movement, not mere presence: a pointer crossing the panel is a
             reader using it, a pointer left sitting on it is not. */
          onPointerMove={engage}
          onPointerLeave={disengage}
          onFocusCapture={engage}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) disengage();
          }}
          // The card is what the pane measures its height against — below `md`
          // the pane is the whole card, so one is the other.
          className="@container/how grid overflow-hidden rounded-3xl border border-input bg-card md:grid-cols-[37%_63%]"
        >
          {/* ── The narration ────────────────────────────────────────
              Second on a phone. The screen is what the section is
              actually pointing at, and stacked the other way round it
              sat under four paragraphs, off the bottom of the fold —
              you read the claims and never reached the evidence. */}
          {/* `min-w-0` is load-bearing. A grid item's automatic minimum is
              its min-content width, and a flex row of four `shrink-0` pages
              reports the sum of all four — so the column blew out to 446px
              inside a 300px card and the card just clipped it. Overridden,
              the track takes the width it is given and the rail scrolls. */}
          <div className="order-2 flex min-w-0 flex-col border-t border-border md:order-none md:border-t-0 md:border-r">
            <div
              ref={rail}
              role="tablist"
              aria-orientation={wide ? "vertical" : "horizontal"}
              aria-label="How it works"
              onKeyDown={onKeys}
              onScroll={onRailScroll}
              className={cn(
                "flex min-w-0 flex-1 p-1.5",
                // Below md: one step per screen, swiped. `overscroll-x-contain`
                // so running off the last one is not read as the browser's own
                // back gesture.
                "snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "md:snap-none md:flex-col md:overflow-visible",
              )}
            >
              {STEPS.map((step, i) => {
                const on = i === active;
                const passed = i <= active;
                return (
                  <button
                    key={step.title}
                    type="button"
                    role="tab"
                    id={TAB_ID(i)}
                    aria-selected={on}
                    aria-controls={PANEL_ID}
                    // One tab stop for the set; the arrows move between them.
                    tabIndex={on ? 0 : -1}
                    onClick={() => pick(i)}
                    className={cn(
                      "group/step relative flex cursor-pointer text-left",
                      // A page of the carousel below md, a row of the column
                      // above it. `shrink-0` is what stops four of them being
                      // squeezed onto one screen instead of four.
                      "w-full shrink-0 snap-center flex-col gap-3 px-5 py-6",
                      "md:w-auto md:flex-1 md:flex-row md:items-stretch md:gap-4 md:px-4 md:py-5",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    {/* The raised card, behind the copy rather than a
                      background on it, so it can scale without the text. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0 rounded-xl border border-input bg-accent shadow-[0_22px_52px_-24px_#000]",
                        "transition-[opacity,transform] duration-450 ease-[cubic-bezier(.52,.52,0,1)]",
                        on
                          ? "scale-100 opacity-100"
                          : "scale-[.99] opacity-0 group-hover/step:opacity-40",
                      )}
                    />

                    {/* The spine. Lit above the current node, counting down
                      below it — so the sequence, the position in it and the
                      time until the next step are all one mark. */}
                    <span
                      aria-hidden
                      className="relative z-10 flex shrink-0 items-center md:w-5.5 md:flex-col"
                    >
                      <span className="relative hidden w-px flex-1 bg-border md:block">
                        <span
                          ref={(el) => {
                            tops.current[i] = el;
                          }}
                          className="absolute inset-0 origin-top bg-white/70"
                          style={{ transform: "scaleY(0)" }}
                        />
                      </span>

                      <span
                        className={cn(
                          "grid size-5.5 shrink-0 place-items-center rounded-full border font-mono text-[9.5px] transition-colors duration-400 md:my-2",
                          on
                            ? "border-white bg-white text-[#0A0A0A]"
                            : passed
                              ? "border-white/45 text-white/70"
                              : "border-white/22 text-white/40",
                        )}
                      >
                        {i + 1}
                      </span>

                      <span className="relative hidden w-px flex-1 bg-border md:block">
                        <span
                          ref={(el) => {
                            bots.current[i] = el;
                          }}
                          className="absolute inset-0 origin-top bg-white/70"
                          style={{ transform: "scaleY(0)" }}
                        />
                      </span>
                    </span>

                    <span className="relative z-10 flex flex-1 flex-col justify-start md:justify-center">
                      <h3
                        className={cn(
                          "mb-2 text-[clamp(18px,1.6vw,23px)] leading-[1.16] tracking-[-0.028em] transition-colors duration-400",
                          on
                            ? "text-white"
                            : "text-white/68 group-hover/step:text-white/88",
                        )}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={cn(
                          "max-w-[34ch] text-[13.4px] leading-normal font-light transition-colors duration-400",
                          on ? "text-white/68" : "text-white/45",
                        )}
                      >
                        {step.body}
                      </p>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Where you are in the set, and that there is a set. Decorative:
                the tabs themselves are the control surface, and a second one
                pointing at the same steps would only be a second thing for a
                screen reader to walk. */}
            <div
              aria-hidden
              className="flex items-center justify-center gap-1.5 pt-1 pb-4 md:hidden"
            >
              {STEPS.map((step, i) => (
                <span
                  key={step.title}
                  className={cn(
                    "h-1 rounded-full transition-all duration-400 ease-[cubic-bezier(.52,.52,0,1)]",
                    i === active ? "w-5 bg-white/80" : "w-1 bg-white/22",
                  )}
                />
              ))}
            </div>
          </div>

          {/* ── The evidence ───────────────────────────────────────── */}
          <div
            role="tabpanel"
            id={PANEL_ID}
            aria-labelledby={TAB_ID(active)}
            /* 560px is right once the pane is 63% of a wide card. Stacked on
               a phone it is not, and a flat floor is the wrong shape of
               answer anyway: the screen is 16:10 of the track, so its height
               grows with the card while a fixed pane height does not — which
               is what crushed the cells above and below it to 14px on a
               phone and to nothing again around 600px.

               So below `md` the floor is the screen's own height plus what
               the rest of the pane needs: two cells, three gutters and the
               caption. The frame then keeps its proportions at every width
               rather than at the ones a breakpoint happened to name. */
            className="relative order-1 flex min-h-[calc(62.5cqw+208px)] flex-col overflow-hidden bg-background md:order-none md:min-h-140"
          >
            {/* The frame, and the machine inside it. One grid: the cells and
                the screen are laid out by the same tracks, so the screen's
                edges land on the same lines the empty cells do rather than
                floating over them.

                Below `md` only the middle column renders, which leaves the
                machine as the middle cell of a single column — the same
                reading, one track wide. */}
            <div className="relative grid flex-1 grid-cols-1 gap-3.5 p-3.5 md:grid-cols-[0.7fr_3fr_0.7fr]">
              {CELLS.map((col, i) =>
                col.screen ? (
                  <div
                    key={i}
                    style={{ gridTemplateRows: col.rows }}
                    className="grid gap-3.5"
                  >
                    <Cell dim />

                    {/* The machine, cropped to a fragment. Same screen as the
                        hero, a third of the size.

                        `self-start` so the row never hands it a definite
                        height — a stretched grid item ignores `aspect-ratio`,
                        which is how a 16:10 Mac ends up standing on its end. */}
                    <div
                      ref={screenBox}
                      className="relative aspect-16/10 self-start overflow-hidden rounded-xl border border-input bg-[#080808] shadow-[0_20px_46px_-30px_#000]"
                    >
                      <div className="bg-display-wall mask-fade-b absolute inset-0 [--fade-start:62%]" />
                      <GhostWindow label="Mail" />

                      {/* Held at the active step's beat rather than looping,
                          and sized off the screen it hangs in rather than off
                          the viewport — so the fillets clear the bezel at
                          every width instead of at the four the breakpoints
                          happened to name. */}
                      <RovykHud
                        beat={STEPS[active].beat}
                        className="z-30"
                        style={{
                          scale: String(
                            screenW
                              ? (screenW * HUD_FILL) / HUD_W
                              : HUD_FALLBACK,
                          ),
                        }}
                      />
                    </div>

                    <Cell dim />
                  </div>
                ) : (
                  <div
                    key={i}
                    aria-hidden
                    style={{ gridTemplateRows: col.rows }}
                    /* Below md the outer two would crush to nothing. */
                    className="mask-fade-y hidden gap-3.5 md:grid"
                  >
                    <Cell />
                    <Cell />
                    <Cell />
                  </div>
                ),
              )}
            </div>

            {/* Under the screen, because it is a caption for it — above, it
                read as a title for the whole pane.

                This line is the guarantee each step is actually making, so it
                is set to be read rather than skimmed past: no italic, which
                only ever cost legibility at this size, and it arrives on the
                same upward slide the tool readout uses. */}
            <div /* 64px either side leaves a 302px card 174px of caption. The
                 padding only has to clear the play button — 44px does, and
                 gives the line 40 more characters. */
              className="relative z-30 flex items-center border-t border-border bg-card/40 px-11 py-4.5 sm:px-16"
            >
              <p
                key={active}
                className="animate-in fade-in-0 slide-in-from-bottom-2 flex-1 text-center text-[clamp(14px,1.1vw,15.5px)] leading-[1.45] font-light tracking-[-0.006em] text-balance text-white/88 duration-420 ease-[cubic-bezier(.52,.52,0,1)]"
              >
                {STEPS[active].caption}
              </p>

              {canPlay ? (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={
                    playing ? "Pause the walkthrough" : "Play the walkthrough"
                  }
                  className="absolute right-4 grid size-7 cursor-pointer place-items-center rounded-full border border-input text-white/55 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {playing ? (
                    <PauseIcon weight="fill" className="size-3" aria-hidden />
                  ) : (
                    <PlayIcon weight="fill" className="size-3" aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
