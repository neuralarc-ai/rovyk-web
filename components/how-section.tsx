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

/** Row proportions for the lattice behind the screen. The centre column is
 *  taller in the middle so the frame opens up exactly where the screen sits. */
const CELLS = [
  { rows: "0.8fr 1.35fr 1fr", grow: false },
  { rows: "0.55fr 1.9fr 0.7fr", grow: true },
  { rows: "0.8fr 1.35fr 1fr", grow: false },
];

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
  const tl = useRef<gsap.core.Timeline | null>(null);
  const started = useRef(false);

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
    },
    [go, engage],
  );

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
    return () => void (idle.current && clearTimeout(idle.current));
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
    <section
      ref={root}
      id="how"
      className="relative py-[clamp(96px,12.5vh,158px)]"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <SectionHead
          eyebrow="how it works"
          title="Say it once. Watch the whole chain run."
          className="mb-16"
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
          className="grid overflow-hidden rounded-3xl border border-input bg-card md:grid-cols-[37%_63%]"
        >
          {/* ── The narration ──────────────────────────────────────── */}
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label="How it works"
            onKeyDown={onKeys}
            className="flex flex-col border-b border-border p-1.5 md:border-r md:border-b-0"
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
                    "group/step relative flex flex-1 cursor-pointer items-stretch gap-4 px-4 py-5 text-left",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  {/* The raised card, behind the copy rather than a
                      background on it, so it can scale without the text. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-xl border border-input bg-accent shadow-[0_22px_52px_-24px_#000]",
                      "transition-[opacity,transform] duration-[450ms] ease-[cubic-bezier(.52,.52,0,1)]",
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
                    className="relative z-10 flex w-5.5 shrink-0 flex-col items-center"
                  >
                    <span className="relative w-px flex-1 bg-border">
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
                        "my-2 grid size-5.5 shrink-0 place-items-center rounded-full border font-mono text-[9.5px] transition-colors duration-400",
                        on
                          ? "border-white bg-white text-[#0A0A0A]"
                          : passed
                            ? "border-white/45 text-white/70"
                            : "border-white/22 text-white/40",
                      )}
                    >
                      {i + 1}
                    </span>

                    <span className="relative w-px flex-1 bg-border">
                      <span
                        ref={(el) => {
                          bots.current[i] = el;
                        }}
                        className="absolute inset-0 origin-top bg-white/70"
                        style={{ transform: "scaleY(0)" }}
                      />
                    </span>
                  </span>

                  <span className="relative z-10 flex flex-1 flex-col justify-center">
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
                        "max-w-[34ch] text-[13.4px] leading-[1.5] font-light transition-colors duration-400",
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

          {/* ── The evidence ───────────────────────────────────────── */}
          <div
            role="tabpanel"
            id={PANEL_ID}
            aria-labelledby={TAB_ID(active)}
            className="relative flex min-h-[560px] flex-col overflow-hidden bg-background"
          >
            {/* Outlined cells rather than hairlines — a frame the screen sits
                inside, dissolving before it reaches the top or bottom edge. */}
            <div
              aria-hidden
              className="mask-fade-y pointer-events-none absolute inset-0 z-0 grid grid-cols-[1fr_2.4fr_1fr] gap-3.5 p-3.5"
            >
              {CELLS.map((col, i) => (
                <span
                  key={i}
                  style={{ gridTemplateRows: col.rows }}
                  className={cn(
                    "grid gap-3.5",
                    // Below md the outer two would crush to nothing.
                    !col.grow && "hidden md:grid",
                  )}
                >
                  <i className="block rounded-xl border border-border" />
                  <i className="block rounded-xl border border-border" />
                  <i className="block rounded-xl border border-border" />
                </span>
              ))}
            </div>

            <div className="relative z-20 grid flex-1 place-items-center px-5.5 pt-8.5 pb-6.5">
              {/* The machine, cropped to a fragment. Same screen as the hero,
                  a third of the size. */}
              <div className="relative aspect-16/10 w-[min(410px,94%)] overflow-hidden rounded-2xl bg-[#080808] md:w-[min(410px,74%)] shadow-[0_0_0_1px_rgba(255,255,255,.15),0_0_0_5px_rgba(255,255,255,.028),0_40px_80px_-30px_rgba(0,0,0,.98)]">
                <div className="bg-display-wall mask-fade-b absolute inset-0 [--fade-start:62%]" />
                <ScreenMenuBar />
                <GhostWindow label="Mail" />

                {/* Held at the active step's beat rather than looping. */}
                {/* Scaled to the screen, not to the viewport. Expanded, the
                    notch is 406px across including its fillets, so every one
                    of these has to clear that at whatever width the screen
                    above happens to be — the inset above widens on small
                    panes for the same reason, because 74% of a pane that
                    keeps shrinking will lose the fillets off both edges. */}
                <RovykHud
                  beat={STEPS[active].beat}
                  className="z-30 scale-[0.4] sm:scale-[0.52] md:scale-[0.56] lg:scale-[0.82]"
                />
              </div>
            </div>

            {/* Under the screen, because it is a caption for it — above, it
                read as a title for the whole pane.

                This line is the guarantee each step is actually making, so it
                is set to be read rather than skimmed past: no italic, which
                only ever cost legibility at this size, and it arrives on the
                same upward slide the tool readout uses. */}
            <div className="relative z-30 flex items-center border-t border-border bg-card/40 px-16 py-4.5">
              <p
                key={active}
                className="animate-in fade-in-0 slide-in-from-bottom-2 flex-1 text-center text-[clamp(14px,1.1vw,15.5px)] leading-[1.45] font-light tracking-[-0.006em] text-balance text-white/88 duration-[420ms] ease-[cubic-bezier(.52,.52,0,1)]"
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
